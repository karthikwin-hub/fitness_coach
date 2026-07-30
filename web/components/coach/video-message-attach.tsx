"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useAuthHeaders } from "@/lib/api/client";
import { uploadCoachVideo } from "@/lib/firebase/storage-upload";

const MAX_DURATION_SEC = 180;
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

type AttachedVideo = {
  url: string;
};

type VideoMessageAttachProps = {
  uploadScope: string;
  attached?: AttachedVideo | null;
  onAttach: (url: string) => void;
  onClear: () => void;
  disabled?: boolean;
  label?: string;
  urlFallback?: string;
  onUrlFallbackChange?: (url: string) => void;
};

function pickVideoMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoMessageAttach({
  uploadScope,
  attached,
  onAttach,
  onClear,
  disabled = false,
  label = "Video message",
  urlFallback = "",
  onUrlFallbackChange,
}: VideoMessageAttachProps) {
  const { firebaseUser } = useAuth();
  const getHeaders = useAuthHeaders();
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearPreview = useCallback(() => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setElapsedSec(0);
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopStream();
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, stopStream]);

  async function uploadBlob(blob: Blob) {
    setUploading(true);
    setError(null);
    try {
      const authHeaders = await getHeaders();
      const url = await uploadCoachVideo(blob, uploadScope, {
        authHeaders,
        preferServer: !firebaseUser,
      });
      if (!url) {
        setError("Upload failed — check Firebase storage configuration.");
        return;
      }
      onAttach(url);
      clearPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    if (disabled || typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser.");
      return;
    }

    setError(null);
    clearPreview();
    onClear();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      const mimeType = pickVideoMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        setPreviewUrl(URL.createObjectURL(blob));
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
      setError("Camera access denied or unavailable.");
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

  async function handleFilePick(file: File | null) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Video file is too large (max 50 MB).");
      return;
    }
    setError(null);
    clearPreview();
    onClear();
    await uploadBlob(file);
  }

  const displayUrl = attached?.url || (urlFallback.trim() ? urlFallback.trim() : null);

  if (attached?.url) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-white/50">{label}</p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onClear();
              clearPreview();
              setError(null);
            }}
            className="text-xs text-white/40 hover:text-white/70 disabled:opacity-40"
          >
            Remove
          </button>
        </div>
        <video controls className="mt-2 max-h-48 w-full rounded-lg" src={attached.url}>
          <track kind="captions" />
        </video>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/50">{label}</p>

      {previewUrl ? (
        <div className="mt-2 space-y-2">
          <video controls className="max-h-48 w-full rounded-lg" src={previewUrl}>
            <track kind="captions" />
          </video>
          <p className="text-[10px] text-white/40">Preview · {formatDuration(elapsedSec)}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={async () => {
                const res = await fetch(previewUrl);
                const blob = await res.blob();
                await uploadBlob(blob);
              }}
              className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              {uploading ? "Uploading…" : "Attach video"}
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
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {!recording ? (
              <>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void startRecording()}
                  className="rounded-lg border border-[var(--brand-diet)]/40 px-3 py-1.5 text-xs text-[var(--brand-diet)] disabled:opacity-40"
                >
                  Record video
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-xs"
                >
                  Upload file
                </button>
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
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => void handleFilePick(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {onUrlFallbackChange && (
        <label className="mt-3 block text-xs text-white/50">
          Video URL (optional)
          <input
            value={urlFallback}
            onChange={(e) => onUrlFallbackChange(e.target.value)}
            placeholder="https://…"
            disabled={disabled || Boolean(attached?.url)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
          />
        </label>
      )}

      {!attached?.url && urlFallback.trim() && displayUrl && (
        <video controls className="mt-2 max-h-48 w-full rounded-lg" src={displayUrl}>
          <track kind="captions" />
        </video>
      )}

      {error && (
        <p className="mt-2 text-xs text-amber-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
