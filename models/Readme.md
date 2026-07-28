# Face Verification System (exploratory notebooks)

> **These notebooks are exploratory scratch work, not the running system.** The logic here was
> carried over into the real backend service at `../backend/api/v1/services/verification.py`
> (identity + blink liveness) and `../backend/api/v1/services/proctoring.py` (gaze via dlib
> landmarks + solvePnP, YOLOv8n object/multi-person detection, violation logging), served over
> websockets from `../backend/api/v1/routes/verification.py`. See the top-level `../README.md`
> for how to actually run the proctoring system.
>
> The `buffalo_1/` InsightFace model weights and `yolov8n.pt` used to be committed here (~340MB)
> and were removed from git history for repo size. `shape_predictor_68_face_landmarks.dat` is
> fetched by `../backend/download_assets.sh`. If you want to run `realtime_proctoring.ipynb`
> locally, re-download the buffalo_1 model via `insightface.app.FaceAnalysis(name="buffalo_1")`
> (it auto-downloads on first use) rather than committing the weights again.

This project implements a real-time face verification and liveness detection system using a webcam feed. It verifies a user against a provided reference image and performs a liveness check by detecting blinks.

---

## ✅ Features

- **Face Verification**: Compares faces detected in the live webcam feed against a pre-registered reference image.
- **Liveness Detection**: Uses Eye Aspect Ratio (EAR) to detect blinks, ensuring the user is live and not a static photo or video.
- **Real-time Processing**: Processes video frames live for immediate feedback.
- **User Feedback**: Displays real-time status updates for face detection, verification, and liveness checks.

---

## 🛠 Requirements

Before running the application, ensure the following Python libraries are installed:

- `dlib` – face detection and facial landmark prediction
- `face_recognition` – face encoding and comparison
- `opencv-python` – webcam access and video/image processing
- `numpy` – numerical operations
- `requests` – downloading the reference image
- `Pillow` – image handling (PIL)

You’ll also need:
- `shape_predictor_68_face_landmarks.dat` – Dlib's pre-trained facial landmark model  
  ➤ [Download here](http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2) and extract it into the project directory.

---

## 🔧 Installation

```bash
# (Optional but recommended) Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install required libraries
pip install dlib face-recognition opencv-python numpy requests Pillow
