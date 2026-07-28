// import React from 'react'
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import MainLayout from "../../layout/MainLayout/MainLayout";
import { IoCheckmarkCircle } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useExamSessionStore } from "../../store/useExamSessionStore";
import { getProctoringSummary, type ProctoringSummary } from "../../api/exam/exam.api";

const RISK_BAND_STYLES: Record<string, string> = {
  Low: "bg-green-100 text-green-700 border-green-300",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  High: "bg-red-100 text-red-700 border-red-300",
};

const ExamSubmit = () => {
  const navigate = useNavigate();
  const sessionId = useExamSessionStore((s) => s.sessionId);
  const clearSession = useExamSessionStore((s) => s.clearSession);
  const [summary, setSummary] = useState<ProctoringSummary | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    getProctoringSummary(sessionId)
      .then(setSummary)
      .catch(() => {});
  }, [sessionId]);

  return (
    <MainLayout>
      <div className="w-full min-h-screen bg-[#F5F5F5] flex flex-col justify-center items-center py-10">
        <div className="w-8/10 flex flex-col justify-center pb-7.5 items-center border rounded-3xl bg-white">
          {/* ✅ Animated Check Icon */}
          <motion.div
            initial={{  rotate: -135, opacity: 0 }}
            animate={{ rotate: -360, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <IoCheckmarkCircle className="text-[200px] text-[#109618]" />
          </motion.div>

          {/* ✅ Animated Text */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="font-bold text-[36px] mt-4"
          >
            Successfully Submitted
          </motion.p>
        </div>

        {summary && (
          <div className="w-8/10 bg-white rounded-3xl border mt-8 p-8">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-2xl">Proctoring Summary</h2>
              <span
                className={`px-4 py-1.5 rounded-full border font-semibold text-sm ${
                  RISK_BAND_STYLES[summary.risk_band] || "bg-gray-100 text-gray-700 border-gray-300"
                }`}
              >
                {summary.risk_band} Risk ({summary.risk_score} pts)
              </span>
            </div>

            <p className="text-[#736B6B] mt-2">
              {summary.total_violations} flagged event{summary.total_violations === 1 ? "" : "s"} during this session.
            </p>

            {Object.keys(summary.violations_by_type).length > 0 && (
              <div className="flex flex-wrap gap-3 mt-5">
                {Object.entries(summary.violations_by_type).map(([type, count]) => (
                  <div key={type} className="px-4 py-2 rounded-xl bg-[#F5F5F5] text-sm">
                    <span className="font-semibold">{type.replace(/_/g, " ")}</span>: {count}
                  </div>
                ))}
              </div>
            )}

            {summary.timeline.length > 0 && (
              <div className="mt-6 max-h-64 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-[#736B6B] border-b">
                      <th className="py-2">Time</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.timeline.map((entry) => (
                      <tr key={entry.id} className="border-b">
                        <td className="py-2 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleTimeString()}
                        </td>
                        <td className="py-2">{entry.type.replace(/_/g, " ")}</td>
                        <td className="py-2">{entry.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => {
            clearSession();
            navigate("/dashboard");
          }}
          className="bg-[#1C0EE0] mt-8 rounded-sm text-white font-bold text-xl px-3 py-2"
        >
          Return to Dashboard
        </button>
      </div>
    </MainLayout>
  );
};

export default ExamSubmit;
