import { useEffect, useState } from "react";
import { BsPeople } from "react-icons/bs";
import Video from "../../../assets/icons/video.svg?react";
import { listActiveProctoringSessions, type SessionCard } from "../../../api/admin/admin.api";

const POLL_INTERVAL_MS = 5000;

const RISK_DOT: Record<string, string> = {
  Low: "text-[#109618]",
  Medium: "text-[#BF7300]",
  High: "text-[#FF0000]",
};

const Monitoring = () => {
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      listActiveProctoringSessions()
        .then((data) => {
          if (!cancelled) {
            setSessions(data);
            setError("");
          }
        })
        .catch(() => {
          if (!cancelled) setError("Could not load active sessions.");
        });
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full px-10 py-15">
      <h2 className="font-bold text-4xl">Live Exam Monitoring</h2>
      <p className="font-normal text-xl text-[#444]">
        Real-time proctoring of students taking the exam.
      </p>
      <div>
        <div className="w-full flex h-auto min-h-[600px] justify-start bg-white rounded-2xl shadow-md mt-5 p-10 flex-wrap gap-5">
          {error && <p className="text-red-600">{error}</p>}
          {!error && sessions.length === 0 && (
            <p className="text-[#736B6B]">No candidates are currently taking an exam.</p>
          )}
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className="w-3/10 h-[228px] bg-[#BABABA] rounded-[10px] shadow-md overflow-hidden"
            >
              <div className="flex gap-3 items-center p-3.5 text-white">
                <BsPeople />
                <h1 className="text-white truncate">{session.user_name}</h1>
              </div>
              <div className="flex justify-center m-7">
                <Video />
              </div>
              <div className="flex justify-between items-center px-3.5">
                <span className={`text-[13px] font-bold ${RISK_DOT[session.risk_band]}`}>
                  {session.risk_band} risk &middot; {session.total_violations} flag
                  {session.total_violations === 1 ? "" : "s"}
                </span>
                <h3 className="text-end text-[15px] text-[#FF0000]">LIVE .</h3>
              </div>
              <div className="w-full h-[50px] bg-white p-3.5">
                <p className="font-semibold truncate">{session.exam_title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
