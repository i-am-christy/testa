import { create } from "zustand"

type SignupDraft = {
  first_name: string;
  last_name: string;
  ican_number: string;
  email: string;
  phone_number: string;
  password: string;
  confirm_password: string;
};

type SwitchStore = {
  isLogin: boolean;
  showPasswordStep: boolean;
  showUploadStep: boolean;

  signupDraft: SignupDraft;

  showLogin: () => void;
  showSignUp: () => void;

  goToPasswordStep: () => void;
  backToBasicInfo: () => void;

  goToUploadStep: () => void;
  backToPasswordStep: () => void;

  setBasicInfo: (info: Partial<SignupDraft>) => void;
  setPasswordInfo: (info: Partial<SignupDraft>) => void;
  resetSignupDraft: () => void;
};

const emptyDraft: SignupDraft = {
  first_name: "",
  last_name: "",
  ican_number: "",
  email: "",
  phone_number: "",
  password: "",
  confirm_password: "",
};

export const useSwitchStore = create<SwitchStore>((set) => ({
  isLogin: false,
  showPasswordStep: false,
  showUploadStep: false,

  signupDraft: { ...emptyDraft },

  showLogin: () => set({ isLogin: true }),
  showSignUp: () => set({ isLogin: false }),

  goToPasswordStep: () => set({ showPasswordStep: true }),
  backToBasicInfo: () => set({ showPasswordStep: false }),

  goToUploadStep: () => set({ showUploadStep: true }),
  backToPasswordStep: () => set({ showUploadStep: false }),

  setBasicInfo: (info) =>
    set((s) => ({ signupDraft: { ...s.signupDraft, ...info } })),
  setPasswordInfo: (info) =>
    set((s) => ({ signupDraft: { ...s.signupDraft, ...info } })),
  resetSignupDraft: () => set({ signupDraft: { ...emptyDraft } }),
}));
