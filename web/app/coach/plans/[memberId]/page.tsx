"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPlanDeliveryNav } from "@/components/coach/coach-plan-delivery-nav";
import { VoiceNoteRecorder } from "@/components/coach/voice-note-recorder";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { formatMemberName } from "@/lib/members/types";

type PlanRow = { id: string; weekNumber: number; status: string };

type DeliveryRow = {
  id: string;
  weekLabel: string;
  expiresAt: string;
  revokedAt: string | null;
  emailSentAt: string | null;
  whatsappSentAt: string | null;
  firstOpenedAt: string | null;
  openCount: number;
  createdAt: string;
};

type PreparedDelivery = {
  delivery: { id: string; weekLabel: string; expiresAt: string; createdAt: string };
  token: string;
  urls: { viewerUrl: string; pdfUrl: string; baseUrl: string };
  snapshot: {
    memberEmail: string;
    memberPhone: string | null;
    memberFirstName: string | null;
    brandName: string;
    coachName: string | null;
    weekLabel: string;
  };
};

export default function MemberPlanHubPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const getHeaders = useAuthHeaders();
  const [trainingPlans, setTrainingPlans] = useState<PlanRow[]>([]);
  const [nutritionPlans, setNutritionPlans] = useState<PlanRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [prepared, setPrepared] = useState<PreparedDelivery | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<{
    url: string;
    durationSec: number;
  } | null>(null);

  const load = useCallback(async () => {
    const [t, n, d, profile] = await Promise.all([
      authFetch(`/api/training-plans?memberId=${memberId}`, {}, getHeaders).then((r) =>
        r.json(),
      ),
      authFetch(`/api/nutrition-plans?memberId=${memberId}`, {}, getHeaders).then((r) =>
        r.json(),
      ),
      authFetch(`/api/plan-deliveries?memberId=${memberId}`, {}, getHeaders).then((r) =>
        r.json(),
      ),
      authFetch(`/api/members/${memberId}`, {}, getHeaders).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]);
    setTrainingPlans(Array.isArray(t) ? t : []);
    setNutritionPlans(Array.isArray(n) ? n : []);
    setDeliveries(d.deliveries ?? []);
    if (profile) {
      setClientName(
        formatMemberName({
          firstName: profile.firstName ?? null,
          lastName: profile.lastName ?? null,
          displayName: profile.displayName ?? null,
          email: profile.email ?? "",
        }),
      );
    }
  }, [memberId, getHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const publishedTraining = trainingPlans.find((p) => p.status === "published");
  const publishedNutrition = nutritionPlans.find((p) => p.status === "published");

  async function prepareDelivery() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await authFetch(
        "/api/plan-deliveries",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId,
            coachVoiceNoteUrl: voiceNote?.url ?? null,
            coachVoiceNoteDurationSec: voiceNote?.durationSec ?? null,
          }),
        },
        getHeaders,
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to prepare delivery");
        return;
      }
      setPrepared(body as PreparedDelivery);
      setMessage(`Prepared ${body.delivery.weekLabel}. Preview, then send.`);
      setVoiceNote(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    if (!prepared) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/plan-deliveries/${prepared.delivery.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send_email", token: prepared.token }),
        },
        getHeaders,
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Email failed");
        return;
      }
      setMessage(
        body.dryRun
          ? `Email dry-run to ${prepared.snapshot.memberEmail} (set RESEND_API_KEY to send for real)`
          : `Email sent to ${prepared.snapshot.memberEmail}`,
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function sendWhatsApp() {
    if (!prepared) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/plan-deliveries/${prepared.delivery.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "whatsapp_link", token: prepared.token }),
        },
        getHeaders,
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "WhatsApp link failed");
        return;
      }
      window.open(body.url, "_blank", "noopener,noreferrer");
      await authFetch(
        `/api/plan-deliveries/${prepared.delivery.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_whatsapp_sent" }),
        },
        getHeaders,
      );
      setMessage("WhatsApp opened — send the pre-filled message.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!prepared) return;
    await navigator.clipboard.writeText(prepared.urls.viewerUrl);
    setMessage("Viewer link copied.");
  }

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/plan-deliveries/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "revoke" }),
        },
        getHeaders,
      );
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Revoke failed");
        return;
      }
      if (prepared?.delivery.id === id) setPrepared(null);
      setMessage("Delivery revoked.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
        <header className="border-b border-white/10 px-4 py-4">
          <p className="text-xs text-[var(--brand-diet)]">
            Plan delivery for {clientName ?? "client"}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-xl">
                {clientName ? `${clientName}'s plans` : "Client plans"}
              </h1>
              <p className="text-sm text-white/60">
                Build, publish, and deliver this client&apos;s training and nutrition weeks
              </p>
            </div>
            <Link
              href={`/coach/members/${memberId}`}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70"
            >
              View profile
            </Link>
          </div>
          <div className="mt-4">
            <CoachPlanDeliveryNav />
          </div>
        </header>
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
          <section>
            <h2 className="font-heading text-sm text-[var(--brand-workout)]">Training</h2>
            <ul className="mt-2 space-y-2">
              {trainingPlans.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] px-4 py-3 text-sm"
                >
                  <span>Week {p.weekNumber}</span>
                  <span className="text-xs uppercase text-white/40">{p.status}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`/coach/plans/${memberId}/training`}
              className="mt-3 inline-block rounded-xl bg-[var(--brand-workout)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]"
            >
              Open training builder
            </Link>
          </section>
          <section>
            <h2 className="font-heading text-sm text-[var(--brand-diet)]">Nutrition</h2>
            <ul className="mt-2 space-y-2">
              {nutritionPlans.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] px-4 py-3 text-sm"
                >
                  <span>Week {p.weekNumber}</span>
                  <span className="text-xs uppercase text-white/40">{p.status}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`/coach/plans/${memberId}/nutrition`}
              className="mt-3 inline-block rounded-xl bg-[var(--brand-diet)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]"
            >
              Open nutrition builder
            </Link>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
            <h2 className="font-heading text-sm text-white">Deliver plan</h2>
            <p className="mt-1 text-xs text-white/50">
              Packages the currently published training and nutrition weeks into one PDF,
              then send via email or WhatsApp.
            </p>
            <div className="mt-3 space-y-1 text-sm text-white/70">
              <p>
                Training:{" "}
                {publishedTraining
                  ? `Week ${publishedTraining.weekNumber} (published)`
                  : "None published"}
              </p>
              <p>
                Nutrition:{" "}
                {publishedNutrition
                  ? `Week ${publishedNutrition.weekNumber} (published)`
                  : "None published"}
              </p>
            </div>

            <div className="mt-4">
              <VoiceNoteRecorder
                memberId={memberId}
                attached={voiceNote}
                onAttach={(url, durationSec) => setVoiceNote({ url, durationSec })}
                onClear={() => setVoiceNote(null)}
                disabled={busy || !!prepared}
                label="Optional voice note for this delivery"
              />
            </div>

            <button
              type="button"
              disabled={busy || (!publishedTraining && !publishedNutrition)}
              onClick={() => void prepareDelivery()}
              className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              {busy ? "Working…" : "Prepare delivery"}
            </button>

            {prepared && (
              <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-medium">{prepared.delivery.weekLabel} ready</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={prepared.urls.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs"
                  >
                    Preview PDF
                  </a>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void copyLink()}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs"
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void sendEmail()}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs"
                  >
                    Send email
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void sendWhatsApp()}
                    className="rounded-lg bg-[#25D366]/20 px-3 py-1.5 text-xs text-[#25D366]"
                  >
                    Send on WhatsApp
                  </button>
                </div>
                <p className="text-xs text-white/40">
                  To: {prepared.snapshot.memberEmail}
                  {prepared.snapshot.memberPhone
                    ? ` · ${prepared.snapshot.memberPhone}`
                    : " · no phone on profile"}
                </p>
              </div>
            )}

            {message && (
              <p className="mt-3 text-xs text-[var(--brand-diet)]">{message}</p>
            )}
            {error && <p className="mt-3 text-xs text-amber-300">{error}</p>}

            {deliveries.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs uppercase tracking-wide text-white/40">
                  Delivery history
                </h3>
                <ul className="mt-2 space-y-2">
                  {deliveries.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-medium text-white/80">{d.weekLabel}</p>
                        <p className="text-white/40">
                          {new Date(d.createdAt).toLocaleString()}
                          {d.emailSentAt ? " · email" : ""}
                          {d.whatsappSentAt ? " · WhatsApp" : ""}
                          {d.firstOpenedAt
                            ? ` · opened ×${d.openCount}`
                            : " · not opened"}
                          {d.revokedAt ? " · REVOKED" : ""}
                        </p>
                      </div>
                      {!d.revokedAt && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void revoke(d.id)}
                          className="rounded border border-amber-400/40 px-2 py-1 text-amber-200"
                        >
                          Revoke
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </RequireAuth>
  );
}
