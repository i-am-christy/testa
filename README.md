# ICAN TESTA — Proctored Online Exams

An AI-proctored exam platform: FastAPI backend (`backend/`, git submodule) + React/Vite frontend
(`frontend/`). Proctoring covers identity verification, blink-based liveness, gaze/head-pose
monitoring, prohibited-object and multiple-person detection (YOLOv8n), client-side voice-activity
detection, and a timestamped violation log with snapshot/audio evidence and a rule-based risk score.

## Running it locally

### 1. Backend

```bash
cd backend
git submodule update --init --recursive   # first time only, from the repo root
python -m venv .venv
.venv/Scripts/activate                    # or `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
```

Create `backend/.env` with at least:

```
SECRET_KEY=...
ALGORITHM=HS256
APP_PORT=7001
DB_HOST=... DB_PORT=5432 DB_USER=... DB_PASSWORD=... DB_NAME=... DB_TYPE=postgresql
DB_URL=postgresql://user:password@host:port/dbname   # used by alembic
ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_EXPIRY=30
CLOUD_NAME=... API_KEY=... API_SECRET=... CLOUDINARY_URL=...
```

Fetch the CV model weights, then run migrations and start the API:

```bash
bash download_assets.sh   # shape_predictor_68_face_landmarks.dat + yolov8n.pt
alembic upgrade head
uvicorn main:app --reload --port 7001
```

`GET /heartbeat` should return `200 OK` once it's up. If YOLOv8n's weights aren't found locally,
`ultralytics` will auto-download `yolov8n.pt` on first request to the monitoring websocket — do this
once before a live demo so it isn't waiting on a network fetch mid-demo.

### 2. Frontend

```bash
cd frontend
npm install
```

Set `frontend/.env`:

```
VITE_API_URL=http://localhost:7001
```

```bash
npm run dev
```

## Demo walkthrough

1. Sign up (name, ICAN number, email, phone → password → **upload a clear photo of your face**).
   That photo becomes the reference image the identity gate compares you against.
2. From the dashboard, start an exam → read the instructions → "Proceed to verification".
3. Look at the camera to be matched against your reference photo, then blink to confirm liveness.
4. During the exam, the side panel shows live status (gaze, object/person detection, mic) and a
   running flag feed. Trigger flags to test: hold up a phone or book, have a second person step
   into frame, look away from the screen for a few seconds, or talk out loud.
5. Submit the exam — the confirmation page shows the violation counts, timestamped log, and a
   Low/Medium/High risk rating for that session.
6. Log in as an admin (`is_admin=true` on the user record) and open **Live Exam Monitoring** and
   **Review Exam Submissions** to see the same data from the proctor's side.

## Repo layout

- `backend/` — FastAPI service (git submodule, own repo at `Afeh/testa`). Proctoring logic lives in
  `api/v1/services/verification.py` (identity + blink liveness) and `api/v1/services/proctoring.py`
  (gaze via dlib landmarks + solvePnP, YOLOv8n object/person detection, violation persistence).
- `frontend/` — React 19 + Vite app. Proctoring UI lives in `src/components/Proctoring/`,
  `src/hooks/useFrameStreamSocket.ts` / `useVoiceActivity.ts`, and `src/pages/Exam/ExamVerify.tsx`.
- `models/` — exploratory notebooks (`dlib_face_verification.ipynb`,
  `realtime_proctoring.ipynb`) that the backend service logic above was built from. Kept for
  reference; they are not what actually runs.
