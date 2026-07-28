import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/shallow";
import MainLayout from "../../layout/MainLayout/MainLayout";
import { useAuthStore } from "../../store/AuthStore";
import { useExamSessionStore } from "../../store/useExamSessionStore";
import { useFrameStreamSocket } from "../../hooks/useFrameStreamSocket";
import { toWsUrl } from "../../api/verification/verification.api";
import { getAvailableExams, startExam } from "../../api/exam/exam.api";

type GateMessage = {
  status: "authenticated" | "ready" | "fail" | "in_progress" | "success" | "error";
  message: string;
  blinks?: number;
};

const ExamVerify = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore(
    useShallow((s) => ({ user: s.user, token: s.token }))
  );
  const setSession = useExamSessionStore((s) => s.setSession);

  const [examId, setExamId] = useState<string>("");
  const [loadError, setLoadError] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    getAvailableExams()
      .then((exams) => {
        if (!exams.length) {
          setLoadError("No exams are currently available to start.");
          return;
        }
        setExamId(exams[0].id);
      })
      .catch(() => setLoadError("Could not load available exams."));
  }, []);

  const hasAvatar = !!user?.avatar_url;

  const { videoRef, status, lastMessage, mediaError } = useFrameStreamSocket<GateMessage>({
    wsUrl: toWsUrl("/api/v1/verification/ws/face-verify"),
    token,
    enabled: hasAvatar,
  });

  useEffect(() => {
    if (!examId || startedRef.current) return;
    if (lastMessage?.status === "success") {
      startedRef.current = true;
      startExam(examId)
        .then((session) => {
          setSession({
            sessionId: session.session_id,
            examId,
            examTitle: session.exam_title,
            durationMinutes: session.duration_minutes,
          });
          navigate("/dashboard/exam");
        })
        .catch(() => {
          setLoadError("Verification passed, but the exam session could not be started.");
          startedRef.current = false;
        });
    }
  }, [lastMessage, examId, navigate, setSession]);

  const statusText = !hasAvatar
    ? "No reference photo found on your profile. Please upload a profile photo before starting an exam."
    : mediaError || lastMessage?.message || "Connecting to verification service...";

  return (
    <MainLayout>
      <div className="bg-[#f5f5f5] flex flex-col items-center w-full pt-4 pb-10">
        <div className="w-9/10 mt-8 bg-white mb-9 flex flex-col items-center p-7.5 mx-12 rounded-3xl shadow-md">
          <h3 className="font-bold text-[32px]">Identity Verification</h3>
          <p className="text-[#444] text-lg my-1 text-center">
            Look directly at the camera. We'll confirm it's you, then ask you to blink to
            confirm you're not holding up a photo.
          </p>

          <div className="relative w-full max-w-md aspect-video bg-black rounded-2xl overflow-hidden mt-6">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
          </div>

          <div className="mt-6 text-center">
            <p
              className={`font-semibold text-lg ${
                lastMessage?.status === "success"
                  ? "text-green-600"
                  : lastMessage?.status === "fail" || loadError || mediaError
                  ? "text-red-600"
                  : "text-[#2534D7]"
              }`}
            >
              {loadError || statusText}
            </p>
            {status === "connecting" && hasAvatar && (
              <p className="text-sm text-[#736B6B] mt-2">Waiting for camera...</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ExamVerify;
