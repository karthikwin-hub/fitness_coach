"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthHeaders, authFetchJson } from "@/lib/api/client";
import { VoiceNoteRecorder } from "@/components/coach/voice-note-recorder";
import { VideoMessageAttach } from "@/components/coach/video-message-attach";
import { coachCopy } from "@/lib/copy/coach-portal";
import { formatBroadcastActiveBadge } from "@/lib/coach/broadcast-validate";
import type { BroadcastExpiresPreset } from "@/lib/coach/broadcast-expiry";
import { isBroadcastVisible } from "@/lib/coach/broadcast-expiry";

type BroadcastRow = {
  id: string;
  body: string;
  audioUrl: string | null;
  videoUrl: string | null;
  expiresAt: string | null;
  active: boolean;
};

type ExpiresPreset = BroadcastExpiresPreset;

function formatExpiry(iso: string | null): string {
  if (!iso) return "No expiry set";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CoachBroadcastPanel() {
  const getHeaders = useAuthHeaders();
  const [expanded, setExpanded] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [audioAttached, setAudioAttached] = useState<{ url: string; durationSec: number } | null>(
    null,
  );
  const [videoAttached, setVideoAttached] = useState<{ url: string } | null>(null);
  const [expiresPreset, setExpiresPreset] = useState<ExpiresPreset>("48h");
  const [customExpiresAt, setCustomExpiresAt] = useState("");
  const [activeExpiresAt, setActiveExpiresAt] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);
  const [lastWhatsAppSummary, setLastWhatsAppSummary] = useState<string | null>(null);

  const uploadScope = tenantId ? `broadcasts/${tenantId}` : null;

  const loadBroadcast = useCallback(async () => {
    const { data, error: fetchError } = await authFetchJson<{
      tenantId: string;
      active: BroadcastRow | null;
    }>("/api/coach/broadcast", {}, getHeaders);

    if (fetchError) {
      setError(fetchError);
      return;
    }
    if (!data) return;

    setTenantId(data.tenantId);
    const active = data.active;
    if (active?.active) {
      setBody(active.body ?? "");
function isStoredCoachMediaUrl(url: string): boolean {
  return (
    url.includes("firebasestorage") ||
    url.includes("storage.googleapis.com") ||
    url.startsWith("data:") ||
    url.startsWith("dev://")
  );
}

      setAudioUrl(active.audioUrl?.startsWith("http") && !isStoredCoachMediaUrl(active.audioUrl) ? active.audioUrl : "");
      setVideoUrl(active.videoUrl?.startsWith("http") && !isStoredCoachMediaUrl(active.videoUrl) ? active.videoUrl : "");
      setAudioAttached(
        active.audioUrl && isStoredCoachMediaUrl(active.audioUrl)
          ? { url: active.audioUrl, durationSec: 0 }
          : null,
      );
      setVideoAttached(
        active.videoUrl && isStoredCoachMediaUrl(active.videoUrl)
          ? { url: active.videoUrl }
          : null,
      );
      setActiveExpiresAt(active.expiresAt);
      setIsActive(isBroadcastVisible(active.active, active.expiresAt ? new Date(active.expiresAt) : null));
      if (active.expiresAt) {
        const hoursUntil =
          (new Date(active.expiresAt).getTime() - Date.now()) / (60 * 60 * 1000);
        if (hoursUntil > 0 && hoursUntil <= 25) setExpiresPreset("24h");
        else if (hoursUntil > 25 && hoursUntil <= 49) setExpiresPreset("48h");
        else {
          setExpiresPreset("custom");
          setCustomExpiresAt(toDatetimeLocalValue(active.expiresAt));
        }
      }
    } else {
      setIsActive(false);
      setActiveExpiresAt(null);
    }
    setError(null);
  }, [getHeaders]);

  useEffect(() => {
    void loadBroadcast();
  }, [loadBroadcast]);

  async function publish() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const resolvedAudio = (audioAttached?.url ?? audioUrl.trim()) || null;
    const resolvedVideo = (videoAttached?.url ?? videoUrl.trim()) || null;

    const { data, error: saveError } = await authFetchJson<{
      whatsapp?: { attempted: number; sent: number; dryRun: number; skipped: number };
    }>(
      "/api/coach/broadcast",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          audioUrl: resolvedAudio,
          videoUrl: resolvedVideo,
          active: true,
          notifyWhatsApp,
          expiresPreset,
          expiresAt: expiresPreset === "custom" ? new Date(customExpiresAt).toISOString() : undefined,
        }),
      },
      getHeaders,
    );

    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    if (data?.whatsapp) {
      const { attempted, sent, dryRun, skipped } = data.whatsapp;
      if (attempted === 0 && skipped > 0) {
        setLastWhatsAppSummary("No opted-in members with a valid phone number.");
      } else if (dryRun > 0 && sent === 0) {
        setLastWhatsAppSummary(
          `WhatsApp dry-run: ${dryRun} message(s) logged (set WHATSAPP_CLOUD_ACCESS_TOKEN to send automatically).`,
        );
      } else {
        setLastWhatsAppSummary(`WhatsApp sent to ${sent} member(s).`);
      }
    } else {
      setLastWhatsAppSummary(null);
    }
    setSaved(true);
    await loadBroadcast();
  }

  async function clearNote() {
    setClearing(true);
    setError(null);
    const { error: clearError } = await authFetchJson(
      "/api/coach/broadcast",
      { method: "DELETE" },
      getHeaders,
    );
    setClearing(false);
    if (clearError) {
      setError(clearError);
      return;
    }
    setBody("");
    setAudioUrl("");
    setVideoUrl("");
    setAudioAttached(null);
    setVideoAttached(null);
    setIsActive(false);
    setActiveExpiresAt(null);
    setSaved(false);
  }

  const statusLine = isActive && activeExpiresAt
    ? `Visible to members until ${formatExpiry(activeExpiresAt)}`
    : activeExpiresAt && !isActive
      ? "Note expired — publish again to show on member dashboards"
      : null;

  const activeBadge = isActive ? formatBroadcastActiveBadge(activeExpiresAt) : null;

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-[var(--brand-dark-surface)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-white/[0.02]"
        aria-expanded={expanded}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-sm">{coachCopy.broadcastTitle}</h2>
            {activeBadge && (
              <span className="rounded-full bg-[var(--brand-diet)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--brand-diet)]">
                {activeBadge}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-white/50">{coachCopy.broadcastHint}</p>
          {!expanded && statusLine && (
            <p className="mt-1 text-xs text-white/40">{statusLine}</p>
          )}
        </div>
        <span className="shrink-0 text-xs text-white/40" aria-hidden>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-white/10 p-4 pt-3">
          <p className="text-xs text-white/45">
            Combine text, audio, and/or video — at least one required to publish.
          </p>

          <textarea
            rows={3}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setSaved(false);
            }}
            placeholder="Share a mindset note, weekly focus, or celebration…"
            className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
          />

          {uploadScope && (
            <VoiceNoteRecorder
              uploadScope={uploadScope}
              attached={audioAttached}
              onAttach={(url, durationSec) => {
                setAudioAttached({ url, durationSec });
                setAudioUrl("");
                setSaved(false);
              }}
              onClear={() => {
                setAudioAttached(null);
                setSaved(false);
              }}
              disabled={saving || clearing}
              label="Audio message"
            />
          )}

          <label className="block text-xs text-white/50">
            Audio URL (optional)
            <input
              value={audioUrl}
              onChange={(e) => {
                setAudioUrl(e.target.value);
                setAudioAttached(null);
                setSaved(false);
              }}
              placeholder="https://…"
              disabled={Boolean(audioAttached?.url)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm disabled:opacity-50"
            />
          </label>

          {uploadScope && (
            <VideoMessageAttach
              uploadScope={uploadScope}
              attached={videoAttached}
              onAttach={(url) => {
                setVideoAttached({ url });
                setVideoUrl("");
                setSaved(false);
              }}
              onClear={() => {
                setVideoAttached(null);
                setSaved(false);
              }}
              disabled={saving || clearing}
              label="Video message"
              urlFallback={videoUrl}
              onUrlFallbackChange={(url) => {
                setVideoUrl(url);
                setVideoAttached(null);
                setSaved(false);
              }}
            />
          )}

          <fieldset className="space-y-2">
            <legend className="text-xs text-white/50">Visible on member dashboards for</legend>
            <div className="flex flex-wrap gap-3 text-sm">
              {(["24h", "48h", "custom"] as ExpiresPreset[]).map((preset) => (
                <label key={preset} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="broadcast-expires"
                    checked={expiresPreset === preset}
                    onChange={() => {
                      setExpiresPreset(preset);
                      setSaved(false);
                    }}
                  />
                  {preset === "24h" ? "24 hours" : preset === "48h" ? "48 hours" : "Custom"}
                </label>
              ))}
            </div>
            {expiresPreset === "custom" && (
              <input
                type="datetime-local"
                value={customExpiresAt}
                onChange={(e) => {
                  setCustomExpiresAt(e.target.value);
                  setSaved(false);
                }}
                className="rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
              />
            )}
          </fieldset>

          <label className="flex items-start gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={notifyWhatsApp}
              onChange={(e) => {
                setNotifyWhatsApp(e.target.checked);
                setSaved(false);
              }}
              className="mt-1"
            />
            <span>
              Also notify members on WhatsApp who opted in (requires phone in E.164 format, e.g.{" "}
              <span className="text-white/50">+91…</span>).
            </span>
          </label>

          {statusLine && <p className="text-xs text-white/40">{statusLine}</p>}
          {lastWhatsAppSummary && (
            <p className="text-xs text-[var(--brand-diet)]">{lastWhatsAppSummary}</p>
          )}
          {error && (
            <p className="text-xs text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={saving || clearing}
              onClick={() => void publish()}
              className="rounded-lg bg-[var(--brand-diet)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
            >
              {saving ? "Publishing…" : "Publish note"}
            </button>
            <button
              type="button"
              disabled={saving || clearing}
              onClick={() => void clearNote()}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
            >
              {clearing ? "Clearing…" : "Clear note"}
            </button>
            {saved && <span className="text-xs text-[var(--brand-diet)]">{coachCopy.noteSaved}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
