import api from "../api";

export async function getAvailableExams() {
  const res = await api.get("/api/v1/exams/available");
  return res.data as Array<{ id: string; duration_minutes: number; paper: { title: string } }>;
}

export async function startExam(examId: string) {
  const res = await api.post(`/api/v1/exams/${examId}/start`);
  return res.data as {
    session_id: string;
    exam_title: string;
    duration_minutes: number;
    questions: Array<{ id: string; question_text: string; question_type: string; options: string[] | null }>;
  };
}

export async function submitExam(sessionId: string, answers: Array<{ question_id: string; answer: string }>) {
  const res = await api.post(`/api/v1/exams/${sessionId}/submit`, { answers });
  return res.data;
}

export type ProctoringSummary = {
  session_id: string;
  total_violations: number;
  violations_by_type: Record<string, number>;
  risk_score: number;
  risk_band: "Low" | "Medium" | "High";
  timeline: Array<{
    id: string;
    type: string;
    message: string | null;
    snapshot_url: string | null;
    audio_clip_url: string | null;
    created_at: string;
  }>;
};

export async function getProctoringSummary(sessionId: string) {
  const res = await api.get(`/api/v1/exams/${sessionId}/proctoring-summary`);
  return res.data as ProctoringSummary;
}
