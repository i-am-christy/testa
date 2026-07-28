import logging
import time
from functools import lru_cache
from io import BytesIO

import cloudinary
import cloudinary.uploader
import cv2 as cv
import dlib
import numpy as np
from sqlalchemy.orm import Session
from ultralytics import YOLO

from api.core.config import settings
from api.v1.models.proctoring import ProctoringViolation, ViolationType

SHAPE_PREDICTOR_PATH = 'shape_predictor_68_face_landmarks.dat'
YOLO_MODEL_PATH = 'yolov8n.pt'


@lru_cache(maxsize=1)
def get_yolo_model() -> YOLO:
    """Loads YOLOv8n once per process. Auto-downloads yolov8n.pt if not present locally."""
    return YOLO(YOLO_MODEL_PATH)


@lru_cache(maxsize=1)
def get_dlib_detector():
    return dlib.get_frontal_face_detector()


@lru_cache(maxsize=1)
def get_dlib_predictor():
    return dlib.shape_predictor(SHAPE_PREDICTOR_PATH)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

cloudinary.config(
    cloud_name=settings.CLOUD_NAME,
    api_key=settings.API_KEY,
    api_secret=settings.API_SECRETS,
)

# Real COCO class names YOLOv8n was trained on. Only these can ever fire.
PROHIBITED_OBJECT_LABELS = {"cell phone", "book", "laptop"}
PERSON_LABEL = "person"


def upload_snapshot(frame: np.ndarray) -> str | None:
    """Uploads a BGR frame to Cloudinary and returns its URL, or None on failure."""
    try:
        success, buffer = cv.imencode(".jpg", frame)
        if not success:
            return None
        result = cloudinary.uploader.upload(
            BytesIO(buffer.tobytes()), folder="testa_violations", resource_type="image"
        )
        return result["secure_url"]
    except Exception as e:
        logging.error(f"Snapshot upload failed: {e}")
        return None


def upload_audio_clip(audio_bytes: bytes, content_type: str = "audio/webm") -> str | None:
    """Uploads a short audio clip to Cloudinary and returns its URL, or None on failure."""
    try:
        result = cloudinary.uploader.upload(
            BytesIO(audio_bytes), folder="testa_violations_audio", resource_type="video"
        )
        return result["secure_url"]
    except Exception as e:
        logging.error(f"Audio clip upload failed: {e}")
        return None


def log_violation(
    db: Session,
    session_id,
    violation_type: ViolationType,
    message: str,
    frame: np.ndarray | None = None,
    audio_bytes: bytes | None = None,
) -> ProctoringViolation:
    """Persists a violation, uploading an evidence snapshot/clip if provided."""
    snapshot_url = upload_snapshot(frame) if frame is not None else None
    audio_clip_url = upload_audio_clip(audio_bytes) if audio_bytes is not None else None

    violation = ProctoringViolation(
        session_id=session_id,
        violation_type=violation_type,
        message=message,
        snapshot_url=snapshot_url,
        audio_clip_url=audio_clip_url,
    )
    db.add(violation)
    db.commit()
    db.refresh(violation)
    return violation


# --- Head pose estimation (dlib 68-point landmarks + solvePnP) ---

# Generic 3D face model points (mm), used with the matching dlib landmark indices below.
_MODEL_POINTS_3D = np.array([
    (0.0, 0.0, 0.0),          # Nose tip - 30
    (0.0, -330.0, -65.0),     # Chin - 8
    (-225.0, 170.0, -135.0),  # Left eye left corner - 36
    (225.0, 170.0, -135.0),   # Right eye right corner - 45
    (-150.0, -150.0, -125.0), # Left mouth corner - 48
    (150.0, -150.0, -125.0),  # Right mouth corner - 54
], dtype=np.float64)

_LANDMARK_INDICES = [30, 8, 36, 45, 48, 54]

# Degrees of yaw/pitch beyond which the candidate is considered "looking away".
GAZE_YAW_THRESHOLD = 25.0
GAZE_PITCH_THRESHOLD = 20.0


def estimate_head_pose(landmarks: np.ndarray, frame_shape) -> tuple[float, float] | None:
    """Returns (yaw, pitch) in degrees from dlib 68-point landmarks, or None if it can't solve."""
    image_points = np.array([landmarks[i] for i in _LANDMARK_INDICES], dtype=np.float64)

    h, w = frame_shape[:2]
    focal_length = w
    center = (w / 2, h / 2)
    camera_matrix = np.array([
        [focal_length, 0, center[0]],
        [0, focal_length, center[1]],
        [0, 0, 1],
    ], dtype=np.float64)
    dist_coeffs = np.zeros((4, 1))

    success, rotation_vector, _ = cv.solvePnP(
        _MODEL_POINTS_3D, image_points, camera_matrix, dist_coeffs, flags=cv.SOLVEPNP_ITERATIVE
    )
    if not success:
        return None

    rotation_matrix, _ = cv.Rodrigues(rotation_vector)
    sy = np.sqrt(rotation_matrix[0, 0] ** 2 + rotation_matrix[1, 0] ** 2)
    pitch = np.degrees(np.arctan2(-rotation_matrix[2, 0], sy))
    yaw = np.degrees(np.arctan2(rotation_matrix[1, 0], rotation_matrix[0, 0]))
    return yaw, pitch


def is_looking_away(yaw: float, pitch: float) -> bool:
    return abs(yaw) > GAZE_YAW_THRESHOLD or abs(pitch) > GAZE_PITCH_THRESHOLD


class ProctoringMonitor:
    """Continuous per-frame proctoring pipeline: gaze, prohibited objects, person count.

    One instance per active websocket connection (per exam session).
    """

    def __init__(
        self,
        yolo_model,
        predictor,
        detector,
        look_away_seconds=3.0,
        violation_cooldown_seconds=8.0,
    ):
        self.yolo_model = yolo_model
        self.predictor = predictor
        self.detector = detector
        self.look_away_seconds = look_away_seconds
        self.violation_cooldown_seconds = violation_cooldown_seconds

        self._look_away_since: float | None = None
        self._look_away_flagged = False
        self._last_violation_at: dict[str, float] = {}

    def _cooldown_ok(self, key: str) -> bool:
        last = self._last_violation_at.get(key, 0.0)
        now = time.time()
        if now - last >= self.violation_cooldown_seconds:
            self._last_violation_at[key] = now
            return True
        return False

    def process_frame(self, frame: np.ndarray) -> dict:
        """Returns a status dict plus a list of newly-triggered violations (each with a snapshot frame attached)."""
        violations = []
        gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
        faces = self.detector(gray)

        gaze_status = "no_face"
        if len(faces) == 1:
            shape = self.predictor(gray, faces[0])
            landmarks = np.array([(p.x, p.y) for p in shape.parts()])
            pose = estimate_head_pose(landmarks, frame.shape)
            if pose is not None:
                yaw, pitch = pose
                if is_looking_away(yaw, pitch):
                    gaze_status = "away"
                    if self._look_away_since is None:
                        self._look_away_since = time.time()
                    elif not self._look_away_flagged and (
                        time.time() - self._look_away_since >= self.look_away_seconds
                    ):
                        self._look_away_flagged = True
                        if self._cooldown_ok("look_away"):
                            violations.append({
                                "type": ViolationType.LOOK_AWAY,
                                "message": f"Candidate looked away from the screen (yaw={yaw:.1f}, pitch={pitch:.1f}).",
                                "frame": frame,
                            })
                else:
                    gaze_status = "ok"
                    self._look_away_since = None
                    self._look_away_flagged = False
            else:
                gaze_status = "unknown"
        else:
            self._look_away_since = None
            self._look_away_flagged = False

        results = self.yolo_model(frame, verbose=False)[0]
        detected_objects = []
        person_count = 0
        for box in results.boxes.data:
            cls = int(box[5])
            label = self.yolo_model.names[cls]
            if label == PERSON_LABEL:
                person_count += 1
            elif label in PROHIBITED_OBJECT_LABELS:
                detected_objects.append(label)

        for label in set(detected_objects):
            if self._cooldown_ok(f"object:{label}"):
                violations.append({
                    "type": ViolationType.PROHIBITED_OBJECT,
                    "message": f"Prohibited object detected: {label}.",
                    "frame": frame,
                })

        if person_count > 1 and self._cooldown_ok("multiple_person"):
            violations.append({
                "type": ViolationType.MULTIPLE_PERSON,
                "message": f"{person_count} people detected in frame.",
                "frame": frame,
            })

        return {
            "gaze": gaze_status,
            "objects": detected_objects,
            "person_count": person_count,
            "violations": violations,
        }
