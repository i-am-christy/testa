import api from "../api";

const apiUrl: string = import.meta.env.VITE_API_URL;

/** Converts the http(s) API base URL into a ws(s) URL for the given path. */
export function toWsUrl(path: string): string {
  const wsBase = apiUrl.replace(/^http/, "ws");
  return `${wsBase}${path}`;
}

export async function reportViolation(
  sessionId: string,
  violationType: string,
  message: string,
  audioClip?: Blob
) {
  const formData = new FormData();
  formData.append("violation_type", violationType);
  formData.append("message", message);
  if (audioClip) {
    formData.append("audio_clip", audioClip, "clip.webm");
  }
  const res = await api.post(`/api/v1/verification/${sessionId}/violation`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
