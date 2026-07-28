import { create } from "zustand";

type ExamSessionStore = {
  sessionId: string;
  examId: string;
  examTitle: string;
  durationMinutes: number;
  setSession: (session: {
    sessionId: string;
    examId: string;
    examTitle: string;
    durationMinutes: number;
  }) => void;
  clearSession: () => void;
};

export const useExamSessionStore = create<ExamSessionStore>((set) => ({
  sessionId: sessionStorage.getItem("icanExamSessionId") || "",
  examId: sessionStorage.getItem("icanExamId") || "",
  examTitle: sessionStorage.getItem("icanExamTitle") || "",
  durationMinutes: Number(sessionStorage.getItem("icanExamDuration")) || 0,
  setSession: ({ sessionId, examId, examTitle, durationMinutes }) => {
    sessionStorage.setItem("icanExamSessionId", sessionId);
    sessionStorage.setItem("icanExamId", examId);
    sessionStorage.setItem("icanExamTitle", examTitle);
    sessionStorage.setItem("icanExamDuration", String(durationMinutes));
    set({ sessionId, examId, examTitle, durationMinutes });
  },
  clearSession: () => {
    sessionStorage.removeItem("icanExamSessionId");
    sessionStorage.removeItem("icanExamId");
    sessionStorage.removeItem("icanExamTitle");
    sessionStorage.removeItem("icanExamDuration");
    set({ sessionId: "", examId: "", examTitle: "", durationMinutes: 0 });
  },
}));
