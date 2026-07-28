import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useFormChangeHandler from "../../hooks/useFormChangeHandler";
import { useShallow } from "zustand/shallow";
import { useAuthStore } from "../../store/AuthStore";
const UserLogin = () => {
  const navigate = useNavigate();
  const { login, error: authError } = useAuthStore(
    useShallow((s) => ({
      login: s.login,
      error: s.error,
    }))
  );

  const [loginDetails, handleLoginChange] = useFormChangeHandler<loginPayload>({
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    const user = await login(loginDetails);
    setSubmitting(false);
    if (user) {
      navigate(user.is_admin ? "/admin" : "/dashboard");
    }
  };

  return (
    <>
      <form className="  flex flex-col gap-6.5" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="Email">Email/ICAN No.</label>
          <input
            placeholder="Enter your email"
            name="email"
            className="w-full border p-4 mt-2 border-[#DADADA] rounded-sm"
            type="text"
            onChange={handleLoginChange}
          />
        </div>
        <div>
          <label htmlFor="Password">Password</label>
          <input
            placeholder="*****************"
            name="password"
            className="w-full border p-4 mt-2 border-[#DADADA] rounded-sm"
            type="password"
            onChange={handleLoginChange}
          />
        </div>
      </form>
      {authError && <p className="text-red-600 text-sm mt-3">{authError}</p>}
      <div className="w-full flex mt-9 justify-between">
        <div>Remember Me</div>
        <p className="font-medium text-[16px] text-[var(--primary-color)]">
          Forgot Password?
        </p>
      </div>
      <div className="w-full flex justify-center mt-15">
        <button
          disabled={submitting}
          onClick={handleLogin}
          className="font-medium w-5/12 bg-[var(--primary-color)] text-white py-2 rounded-md disabled:opacity-50"
        >
          {submitting ? "Logging in..." : "Login"}
        </button>
      </div>
    </>
  );
};

export default UserLogin;
