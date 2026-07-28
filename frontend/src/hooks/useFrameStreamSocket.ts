import { useEffect, useRef, useState } from "react";

type FrameStreamOptions = {
  wsUrl: string;
  token: string;
  enabled?: boolean;
  intervalMs?: number;
};

type ConnectionStatus = "connecting" | "open" | "closed" | "error";

/**
 * Shared plumbing for the identity-gate and continuous-monitor websockets:
 * opens the webcam, authenticates over the socket, then streams JPEG frames
 * at a fixed interval and exposes whatever JSON the server sends back.
 */
export function useFrameStreamSocket<TMessage = unknown>({
  wsUrl,
  token,
  enabled = true,
  intervalMs = 750,
}: FrameStreamOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastMessage, setLastMessage] = useState<TMessage | null>(null);
  const [mediaError, setMediaError] = useState<string>("");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch {
        setMediaError("Camera access is required for proctoring. Please allow camera permissions.");
        setStatus("error");
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ token }));
        setStatus("open");

        intervalId = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN || !videoRef.current) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          const base64 = dataUrl.split(",")[1];
          if (base64) ws.send(base64);
        }, intervalMs);
      };

      ws.onmessage = (event) => {
        try {
          setLastMessage(JSON.parse(event.data));
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => setStatus("error");
      ws.onclose = () => setStatus("closed");
    }

    start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      wsRef.current?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl, token, enabled]);

  return { videoRef, status, lastMessage, mediaError };
}
