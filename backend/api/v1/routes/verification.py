import base64
from uuid import UUID

import cv2 as cv
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from api.db.database import get_db
from api.v1.models.exam import UserExamSession
from api.v1.models.proctoring import ViolationType
from api.v1.services.user import user_service
from api.v1.services.verification import FaceVerificationSystem
from api.v1.services.proctoring import (
    ProctoringMonitor,
    get_yolo_model,
    get_dlib_detector,
    get_dlib_predictor,
    log_violation,
)

router = APIRouter(prefix="/verification", tags=["Verification"])


async def _authenticate_websocket_user(websocket: WebSocket, db: Session):
    """Reads {"token": ...} from the first message and returns the authenticated user, or None."""
    token_data = await websocket.receive_json()
    token = token_data.get('token')
    if not token:
        await websocket.close(code=1008, reason="Token not provided")
        return None

    try:
        user = user_service.get_current_user(access_token=token, db=db)
    except HTTPException:
        await websocket.close(code=1008, reason="Invalid or expired token")
        return None

    return user


@router.websocket("/ws/face-verify")
async def websocket_face_verification(
    websocket: WebSocket,
    db: Session = Depends(get_db)
):
    """Identity match + blink-liveness gate, run once before an exam session starts."""
    await websocket.accept()

    user = await _authenticate_websocket_user(websocket, db)
    if user is None:
        return
    if not user.avatar_url:
        await websocket.close(code=1008, reason="User or avatar not found.")
        return

    await websocket.send_json({"status": "authenticated", "message": "Authentication successful. Initializing verifier..."})

    verifier = FaceVerificationSystem(reference_image_url=user.avatar_url)
    if not verifier.initialize_reference_encoding():
        await websocket.close(code=1011, reason="Could not initialize from reference image.")
        return

    await websocket.send_json({"status": "ready", "message": "Verifier ready. Send video frames."})

    try:
        while True:
            frame_b64 = await websocket.receive_text()
            result = verifier.process_frame(frame_b64)
            await websocket.send_json(result)

            if result.get("status") == "success":
                await websocket.close(code=1000, reason="Verification successful.")
                break

    except WebSocketDisconnect:
        print(f"Client {user.email} disconnected.")
    except Exception as e:
        print(f"An error occurred: {e}")
        await websocket.close(code=1011, reason="An unexpected error occurred.")


@router.websocket("/ws/monitor/{session_id}")
async def websocket_proctoring_monitor(
    websocket: WebSocket,
    session_id: UUID,
    db: Session = Depends(get_db),
):
    """Continuous gaze / prohibited-object / multiple-person monitoring for an active exam session."""
    await websocket.accept()

    user = await _authenticate_websocket_user(websocket, db)
    if user is None:
        return

    session = db.query(UserExamSession).filter(
        UserExamSession.id == session_id,
        UserExamSession.user_id == user.id,
        UserExamSession.end_time == None,
    ).first()
    if not session:
        await websocket.close(code=1008, reason="No active exam session found for this user.")
        return

    monitor = ProctoringMonitor(
        yolo_model=get_yolo_model(),
        predictor=get_dlib_predictor(),
        detector=get_dlib_detector(),
    )

    await websocket.send_json({"status": "ready", "message": "Monitor ready."})

    try:
        while True:
            frame_b64 = await websocket.receive_text()
            try:
                img_data = base64.b64decode(frame_b64)
                np_arr = np.frombuffer(img_data, np.uint8)
                frame = cv.imdecode(np_arr, cv.IMREAD_COLOR)
            except Exception:
                await websocket.send_json({"status": "error", "message": "Invalid frame data."})
                continue

            if frame is None:
                await websocket.send_json({"status": "error", "message": "Invalid frame data."})
                continue

            result = monitor.process_frame(frame)

            triggered = []
            for v in result["violations"]:
                violation = log_violation(
                    db=db,
                    session_id=session_id,
                    violation_type=v["type"],
                    message=v["message"],
                    frame=v["frame"],
                )
                triggered.append({
                    "type": violation.violation_type.value,
                    "message": violation.message,
                    "snapshot_url": violation.snapshot_url,
                    "created_at": violation.created_at.isoformat(),
                })

            await websocket.send_json({
                "status": "ok",
                "gaze": result["gaze"],
                "objects": result["objects"],
                "person_count": result["person_count"],
                "violations": triggered,
            })

    except WebSocketDisconnect:
        print(f"Monitor for session {session_id} disconnected.")
    except Exception as e:
        print(f"An error occurred in proctoring monitor: {e}")
        await websocket.close(code=1011, reason="An unexpected error occurred.")


@router.post("/{session_id}/violation", status_code=status.HTTP_201_CREATED)
async def report_violation(
    session_id: UUID,
    violation_type: ViolationType = Form(...),
    message: str = Form(""),
    audio_clip: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(user_service.get_current_user),
):
    """Logs a client-originated violation (browser anti-cheat events, VAD speech clips)."""
    session = db.query(UserExamSession).filter(
        UserExamSession.id == session_id,
        UserExamSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found.")

    audio_bytes = await audio_clip.read() if audio_clip is not None else None

    violation = log_violation(
        db=db,
        session_id=session_id,
        violation_type=violation_type,
        message=message,
        audio_bytes=audio_bytes,
    )

    return {
        "id": str(violation.id),
        "violation_type": violation.violation_type.value,
        "message": violation.message,
        "audio_clip_url": violation.audio_clip_url,
        "created_at": violation.created_at.isoformat(),
    }
