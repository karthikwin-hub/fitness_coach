"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { coachCopy } from "@/lib/copy/coach-portal";
import { ABSTRACK_BRAND, type AccentMode, type TenantBranding } from "@/lib/brand";

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

  useEffect(() => {
    Promise.all([
      authFetch("/api/tenant/branding", {}, getHeaders).then((r) => r.json()),
      authFetch("/api/coach/broadcast", {}, getHeaders).then((r) => r.json()),
    ]).then(([brandData, broadcastData]) => {
      if (brandData?.branding) setBranding(brandData.branding);
      if (broadcastData?.active) {
        setBroadcastBody(broadcastData.active.body ?? "");
        setBroadcastAudio(broadcastData.active.audioUrl ?? "");
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
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="coach-atmosphere min-h-dvh text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <Link href="/coach" className="text-xs text-white/50">← Command center</Link>
        <h1 className="font-display mt-2 text-xl">{coachCopy.settingsTitle}</h1>
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
