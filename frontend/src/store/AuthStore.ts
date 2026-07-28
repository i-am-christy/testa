import { create } from "zustand";
import {
  loginUser,
  registerUser,
  uploadSignInImage,
} from "../api/auth/auth.api";
import { updateProfile } from "../api/profile/profile.api";

interface AuthStoreType {
  loading: boolean;
  error: string;
  token: string;
  user: AuthUser | null;
  login: (loginPayload: loginPayload) => Promise<AuthUser | null>;
  register: (signUpPayload: SignUp) => Promise<AuthUser | null>;
  uploadImage: (uploadFile: File) => Promise<string | null>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
  logout: () => void;
}

function isAxiosErrorWithMessage(
  error: unknown
): error is { response: { data: { message: string } } } {
  const response = (error as { response?: { data?: { message?: unknown } } } | null)?.response;
  return typeof response?.data?.message === "string";
}

function persistSession(token: string, user: AuthUser) {
  localStorage.setItem("icanAuth", token);
  localStorage.setItem("icanUser", JSON.stringify(user));
}

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("icanUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStoreType>((set, get) => ({
  loading: false,
  error: "",
  token: localStorage.getItem("icanAuth") || "",
  user: readStoredUser(),
  login: async (loginPayload) => {
    set({ loading: true, error: "" });
    try {
      const res = await loginUser(loginPayload);
      const token = res.data.access_token;
      const user = res.data.user as AuthUser;
      persistSession(token, user);
      set({ loading: false, token, user });
      return user;
    } catch (error) {
      const message = isAxiosErrorWithMessage(error) ? error.response.data.message : "Login failed";
      set({ loading: false, error: message });
      return null;
    }
  },
  register: async (signUpPayload) => {
    set({ loading: true, error: "" });
    try {
      const res = await registerUser(signUpPayload);
      const token = res.data.access_token;
      const user = res.data.user as AuthUser;
      persistSession(token, user);
      set({ loading: false, token, user });
      return user;
    } catch (error) {
      const message = isAxiosErrorWithMessage(error) ? error.response.data.message : "Registration failed";
      set({ loading: false, error: message });
      return null;
    }
  },
  uploadImage: async (uploadFile: File) => {
    try {
      const data = await uploadSignInImage(uploadFile);
      return data.url as string;
    } catch (err) {
      console.error(err);
      return null;
    }
  },
  updateAvatar: async (avatarUrl: string) => {
    const user = get().user;
    if (!user) return;
    await updateProfile(user.id, { avatar_url: avatarUrl });
    const updatedUser = { ...user, avatar_url: avatarUrl };
    localStorage.setItem("icanUser", JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },
  logout: () => {
    localStorage.removeItem("icanAuth");
    localStorage.removeItem("icanUser");
    set({ token: "", user: null });
  },
}));
