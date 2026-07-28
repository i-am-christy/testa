import api from "../api";
import type { ProctoringSummary } from "../exam/exam.api";

export type SessionCard = {
  session_id: string;
  user_name: string;
  exam_title: string;
  start_time: string;
  duration_minutes: number;
  is_active: boolean;
  score: number | null;
  total_violations: number;
  risk_score: number;
  risk_band: "Low" | "Medium" | "High";
};

export async function listActiveProctoringSessions() {
  const res = await api.get("/api/v1/admin/proctoring/sessions");
  return res.data as SessionCard[];
}

export async function listExamSessions() {
  const res = await api.get("/api/v1/admin/exam-sessions");
  return res.data as SessionCard[];
}

export async function getSessionProctoringSummary(sessionId: string) {
  const res = await api.get(`/api/v1/admin/exam-sessions/${sessionId}/proctoring-summary`);
  return res.data as ProctoringSummary;
}
