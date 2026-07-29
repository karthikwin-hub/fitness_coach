"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadCoachAudio } from "@/lib/firebase/storage-upload";

const MAX_DURATION_SEC = 180;

type AttachedVoice = {
  url: string;
  durationSec: number;
};

type VoiceNoteRecorderProps = {
  memberId?: string;
  uploadScope?: string;
  attached?: AttachedVoice | null;
  onAttach: (url: string, durationSec: number) => void;
  onClear: () => void;
  disabled?: boolean;
  label?: string;
};

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceNoteRecorder({
  memberId,
  uploadScope,
  attached,
  onAttach,
  onClear,
  disabled = false,
  label = "Voice note",
}: VoiceNoteRecorderProps) {
  const scopeKey = uploadScope ?? memberId;
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDurationSec, setPreviewDurationSec] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearPreview = useCallback(() => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewDurationSec(0);
    setElapsedSec(0);
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopStream();
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, stopStream]);

  async function startRecording() {
    if (disabled || typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser.");
      return;
    }

    setError(null);
    clearPreview();
    onClear();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewDurationSec(elapsedRef.current || 1);
        stopStream();
      };

      recorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      elapsedRef.current = 0;
      setElapsedSec(0);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsedSec(elapsedRef.current);
        if (elapsedRef.current >= MAX_DURATION_SEC) {
          void stopRecording();
        }
      }, 1000);
    } catch {
      setError("Microphone access denied or unavailable.");
      stopStream();
    }
  }

  async function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    recorderRef.current = null;
  }

  async function attachPreview() {
    if (!previewUrl || !scopeKey) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      const url = await uploadCoachAudio(blob, scopeKey);
      if (!url) {
        setError("Upload failed — check Firebase storage configuration.");
        return;
      }
      onAttach(url, previewDurationSec);
      clearPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleClearAttached() {
    onClear();
    clearPreview();
    setError(null);
  }

  if (!scopeKey) {
    return (
      <p className="text-xs text-amber-300" role="alert">
        Voice upload is not configured.
      </p>
    );
  }

  if (attached?.url) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-white/50">{label}</p>
          <button
            type="button"
            disabled={disabled}
            onClick={handleClearAttached}
            className="text-xs text-white/40 hover:text-white/70 disabled:opacity-40"
          >
            Remove
          </button>
        </div>
        <audio controls className="mt-2 w-full" src={attached.url}>
          <track kind="captions" />
        </audio>
        {attached.durationSec > 0 && (
          <p className="mt-1 text-[10px] text-white/40">
            {formatDuration(attached.durationSec)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/50">{label}</p>

      {previewUrl ? (
        <div className="mt-2 space-y-2">
          <audio controls className="w-full" src={previewUrl}>
            <track kind="captions" />
          </audio>
          <p className="text-[10px] text-white/40">
            Preview · {formatDuration(previewDurationSec || elapsedSec)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => void attachPreview()}
              className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              {uploading ? "Uploading…" : "Attach voice note"}
            </button>
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => {
                clearPreview();
                setError(null);
              }}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs"
            >
              Discard
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!recording ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void startRecording()}
              className="rounded-lg border border-[var(--brand-diet)]/40 px-3 py-1.5 text-xs text-[var(--brand-diet)] disabled:opacity-40"
            >
              Record voice note
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void stopRecording()}
                className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-200"
              >
                Stop
              </button>
              <span className="text-xs text-red-200">
                Recording {formatDuration(elapsedSec)} / {formatDuration(MAX_DURATION_SEC)}
              </span>
            </>
          )}
          <span className="text-[10px] text-white/30">Max {MAX_DURATION_SEC / 60} min</span>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-amber-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
