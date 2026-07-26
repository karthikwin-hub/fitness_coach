"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { ABSTRACK_BRAND, type AccentMode, type TenantBranding } from "@/lib/brand";
import { coachCopy } from "@/lib/copy/coach-portal";

type CalendarSettings = {
  preferredMeetingType: "none" | "in_person" | "google_meet" | "zoom" | "whatsapp";
  defaultLocation: string;
  defaultZoomUrl: string;
  defaultWhatsappUrl: string;
  timeZone: string;
  googleConfigured: boolean;
  googleConnected: boolean;
  googleEmail: string | null;
};

export default function CoachSettingsPage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachSettingsContent />
    </RequireAuth>
  );
}

function CoachSettingsContent() {
  const getHeaders = useAuthHeaders();
  const [branding, setBranding] = useState<TenantBranding>({
    accentMode: "dual",
    primary: ABSTRACK_BRAND.colors.turquoise,
    accentWorkout: ABSTRACK_BRAND.colors.teal,
    accentDiet: ABSTRACK_BRAND.colors.green,
  });
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastAudio, setBroadcastAudio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>({
    preferredMeetingType: "none",
    defaultLocation: "",
    defaultZoomUrl: "",
    defaultWhatsappUrl: "",
    timeZone: "Europe/London",
    googleConfigured: false,
    googleConnected: false,
    googleEmail: null,
  });
  const [calendarError, setCalendarError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      authFetch("/api/tenant/branding", {}, getHeaders).then((r) => r.json()),
      authFetch("/api/coach/broadcast", {}, getHeaders).then((r) => r.json()),
      authFetch("/api/coach/calendar/settings", {}, getHeaders).then((r) => r.json()),
    ]).then(([brandData, broadcastData, calendarData]) => {
      if (brandData?.branding) setBranding(brandData.branding);
      if (broadcastData?.active) {
        setBroadcastBody(broadcastData.active.body ?? "");
        setBroadcastAudio(broadcastData.active.audioUrl ?? "");
      }
      if (!calendarData?.error) {
        setCalendarSettings(calendarData);
      }
    });
  }, [getHeaders]);

  async function saveAll(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await authFetch("/api/tenant/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branding),
    }, getHeaders);
    await authFetch("/api/coach/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: broadcastBody,
        audioUrl: broadcastAudio || null,
        active: broadcastBody.trim().length > 0,
      }),
    }, getHeaders);
    const calendarResponse = await authFetch(
      "/api/coach/calendar/settings",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(calendarSettings),
      },
      getHeaders,
    );
    if (!calendarResponse.ok) {
      const data = await calendarResponse.json().catch(() => ({}));
      setCalendarError(data.error ?? "Could not save calendar settings.");
    } else {
      setCalendarError(null);
    }
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="coach-atmosphere min-h-dvh text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <h1 className="font-heading text-xl">{coachCopy.settingsTitle}</h1>
      </header>

      <form onSubmit={saveAll} className="mx-auto max-w-lg space-y-8 px-4 py-6">
        <section className="space-y-3 rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
          <h2 className="font-heading text-sm">Accent mode</h2>
          <div className="flex gap-2">
            {(["dual", "single"] as AccentMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setBranding((b) => ({ ...b, accentMode: mode }))}
                className={`rounded-full px-4 py-2 text-sm capitalize ${
                  branding.accentMode === mode
                    ? "bg-[var(--brand-diet)] text-[var(--brand-dark)]"
                    : "border border-white/15"
                }`}
              >
                {mode === "dual" ? "Dual (workout + diet)" : "Single accent"}
              </button>
            ))}
          </div>

          <label className="block text-xs text-white/50">Primary brand color</label>
          <input
            type="color"
            value={branding.primary ?? ABSTRACK_BRAND.colors.turquoise}
            onChange={(e) => setBranding((b) => ({ ...b, primary: e.target.value }))}
            className="h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent"
          />

          {branding.accentMode !== "single" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-white/50">
                Workout accent
                <input
                  type="color"
                  value={branding.accentWorkout ?? ABSTRACK_BRAND.colors.teal}
                  onChange={(e) => setBranding((b) => ({ ...b, accentWorkout: e.target.value }))}
                  className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent"
                />
              </label>
              <label className="block text-xs text-white/50">
                Nutrition accent
                <input
                  type="color"
                  value={branding.accentDiet ?? ABSTRACK_BRAND.colors.green}
                  onChange={(e) => setBranding((b) => ({ ...b, accentDiet: e.target.value }))}
                  className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent"
                />
              </label>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
          <h2 className="font-heading text-sm">Calendar and meeting defaults</h2>
          <p className="text-xs text-white/50">
            These defaults are used when a member books. Connecting the same
            Google Calendar used by Cal.com prevents double-booking.
          </p>
          <label className="block text-xs text-white/50">
            Preferred meeting type
            <select
              value={calendarSettings.preferredMeetingType}
              onChange={(event) =>
                setCalendarSettings((current) => ({
                  ...current,
                  preferredMeetingType: event.target
                    .value as CalendarSettings["preferredMeetingType"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
            >
              <option value="none">No location / link</option>
              <option value="in_person">In person</option>
              <option value="google_meet">Google Meet</option>
              <option value="zoom">Zoom</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>
          <label className="block text-xs text-white/50">
            Default in-person location
            <input
              value={calendarSettings.defaultLocation}
              onChange={(event) =>
                setCalendarSettings((current) => ({
                  ...current,
                  defaultLocation: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
              placeholder="Gym or studio address"
            />
          </label>
          <label className="block text-xs text-white/50">
            Default Zoom link
            <input
              type="url"
              value={calendarSettings.defaultZoomUrl}
              onChange={(event) =>
                setCalendarSettings((current) => ({
                  ...current,
                  defaultZoomUrl: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
              placeholder="https://zoom.us/j/…"
            />
          </label>
          <label className="block text-xs text-white/50">
            Default WhatsApp invite link
            <input
              type="url"
              value={calendarSettings.defaultWhatsappUrl}
              onChange={(event) =>
                setCalendarSettings((current) => ({
                  ...current,
                  defaultWhatsappUrl: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
              placeholder="https://wa.me/…"
            />
          </label>
          <label className="block text-xs text-white/50">
            Time zone
            <input
              value={calendarSettings.timeZone}
              onChange={(event) =>
                setCalendarSettings((current) => ({
                  ...current,
                  timeZone: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
              placeholder="Europe/London"
            />
          </label>
          {calendarSettings.googleConnected ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--brand-diet)]/30 p-3 text-xs">
              <span>
                Google connected
                {calendarSettings.googleEmail
                  ? `: ${calendarSettings.googleEmail}`
                  : ""}
              </span>
              <button
                type="button"
                onClick={async () => {
                  const response = await authFetch(
                    "/api/coach/calendar/settings",
                    { method: "DELETE" },
                    getHeaders,
                  );
                  if (response.ok) {
                    setCalendarSettings((current) => ({
                      ...current,
                      googleConnected: false,
                      googleEmail: null,
                    }));
                  }
                }}
                className="text-red-300"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!calendarSettings.googleConfigured}
              onClick={async () => {
                const response = await authFetch(
                  "/api/coach/calendar/google/connect",
                  {},
                  getHeaders,
                );
                const data = await response.json().catch(() => ({}));
                if (response.ok && data.url) {
                  window.location.assign(data.url);
                } else {
                  setCalendarError(
                    data.error ?? "Google Calendar is not configured.",
                  );
                }
              }}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm text-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Connect Google Calendar
            </button>
          )}
          {!calendarSettings.googleConfigured && (
            <p className="text-xs text-amber-300/80">
              Add Google OAuth credentials to the server environment to enable
              connection.
            </p>
          )}
          {calendarError && (
            <p className="text-xs text-red-400">{calendarError}</p>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
          <h2 className="font-heading text-sm">{coachCopy.broadcastTitle}</h2>
          <p className="text-xs text-white/50">{coachCopy.broadcastHint}</p>
          <textarea
            rows={4}
            value={broadcastBody}
            onChange={(e) => {
              setBroadcastBody(e.target.value);
              setSaved(false);
            }}
            placeholder="Share a mindset note, weekly focus, or celebration…"
            className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
          />
          <label className="block text-xs text-white/50">
            Audio URL (optional)
            <input
              value={broadcastAudio}
              onChange={(e) => setBroadcastAudio(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
            />
          </label>
        </section>

        <section className="space-y-3 rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
          <h2 className="font-heading text-sm">How-to guide</h2>
          <p className="text-xs text-white/50">
            Plain-language PDF for you and your clients (coach, active member, new member). Members cannot download this — share verbally or send pages yourself if helpful.
          </p>
          <button
            type="button"
            onClick={async () => {
              const res = await authFetch("/api/coach/user-guide", {}, getHeaders);
              if (!res.ok) {
                setGuideError("Could not download the guide. Please try again.");
                return;
              }
              setGuideError(null);
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "abstrack-how-to-guide.pdf";
              a.rel = "noopener";
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
            className="rounded-xl border border-white/20 px-4 py-2.5 text-sm text-white/90 hover:bg-white/5"
          >
            Download how-to guide (PDF)
          </button>
          {guideError && <p className="text-xs text-red-400">{guideError}</p>}
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[var(--brand-diet)] px-6 py-3 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && <span className="text-sm text-[var(--brand-diet)]">{coachCopy.noteSaved}</span>}
        </div>
      </form>
    </div>
  );
}
