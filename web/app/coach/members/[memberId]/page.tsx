"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuthHeaders, authFetchJson } from "@/lib/api/client";
import { formatMemberName, type MemberProfile } from "@/lib/members/types";
import { MemberCheckInHistory } from "@/components/coach/member-check-in-history";
import { MemberDiarySummary } from "@/components/coach/member-diary-summary";
import { MessageThread } from "@/components/member/message-thread";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-white/50">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm";

export default function CoachMemberProfilePage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachMemberProfileContent />
    </RequireAuth>
  );
}

function CoachMemberProfileContent() {
  const params = useParams();
  const memberId =
    typeof params.memberId === "string"
      ? params.memberId
      : Array.isArray(params.memberId)
        ? params.memberId[0]
        : undefined;
  const getHeaders = useAuthHeaders();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [goalsText, setGoalsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      setLoadError("Invalid member link.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    authFetchJson<MemberProfile>(`/api/members/${memberId}`, {}, getHeaders)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error);
          setProfile(null);
          return;
        }
        if (data) {
          setProfile(data);
          setGoalsText(data.healthGoals.join("\n"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [memberId, getHeaders]);

  function updateField<K extends keyof MemberProfile>(key: K, value: MemberProfile[K]) {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { data: updated, error } = await authFetchJson<MemberProfile>(
      `/api/members/${memberId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          healthGoals: goalsText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      },
      getHeaders,
    );
    if (updated) {
      setProfile(updated);
      setGoalsText(updated.healthGoals.join("\n"));
      setSaved(true);
    } else if (error) {
      setLoadError(error);
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="px-4 py-6 text-white/50">Loading profile…</p>;
  }

  if (!profile) {
    return (
      <p className="px-4 py-6 text-white/50">
        {loadError ?? "Member not found."}
      </p>
    );
  }

  const fullName = formatMemberName(profile);

  return (
      <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
        <header className="border-b border-white/10 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-xl">{fullName}</h1>
              <p className="text-sm text-white/50">{profile.email}</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase">
              {profile.status}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/coach/plans/${memberId}`}
              className="rounded-lg bg-[var(--brand-diet)] px-3 py-2 text-xs font-semibold text-[var(--brand-dark)]"
            >
              Plan delivery
            </Link>
            <span className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/60">
              Compliance {profile.compliancePct}% · Streak {profile.streakDays}d
            </span>
          </div>
        </header>

        <form onSubmit={saveProfile} className="mx-auto max-w-2xl space-y-8 px-4 py-6">
          <section className="space-y-3">
            <h2 className="font-heading text-sm text-[var(--brand-workout)]">Contact</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <input
                  className={inputClass}
                  value={profile.firstName ?? ""}
                  onChange={(e) => updateField("firstName", e.target.value || null)}
                />
              </Field>
              <Field label="Last name">
                <input
                  className={inputClass}
                  value={profile.lastName ?? ""}
                  onChange={(e) => updateField("lastName", e.target.value || null)}
                />
              </Field>
            </div>
            <Field label="Email">
              <input className={`${inputClass} text-white/50`} value={profile.email} readOnly />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={profile.phone ?? ""}
                onChange={(e) => updateField("phone", e.target.value || null)}
                placeholder="+1 555 0100"
              />
            </Field>
            <Field label="Address line 1">
              <input
                className={inputClass}
                value={profile.addressLine1 ?? ""}
                onChange={(e) => updateField("addressLine1", e.target.value || null)}
              />
            </Field>
            <Field label="Address line 2">
              <input
                className={inputClass}
                value={profile.addressLine2 ?? ""}
                onChange={(e) => updateField("addressLine2", e.target.value || null)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="City">
                <input
                  className={inputClass}
                  value={profile.city ?? ""}
                  onChange={(e) => updateField("city", e.target.value || null)}
                />
              </Field>
              <Field label="State / region">
                <input
                  className={inputClass}
                  value={profile.stateRegion ?? ""}
                  onChange={(e) => updateField("stateRegion", e.target.value || null)}
                />
              </Field>
              <Field label="Postal code">
                <input
                  className={inputClass}
                  value={profile.postalCode ?? ""}
                  onChange={(e) => updateField("postalCode", e.target.value || null)}
                />
              </Field>
              <Field label="Country">
                <input
                  className={inputClass}
                  value={profile.country ?? ""}
                  onChange={(e) => updateField("country", e.target.value || null)}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-sm text-[var(--brand-diet)]">Program</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status">
                <select
                  className={inputClass}
                  value={profile.status}
                  onChange={(e) =>
                    updateField("status", e.target.value as MemberProfile["status"])
                  }
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="lead">Lead</option>
                </select>
              </Field>
              <Field label="Location label">
                <input
                  className={inputClass}
                  value={profile.location ?? ""}
                  onChange={(e) => updateField("location", e.target.value || null)}
                  placeholder="USA, India, Australia…"
                />
              </Field>
              <Field label="Program start">
                <input
                  type="date"
                  className={inputClass}
                  value={profile.programStartDate ?? ""}
                  onChange={(e) => updateField("programStartDate", e.target.value || null)}
                />
              </Field>
              <Field label="Program end">
                <input
                  type="date"
                  className={inputClass}
                  value={profile.programEndDate ?? ""}
                  onChange={(e) => updateField("programEndDate", e.target.value || null)}
                />
              </Field>
              <Field label="Diet preference">
                <select
                  className={inputClass}
                  value={profile.dietPreference ?? ""}
                  onChange={(e) =>
                    updateField(
                      "dietPreference",
                      (e.target.value || null) as MemberProfile["dietPreference"],
                    )
                  }
                >
                  <option value="">—</option>
                  <option value="indian">Indian</option>
                  <option value="western">Western</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="vegetarian">Vegetarian</option>
                </select>
              </Field>
              <Field label="Daily step goal">
                <input
                  type="number"
                  className={inputClass}
                  value={profile.stepGoal ?? ""}
                  onChange={(e) =>
                    updateField("stepGoal", e.target.value ? Number(e.target.value) : null)
                  }
                />
              </Field>
            </div>
            {profile.programPhases.length > 0 && (
              <div className="mt-3 space-y-2 rounded-lg border border-white/10 p-3">
                <p className="text-xs text-white/50">Program phases (editable labels & dates)</p>
                {profile.programPhases.map((phase, index) => (
                  <div key={`${phase.label}-${index}`} className="grid gap-2 sm:grid-cols-3">
                    <input
                      className={inputClass}
                      value={phase.label}
                      onChange={(e) => {
                        const next = [...profile.programPhases];
                        next[index] = { ...phase, label: e.target.value };
                        updateField("programPhases", next);
                      }}
                    />
                    <input
                      type="date"
                      className={inputClass}
                      value={phase.startDate}
                      onChange={(e) => {
                        const next = [...profile.programPhases];
                        next[index] = { ...phase, startDate: e.target.value };
                        updateField("programPhases", next);
                      }}
                    />
                    <input
                      type="date"
                      className={inputClass}
                      value={phase.endDate}
                      onChange={(e) => {
                        const next = [...profile.programPhases];
                        next[index] = { ...phase, endDate: e.target.value };
                        updateField("programPhases", next);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-sm text-[var(--brand-diet)]">About</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date of birth">
                <input
                  type="date"
                  className={inputClass}
                  value={profile.dateOfBirth ?? ""}
                  onChange={(e) => updateField("dateOfBirth", e.target.value || null)}
                />
              </Field>
              <Field label="Occupation">
                <input
                  className={inputClass}
                  value={profile.occupation ?? ""}
                  onChange={(e) => updateField("occupation", e.target.value || null)}
                />
              </Field>
            </div>
            <Field label="Bio">
              <textarea
                className={`${inputClass} min-h-24`}
                value={profile.bio ?? ""}
                onChange={(e) => updateField("bio", e.target.value || null)}
                placeholder="Background, lifestyle, training history…"
              />
            </Field>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-sm text-amber-300">Health & goals</h2>
            <Field label="Goals (one per line)">
              <textarea
                className={`${inputClass} min-h-24`}
                value={goalsText}
                onChange={(e) => {
                  setGoalsText(e.target.value);
                  setSaved(false);
                }}
                placeholder="Fat loss&#10;Build strength&#10;Improve sleep"
              />
            </Field>
            <Field label="Health issues / injuries">
              <textarea
                className={`${inputClass} min-h-20`}
                value={profile.healthIssues ?? ""}
                onChange={(e) => updateField("healthIssues", e.target.value || null)}
                placeholder="Osteoporosis, lower back pain, post-surgery notes…"
              />
            </Field>
            <Field label="Allergies & dietary restrictions">
              <textarea
                className={`${inputClass} min-h-20`}
                value={profile.allergies ?? ""}
                onChange={(e) => updateField("allergies", e.target.value || null)}
              />
            </Field>
            <Field label="Medications">
              <textarea
                className={`${inputClass} min-h-20`}
                value={profile.medications ?? ""}
                onChange={(e) => updateField("medications", e.target.value || null)}
              />
            </Field>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-sm text-white/70">Emergency contact</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact name">
                <input
                  className={inputClass}
                  value={profile.emergencyContactName ?? ""}
                  onChange={(e) => updateField("emergencyContactName", e.target.value || null)}
                />
              </Field>
              <Field label="Contact phone">
                <input
                  className={inputClass}
                  value={profile.emergencyContactPhone ?? ""}
                  onChange={(e) => updateField("emergencyContactPhone", e.target.value || null)}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-sm text-white/70">Coach notes (private)</h2>
            <textarea
              className={`${inputClass} min-h-24`}
              value={profile.coachNotes ?? ""}
              onChange={(e) => updateField("coachNotes", e.target.value || null)}
              placeholder="Internal notes — not visible to member"
            />
          </section>

          <div className="flex items-center gap-3 pb-8">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[var(--brand-diet)] px-6 py-3 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
            {saved && <span className="text-sm text-[var(--brand-diet)]">Saved</span>}
          </div>
        </form>
        <div className="mx-auto max-w-2xl space-y-6 px-4 pb-8">
          <MemberDiarySummary memberId={memberId!} />
          <MemberCheckInHistory memberId={memberId!} />
        </div>
        <div className="mx-auto max-w-2xl px-4 pb-8">
          <h2 className="mb-3 font-heading text-sm text-white/70">Messages</h2>
          <MessageThread role="coach" memberId={memberId!} compact />
        </div>
      </div>
  );
}
