import { useState } from "react";
import { useSwitchStore } from "../../store/useSwitchStore";
import { useShallow } from "zustand/shallow";

const UserSignup = () => {
  const { signupDraft, setBasicInfo, goToPasswordStep } = useSwitchStore(
    useShallow((s) => ({
      signupDraft: s.signupDraft,
      setBasicInfo: s.setBasicInfo,
      goToPasswordStep: s.goToPasswordStep,
    }))
  );

  const [fullName, setFullName] = useState(
    `${signupDraft.first_name} ${signupDraft.last_name}`.trim()
  );
  const [icanNumber, setIcanNumber] = useState(signupDraft.ican_number);
  const [email, setEmail] = useState(signupDraft.email);
  const [phone, setPhone] = useState(signupDraft.phone_number);
  const [error, setError] = useState("");

  const handleNext = () => {
    const [first_name, ...rest] = fullName.trim().split(/\s+/);
    const last_name = rest.join(" ");

    if (!first_name || !last_name || !icanNumber || !email || !phone) {
      setError("Please fill in your full name, ICAN number, email, and phone number.");
      return;
    }

    setBasicInfo({
      first_name,
      last_name,
      ican_number: icanNumber,
      email,
      phone_number: phone,
    });
    goToPasswordStep();
  };

  return (
    <>
      <form className="pt-[45px] flex flex-col gap-6.5" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="FullName">Full Name</label>
          <input
            id="FullName"
            placeholder="Enter your name"
            className="w-full border p-4 mt-2 border-[#DADADA] rounded-sm"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ICAN">ICAN Number</label>
          <input
            id="ICAN"
            placeholder="ICAN No."
            className="w-full border p-4 mt-2 border-[#DADADA] rounded-sm"
            type="text"
            value={icanNumber}
            onChange={(e) => setIcanNumber(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="Email">Email</label>
          <input
            id="Email"
            placeholder="Email"
            className="w-full border p-4 mt-2 border-[#DADADA] rounded-sm"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="Phone">Phone Number</label>
          <input
            id="Phone"
            placeholder="Phone"
            className="w-full border p-4 mt-2 border-[#DADADA] rounded-sm"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </form>
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      <div className="w-full flex mt-9 justify-between">
        <div className="flex gap-2 items-center">
          <input type="checkbox" />
          Remember Me
        </div>
        <p className="font-medium text-[16px] text-[var(--primary-color)]">
          Already have an account?
        </p>
      </div>
      <div className="w-full flex justify-center mt-15">
        <button
          type="button"
          onClick={handleNext}
          className="cursor-pointer font-medium w-5/12 bg-[var(--primary-color)] text-white py-2 rounded-md"
        >
          Next
        </button>
      </div>
    </>
  );
};

export default UserSignup;
