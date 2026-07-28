import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useAuthStore } from "../../store/AuthStore";
import { useExamSessionStore } from "../../store/useExamSessionStore";
import { useFrameStreamSocket } from "../../hooks/useFrameStreamSocket";
import { useVoiceActivity } from "../../hooks/useVoiceActivity";
import { toWsUrl, reportViolation } from "../../api/verification/verification.api";

type MonitorMessage = {
  status: "ready" | "ok" | "error";
  gaze?: "ok" | "away" | "no_face" | "unknown";
  objects?: string[];
  person_count?: number;
  violations?: Array<{ type: string; message: string; snapshot_url: string | null; created_at: string }>;
};

type FeedEntry = { type: string; message: string; at: string };

const MAX_FEED_ENTRIES = 6;

export type ProctoringPanelProps = {
  /** Violations logged elsewhere (e.g. browser anti-cheat) to fold into the shared feed. */
  externalViolations?: FeedEntry[];
};

const ProctoringPanel = ({ externalViolations = [] }: ProctoringPanelProps) => {
  const { token } = useAuthStore(useShallow((s) => ({ token: s.token })));
  const sessionId = useExamSessionStore((s) => s.sessionId);

  const { videoRef, status, lastMessage } = useFrameStreamSocket<MonitorMessage>({
    wsUrl: toWsUrl(`/api/v1/verification/ws/monitor/${sessionId}`),
    token,
    enabled: !!sessionId,
    intervalMs: 1000,
  });

  const [feed, setFeed] = useState<FeedEntry[]>([]);

  useEffect(() => {
    if (!lastMessage?.violations?.length) return;
    setFeed((prev) =>
      [
        ...lastMessage.violations!.map((v) => ({
          type: v.type,
          message: v.message,
          at: v.created_at,
        })),
        ...prev,
      ].slice(0, MAX_FEED_ENTRIES)
    );
  }, [lastMessage]);

  const combinedFeed = [...externalViolations, ...feed]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, MAX_FEED_ENTRIES);

  const { speaking } = useVoiceActivity(!!sessionId, (clip, duration) => {
    reportViolation(
      sessionId,
      "voice_activity",
      `Speech detected (${duration.toFixed(1)}s).`,
      clip
    ).catch(() => {});
    setFeed((prev) =>
      [
        { type: "voice_activity", message: `Speech detected (${duration.toFixed(1)}s).`, at: new Date().toISOString() },
        ...prev,
      ].slice(0, MAX_FEED_ENTRIES)
    );
  });

  const gaze = lastMessage?.gaze ?? "unknown";
  const objects = lastMessage?.objects ?? [];
  const personCount = lastMessage?.person_count ?? 1;

  return (
    <div className="w-64 flex flex-col gap-3">
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-md">
        <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />

        <div className="absolute inset-0 p-2 flex flex-col justify-between text-[11px] font-semibold pointer-events-none">
          <div className="flex flex-wrap gap-1">
            <span className={`px-1.5 py-0.5 rounded ${status === "open" ? "bg-green-600/80 text-white" : "bg-gray-500/80 text-white"}`}>
              {status === "open" ? "● Monitoring" : "Connecting..."}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            <span
              className={`px-1.5 py-0.5 rounded text-white ${
                gaze === "ok" ? "bg-green-600/80" : gaze === "away" ? "bg-red-600/80" : "bg-gray-500/80"
              }`}
            >
              {gaze === "ok" ? "Gaze OK" : gaze === "away" ? "Looking away" : "Detecting..."}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-white ${personCount > 1 ? "bg-red-600/80" : "bg-green-600/80"}`}>
              {personCount} person{personCount === 1 ? "" : "s"}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-white ${speaking ? "bg-amber-600/80" : "bg-gray-500/80"}`}>
              {speaking ? "🎙 Speaking" : "Silent"}
            </span>
          </div>
          {objects.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {objects.map((o, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-red-600/80 text-white">
                  ⚠ {o}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-3 max-h-48 overflow-y-auto">
        <h4 className="font-bold text-sm mb-2">Live Activity Log</h4>
        {combinedFeed.length === 0 ? (
          <p className="text-xs text-[#736B6B]">No flags yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {combinedFeed.map((entry, i) => (
              <li key={i} className="text-xs text-[#444]">
                <span className="font-semibold">{entry.type.replace(/_/g, " ")}</span>: {entry.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ProctoringPanel;
