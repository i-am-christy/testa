import { useEffect, useState } from "react";
import {
  listExamSessions,
  getSessionProctoringSummary,
  type SessionCard,
} from "../../../api/admin/admin.api";
import type { ProctoringSummary } from "../../../api/exam/exam.api";

const RISK_BAND_STYLES: Record<string, string> = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-700",
  High: "bg-red-100 text-red-700",
};

const Review = () => {
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<SessionCard | null>(null);
  const [detail, setDetail] = useState<ProctoringSummary | null>(null);

  useEffect(() => {
    listExamSessions()
      .then(setSessions)
      .catch(() => setError("Could not load exam submissions."));
  }, []);

  const openDetail = (session: SessionCard) => {
    setSelected(session);
    setDetail(null);
    getSessionProctoringSummary(session.session_id)
      .then(setDetail)
      .catch(() => {});
  };

  return (
    <div className="w-full px-10 py-15">
      <h2 className="font-bold text-4xl">Review Exam Submissions</h2>
      <p className="font-normal text-xl text-[#444]">
        Real-time proctoring of students taking the exam.
      </p>
      <section className="w-full bg-white mt-6 rounded-2xl shadow-md px-4 py-4">
        <h1 className="font-semibold text-2xl">Submissions</h1>
        <p className="text-[#736B6B]">All exam sessions and their proctoring risk rating</p>
        {error && <p className="text-red-600 mt-4">{error}</p>}
        <table className="w-full mt-6 border-separate border-spacing-y-3 text-sm">
          <thead>
            <tr className="text-left text-[#000] text-[18px] border-b border-[#736B6B]">
              <th className="pb-3 font-semibold border-b border-[#736B6B]">Student Name</th>
              <th className="pb-3 font-semibold border-b border-[#736B6B] text-center">Exam</th>
              <th className="pb-3 font-semibold border-b border-[#736B6B] text-center">Score</th>
              <th className="pb-3 font-semibold border-b border-[#736B6B] text-center">Status</th>
              <th className="pb-3 font-semibold border-b border-[#736B6B] text-center">Risk</th>
              <th className="pb-3 font-semibold border-b border-[#736B6B] text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.session_id} className="text-[#222] bg-white">
                <td className="py-4 font-medium border-b border-[#736B6B]">{session.user_name}</td>
                <td className="py-4 font-medium border-b border-[#736B6B] text-center">{session.exam_title}</td>
                <td className="py-4 font-medium border-b border-[#736B6B] text-center">
                  {session.score !== null ? `${session.score.toFixed(0)}%` : "-"}
                </td>
                <td className="py-4 font-medium border-b border-[#736B6B] text-center">
                  {session.is_active ? "In Progress" : "Graded"}
                </td>
                <td className="py-4 font-medium border-b border-[#736B6B] text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${RISK_BAND_STYLES[session.risk_band]}`}>
                    {session.risk_band} ({session.total_violations})
                  </span>
                </td>
                <td className="py-4 font-medium border-b border-[#736B6B] text-center">
                  <button
                    onClick={() => openDetail(session)}
                    className="text-[#2534D7] font-semibold cursor-pointer"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected && (
        <section className="w-full bg-white mt-6 rounded-2xl shadow-md px-6 py-6">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-xl">{selected.user_name} — Violation Log</h2>
            <button onClick={() => setSelected(null)} className="text-[#736B6B]">
              Close
            </button>
          </div>
          {!detail && <p className="text-[#736B6B] mt-4">Loading...</p>}
          {detail && (
            <div className="mt-4">
              <p className="font-semibold">
                Risk: {detail.risk_band} ({detail.risk_score} pts) — {detail.total_violations} total flags
              </p>
              <div className="mt-4 max-h-72 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-[#736B6B] border-b">
                      <th className="py-2">Time</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Details</th>
                      <th className="py-2">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.timeline.map((entry) => (
                      <tr key={entry.id} className="border-b">
                        <td className="py-2 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="py-2">{entry.type.replace(/_/g, " ")}</td>
                        <td className="py-2">{entry.message}</td>
                        <td className="py-2">
                          {entry.snapshot_url && (
                            <a href={entry.snapshot_url} target="_blank" rel="noreferrer" className="text-[#2534D7] mr-2">
                              Snapshot
                            </a>
                          )}
                          {entry.audio_clip_url && (
                            <a href={entry.audio_clip_url} target="_blank" rel="noreferrer" className="text-[#2534D7]">
                              Audio
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Review;
