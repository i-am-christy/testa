import { useEffect, useRef, useState } from "react";
import { MicVAD } from "@ricky0123/vad-web";

const MIN_SPEECH_SECONDS = 1.0;
const VAD_SAMPLE_RATE = 16000;

/** Encodes 16kHz mono float32 PCM samples into a WAV Blob. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Client-side Silero VAD (via @ricky0123/vad-web). Detects speech-vs-silence only —
 * no transcription. On a speech segment long enough to matter, hands back a short
 * WAV clip of exactly that segment so a violation can be logged with evidence attached.
 */
export function useVoiceActivity(
  enabled: boolean,
  onSpeechDetected: (clip: Blob, durationSeconds: number) => void
) {
  const [speaking, setSpeaking] = useState(false);
  const onSpeechDetectedRef = useRef(onSpeechDetected);
  onSpeechDetectedRef.current = onSpeechDetected;

  useEffect(() => {
    if (!enabled) return;

    let vad: MicVAD | null = null;
    let cancelled = false;

    MicVAD.new({
      onSpeechStart: () => setSpeaking(true),
      onSpeechEnd: (audio: Float32Array) => {
        setSpeaking(false);
        const durationSeconds = audio.length / VAD_SAMPLE_RATE;
        if (durationSeconds < MIN_SPEECH_SECONDS) return;
        const clip = encodeWav(audio, VAD_SAMPLE_RATE);
        onSpeechDetectedRef.current(clip, durationSeconds);
      },
    })
      .then((instance) => {
        if (cancelled) {
          instance.destroy();
          return;
        }
        vad = instance;
        vad.start();
      })
      .catch((err) => {
        console.error("Voice activity detection failed to start:", err);
      });

    return () => {
      cancelled = true;
      vad?.destroy();
    };
  }, [enabled]);

  return { speaking };
}
