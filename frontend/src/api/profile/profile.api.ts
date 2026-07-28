import api from "../api";

export async function updateProfile(userId: string, payload: { avatar_url?: string; phone_number?: string }) {
  const res = await api.patch(`/api/v1/profile/update?user_id=${userId}`, payload);
  return res.data;
}
