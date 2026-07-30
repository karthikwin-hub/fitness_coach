"use client";

import type { MemberProfile } from "@/lib/members/types";

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

type Props = {
  profile: MemberProfile;
  goalsText: string;
  saving: boolean;
  saved: boolean;
  onGoalsChange: (value: string) => void;
  onFieldChange: <K extends keyof MemberProfile>(key: K, value: MemberProfile[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function CoachMemberProfileTab({
  profile,
  goalsText,
  saving,
  saved,
  onGoalsChange,
  onFieldChange,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <section className="space-y-3">
        <h2 className="font-heading text-sm text-amber-300">Health & goals</h2>
        <p className="text-xs text-white/40">
          From sign-up and onboarding — update as their program evolves.
        </p>
        <Field label="Goals (one per line)">
          <textarea
            className={`${inputClass} min-h-24`}
            value={goalsText}
            onChange={(e) => onGoalsChange(e.target.value)}
            placeholder="Fat loss&#10;Build strength&#10;Improve sleep"
          />
        </Field>
        <Field label="Health issues / injuries">
          <textarea
            className={`${inputClass} min-h-20`}
            value={profile.healthIssues ?? ""}
            onChange={(e) => onFieldChange("healthIssues", e.target.value || null)}
            placeholder="Osteoporosis, lower back pain, post-surgery notes…"
          />
        </Field>
        <Field label="Allergies & dietary restrictions">
          <textarea
            className={`${inputClass} min-h-20`}
            value={profile.allergies ?? ""}
            onChange={(e) => onFieldChange("allergies", e.target.value || null)}
          />
        </Field>
        <Field label="Medications">
          <textarea
            className={`${inputClass} min-h-20`}
            value={profile.medications ?? ""}
            onChange={(e) => onFieldChange("medications", e.target.value || null)}
          />
        </Field>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm text-[var(--brand-diet)]">About</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date of birth">
            <input
              type="date"
              className={inputClass}
              value={profile.dateOfBirth ?? ""}
              onChange={(e) => onFieldChange("dateOfBirth", e.target.value || null)}
            />
          </Field>
          <Field label="Occupation">
            <input
              className={inputClass}
              value={profile.occupation ?? ""}
              onChange={(e) => onFieldChange("occupation", e.target.value || null)}
            />
          </Field>
        </div>
        <Field label="Bio">
          <textarea
            className={`${inputClass} min-h-24`}
            value={profile.bio ?? ""}
            onChange={(e) => onFieldChange("bio", e.target.value || null)}
            placeholder="Background, lifestyle, training history…"
          />
        </Field>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm text-[var(--brand-diet)]">Program</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Status">
            <select
              className={inputClass}
              value={profile.status}
              onChange={(e) =>
                onFieldChange("status", e.target.value as MemberProfile["status"])
              }
            >
              <option value="active">Active</option>
              <option value="invited">Invited (not logged in yet)</option>
              <option value="paused">Paused</option>
              <option value="lead">Lead</option>
            </select>
          </Field>
          <Field label="Import key (stable ID)">
            <input
              className={inputClass}
              value={profile.importKey ?? ""}
              readOnly
              disabled
            />
          </Field>
          <Field label="Location label">
            <input
              className={inputClass}
              value={profile.location ?? ""}
              onChange={(e) => onFieldChange("location", e.target.value || null)}
              placeholder="USA, India, Australia…"
            />
          </Field>
          <Field label="Program start">
            <input
              type="date"
              className={inputClass}
              value={profile.programStartDate ?? ""}
              onChange={(e) => onFieldChange("programStartDate", e.target.value || null)}
            />
          </Field>
          <Field label="Program end">
            <input
              type="date"
              className={inputClass}
              value={profile.programEndDate ?? ""}
              onChange={(e) => onFieldChange("programEndDate", e.target.value || null)}
            />
          </Field>
          <Field label="Diet preference">
            <select
              className={inputClass}
              value={profile.dietPreference ?? ""}
              onChange={(e) =>
                onFieldChange(
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
                onFieldChange("stepGoal", e.target.value ? Number(e.target.value) : null)
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
                    onFieldChange("programPhases", next);
                  }}
                />
                <input
                  type="date"
                  className={inputClass}
                  value={phase.startDate}
                  onChange={(e) => {
                    const next = [...profile.programPhases];
                    next[index] = { ...phase, startDate: e.target.value };
                    onFieldChange("programPhases", next);
                  }}
                />
                <input
                  type="date"
                  className={inputClass}
                  value={phase.endDate}
                  onChange={(e) => {
                    const next = [...profile.programPhases];
                    next[index] = { ...phase, endDate: e.target.value };
                    onFieldChange("programPhases", next);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm text-white/70">Emergency contact</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact name">
            <input
              className={inputClass}
              value={profile.emergencyContactName ?? ""}
              onChange={(e) => onFieldChange("emergencyContactName", e.target.value || null)}
            />
          </Field>
          <Field label="Contact phone">
            <input
              className={inputClass}
              value={profile.emergencyContactPhone ?? ""}
              onChange={(e) => onFieldChange("emergencyContactPhone", e.target.value || null)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm text-white/70">Coach notes (private)</h2>
        <textarea
          className={`${inputClass} min-h-24`}
          value={profile.coachNotes ?? ""}
          onChange={(e) => onFieldChange("coachNotes", e.target.value || null)}
          placeholder="Internal notes — not visible to member"
        />
      </section>

      <section className="space-y-3 border-t border-white/10 pt-8">
        <h2 className="font-heading text-sm text-[var(--brand-workout)]">Contact</h2>
        <p className="text-xs text-white/40">Address and phone — updated less often.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name">
            <input
              className={inputClass}
              value={profile.firstName ?? ""}
              onChange={(e) => onFieldChange("firstName", e.target.value || null)}
            />
          </Field>
          <Field label="Last name">
            <input
              className={inputClass}
              value={profile.lastName ?? ""}
              onChange={(e) => onFieldChange("lastName", e.target.value || null)}
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
            onChange={(e) => onFieldChange("phone", e.target.value || null)}
            placeholder="+1 555 0100"
          />
        </Field>
        <label className="flex items-start gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={profile.whatsappUpdatesOptIn}
            onChange={(e) => onFieldChange("whatsappUpdatesOptIn", e.target.checked)}
            className="mt-1"
          />
          <span>
            Send coach broadcast and check-in feedback via WhatsApp to this phone (member must use
            international format, e.g. +91…).
          </span>
        </label>
        <Field label="Address line 1">
          <input
            className={inputClass}
            value={profile.addressLine1 ?? ""}
            onChange={(e) => onFieldChange("addressLine1", e.target.value || null)}
          />
        </Field>
        <Field label="Address line 2">
          <input
            className={inputClass}
            value={profile.addressLine2 ?? ""}
            onChange={(e) => onFieldChange("addressLine2", e.target.value || null)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="City">
            <input
              className={inputClass}
              value={profile.city ?? ""}
              onChange={(e) => onFieldChange("city", e.target.value || null)}
            />
          </Field>
          <Field label="State / region">
            <input
              className={inputClass}
              value={profile.stateRegion ?? ""}
              onChange={(e) => onFieldChange("stateRegion", e.target.value || null)}
            />
          </Field>
          <Field label="Postal code">
            <input
              className={inputClass}
              value={profile.postalCode ?? ""}
              onChange={(e) => onFieldChange("postalCode", e.target.value || null)}
            />
          </Field>
          <Field label="Country">
            <input
              className={inputClass}
              value={profile.country ?? ""}
              onChange={(e) => onFieldChange("country", e.target.value || null)}
            />
          </Field>
        </div>
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
  );
}
