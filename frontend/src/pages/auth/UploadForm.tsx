import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/shallow";
import Dummyupload from "../../assets/icons/dummyupload.svg?react";
import { TfiPlus } from "react-icons/tfi";
import { useSwitchStore } from "../../store/useSwitchStore";
import { useAuthStore } from "../../store/AuthStore";

const UploadForm = () => {
  const navigate = useNavigate();
  const { signupDraft, resetSignupDraft } = useSwitchStore(
    useShallow((s) => ({
      signupDraft: s.signupDraft,
      resetSignupDraft: s.resetSignupDraft,
    }))
  );
  const { register, uploadImage, updateAvatar } = useAuthStore(
    useShallow((s) => ({
      register: s.register,
      uploadImage: s.uploadImage,
      updateAvatar: s.updateAvatar,
    }))
  );

  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCreateAccount = async () => {
    if (!photo) {
      setError("Please upload a profile photo — it's used to verify your identity during exams.");
      return;
    }

    setSubmitting(true);
    setError("");

    const user = await register(signupDraft);
    if (!user) {
      setError("Could not create your account. Please check your details and try again.");
      setSubmitting(false);
      return;
    }

    const avatarUrl = await uploadImage(photo);
    if (!avatarUrl) {
      setError("Account created, but the photo upload failed. You can add it later from your profile.");
      setSubmitting(false);
      navigate("/dashboard");
      return;
    }

    await updateAvatar(avatarUrl);
    resetSignupDraft();
    setSubmitting(false);
    navigate("/dashboard");
  };

  return (
    <>
      <div className="w-full flex flex-col g  justify-center items-center">
        <h1 className=" font-bold text-3xl mt-5">Upload Profile Photo</h1>
        <p className="font-medium text-lg mt-3 text-[#736B6B]">
          Profile picture must be a recent picture of you showing your face
          clearly
        </p>
      </div>
      <div className=" cursor-pointer w-full my-5 flex justify-center ">
        <label
          htmlFor="photo"
          className="cursor-pointer relative px-4 py-2 bg-white border border-none rounded-md text-sm  transition"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile preview"
              className="w-32 h-32 object-cover rounded-full"
            />
          ) : (
            <>
              <Dummyupload />
              <TfiPlus className="absolute top-[33%] text-white text-9xl right-[33%]" />
            </>
          )}
        </label>
        <input
          type="file"
          accept="image/*"
          id="photo"
          name="photo"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      <div className="w-full flex flex-col items-center justify-between">
        <p>Upload Now</p>
        <div className="w-full flex justify-center mt-10">
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => {
              e.preventDefault();
              handleCreateAccount();
            }}
            className="cursor-pointer font-medium w-5/12 bg-[var(--primary-color)] text-white py-2 rounded-md disabled:opacity-50"
          >
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </div>
      </div>
    </>
  );
};

export default UploadForm;
