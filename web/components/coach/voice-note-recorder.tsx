"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useAuthHeaders } from "@/lib/api/client";
import { uploadCoachAudio } from "@/lib/firebase/storage-upload";
import { COACH_AUDIO_MAX_BYTES } from "@/lib/firebase/media-upload-path";

const MAX_DURATION_SEC = 180;

type AttachedVoice = {
  url: string;
  durationSec: number;
};

export type VoiceNoteRecorderHandle = {
  /** Stop recording / upload preview so Save or Approve can persist voice feedback. */
  finalizeForSave: () => Promise<AttachedVoice | null>;
  isRecording: () => boolean;
  isUploading: () => boolean;
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

export const VoiceNoteRecorder = forwardRef<VoiceNoteRecorderHandle, VoiceNoteRecorderProps>(
  function VoiceNoteRecorder(
    {
      memberId,
      uploadScope,
      attached,
      onAttach,
      onClear,
      disabled = false,
      label = "Voice note",
    },
    ref,
  ) {
    const scopeKey = uploadScope ?? memberId;
    const { firebaseUser } = useAuth();
    const getHeaders = useAuthHeaders();
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachedRef = useRef(attached);
    attachedRef.current = attached;

    const uploadOpts = useCallback(async () => {
      const authHeaders = await getHeaders();
      return {
        authHeaders,
        preferServer: !firebaseUser,
      };
    }, [firebaseUser, getHeaders]);

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

    const stopRecordingAsync = useCallback((): Promise<{
      blob: Blob;
      durationSec: number;
    } | null> => {
      return new Promise((resolve) => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecording(false);

        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") {
          resolve(null);
          return;
        }

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const durationSec = elapsedRef.current || 1;
          stopStream();
          recorderRef.current = null;
          resolve({ blob, durationSec });
        };
        recorder.stop();
      });
    }, [stopStream]);

    async function uploadBlob(blob: Blob, durationSec: number): Promise<string | null> {
      if (!scopeKey) return null;
      setUploading(true);
      setError(null);
      try {
        const opts = await uploadOpts();
        const url = await uploadCoachAudio(blob, scopeKey, opts);
        if (!url) {
          setError("Upload failed — check Firebase storage configuration.");
          return null;
        }
        onAttach(url, durationSec);
        clearPreview();
        setRecording(false);
        return url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        return null;
      } finally {
        setUploading(false);
      }
    }

    const finalizeForSave = useCallback(async (): Promise<AttachedVoice | null> => {
      if (attachedRef.current?.url) {
        return attachedRef.current;
      }

      let blob: Blob | null = null;
      let durationSec = 0;

      if (recording) {
        const stopped = await stopRecordingAsync();
        if (stopped) {
          blob = stopped.blob;
          durationSec = stopped.durationSec;
          setPreviewDurationSec(durationSec);
        }
      } else if (previewUrl) {
        const res = await fetch(previewUrl);
        blob = await res.blob();
        durationSec = previewDurationSec || elapsedSec || 1;
      }

      if (!blob || !scopeKey) return null;

      const url = await uploadBlob(blob, durationSec);
      return url ? { url, durationSec } : null;
    }, [
      elapsedSec,
      previewDurationSec,
      previewUrl,
      recording,
      scopeKey,
      stopRecordingAsync,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        finalizeForSave,
        isRecording: () => recording,
        isUploading: () => uploading,
      }),
      [finalizeForSave, recording, uploading],
    );

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

        recorderRef.current = recorder;
        recorder.start(250);
        setRecording(true);
        elapsedRef.current = 0;
        setElapsedSec(0);
        timerRef.current = setInterval(() => {
          elapsedRef.current += 1;
          setElapsedSec(elapsedRef.current);
          if (elapsedRef.current >= MAX_DURATION_SEC) {
            void stopRecordingAsync().then((stopped) => {
              if (stopped) {
                const url = URL.createObjectURL(stopped.blob);
                setPreviewUrl(url);
                setPreviewDurationSec(stopped.durationSec);
              }
            });
          }
        }, 1000);
      } catch {
        setError("Microphone access denied or unavailable.");
        stopStream();
      }
    }

    async function stopRecording() {
      const stopped = await stopRecordingAsync();
      if (stopped) {
        const url = URL.createObjectURL(stopped.blob);
        setPreviewUrl(url);
        setPreviewDurationSec(stopped.durationSec);
      }
    }

    async function attachPreview() {
      if (!previewUrl || !scopeKey) return;
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      await uploadBlob(blob, previewDurationSec || elapsedSec || 1);
    }

    async function handleFilePick(file: File | null) {
      if (!file || !scopeKey) return;
      if (file.size > COACH_AUDIO_MAX_BYTES) {
        setError("Audio file is too large (max 5 MB).");
        return;
      }
      setError(null);
      clearPreview();
      onClear();
      await uploadBlob(file, 0);
    }

    function handleClearAttached() {
      onClear();
      clearPreview();
      setError(null);
      setRecording(false);
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
              disabled={disabled || uploading}
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
              <>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => void startRecording()}
                  className="rounded-lg border border-[var(--brand-diet)]/40 px-3 py-1.5 text-xs text-[var(--brand-diet)] disabled:opacity-40"
                >
                  Record voice note
                </button>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Upload file
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => void handleFilePick(e.target.files?.[0] ?? null)}
                />
              </>
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

        {uploading && (
          <p className="mt-2 text-xs text-white/50">Uploading voice note…</p>
        )}

        {error && (
          <p className="mt-2 text-xs text-amber-300" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

VoiceNoteRecorder.displayName = "VoiceNoteRecorder";
