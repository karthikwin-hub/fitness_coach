"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { coachCopy } from "@/lib/copy/coach-portal";

type MemberRow = {
  id: string;
  importKey?: string | null;
  status: "lead" | "invited" | "active" | "paused";
  displayName: string | null;
  email: string;
  location: string | null;
  compliancePct: number;
  streakDays: number;
  programStartDate: string | null;
  programEndDate: string | null;
  trendAlerts?: Array<{ code: string; message: string }>;
};

type LeadRow = {
  id: string;
  email: string | null;
  intentScore: number;
  routedTo: string;
  quizResponsesJson: Record<string, unknown>;
  createdAt: string;
};

type Tab = "active" | "paused" | "enquiries" | "progress";

type ProgressRow = {
  memberId: string;
  name: string;
  status: string;
  windowLabel: string;
  checkInsInWindow: number;
  latestTrainingWeek: number | null;
  latestNutritionWeek: number | null;
  compliancePct: number;
  streakDays: number;
};

export function CoachMembersView() {
  const getHeaders = useAuthHeaders();
  const [tab, setTab] = useState<Tab>("active");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  function reloadMembers() {
    setLoading(true);
    Promise.all([
      authFetch("/api/members", {}, getHeaders).then((r) => r.json()),
      authFetch("/api/members/alerts", {}, getHeaders).then((r) => r.json()),
      authFetch("/api/leads", {}, getHeaders).then((r) => r.json()),
      authFetch("/api/members/progress", {}, getHeaders).then((r) => r.json()),
    ])
      .then(([memberRows, alertsBody, leadRows, progressBody]) => {
        const trendsByMember = (alertsBody.trendsByMember ?? {}) as Record<
          string,
          { alerts?: Array<{ code: string; message: string }> }
        >;
        setMembers(
          memberRows.map((member: MemberRow) => ({
            ...member,
            trendAlerts: trendsByMember[member.id]?.alerts ?? [],
          })),
        );
        setLeads(leadRows);
        setProgress(progressBody.members ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reloadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getHeaders]);

  async function submitAddClient(e: React.FormEvent) {
    e.preventDefault();
    setAddBusy(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const res = await authFetch(
        "/api/members",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: addEmail,
            firstName: addFirstName || undefined,
            lastName: addLastName || undefined,
            phone: addPhone || undefined,
            status: "invited",
          }),
        },
        getHeaders,
      );
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Failed to add client");
        return;
      }
      setAddSuccess(`${data.displayName ?? data.email} added (ID: ${data.importKey})`);
      setAddEmail("");
      setAddFirstName("");
      setAddLastName("");
      setAddPhone("");
      setShowAdd(false);
      reloadMembers();
    } finally {
      setAddBusy(false);
    }
  }

  const activeMembers = members.filter((m) => m.status === "active");
  const invitedMembers = members.filter((m) => m.status === "invited");
  const pausedMembers = members.filter((m) => m.status === "paused");
  const leadMembers = members.filter((m) => m.status === "lead");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "active", label: "Active clients", count: activeMembers.length },
    { id: "paused", label: "Paused / inactive", count: pausedMembers.length },
    {
      id: "enquiries",
      label: "New enquiries",
      count: leads.length + leadMembers.length + invitedMembers.length,
    },
    {
      id: "progress",
      label: "Progress",
      count: progress.length,
    },
  ];

  if (loading) {
    return <p className="text-white/50">Loading members…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-xl bg-[var(--brand-diet)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]"
        >
          {showAdd ? "Cancel" : "Add client"}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={submitAddClient}
          className="space-y-3 rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-4"
        >
          <p className="text-xs text-white/50">
            Creates an invited client. They can sign in with Google using this email after you publish their plan.
          </p>
          <label className="block text-xs text-white/50">
            Email (Gmail for login)
            <input
              type="email"
              required
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/50">
              First name
              <input
                value={addFirstName}
                onChange={(e) => setAddFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-white/50">
              Last name
              <input
                value={addLastName}
                onChange={(e) => setAddLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-xs text-white/50">
            Phone
            <input
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
            />
          </label>
          {addError && <p className="text-xs text-red-300">{addError}</p>}
          <button
            type="submit"
            disabled={addBusy}
            className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {addBusy ? "Adding…" : "Create invited client"}
          </button>
        </form>
      )}

      {addSuccess && (
        <p className="rounded-lg border border-[var(--brand-diet)]/30 bg-[var(--brand-diet)]/10 px-3 py-2 text-sm text-[var(--brand-diet)]">
          {addSuccess}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm ${
              tab === t.id
                ? "bg-[var(--brand-diet)] text-[var(--brand-dark)]"
                : "border border-white/15 text-white/70"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === "active" && (
        <MemberList
          empty="No active clients yet."
          members={activeMembers}
          showPlansLink
        />
      )}

      {tab === "paused" && (
        <MemberList
          empty="No paused clients."
          members={pausedMembers}
          showPlansLink
        />
      )}

      {tab === "enquiries" && (
        <div className="space-y-6">
          {invitedMembers.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wide text-white/40">Invited clients</h2>
              <MemberList empty="" members={invitedMembers} showPlansLink />
            </section>
          )}
          {leadMembers.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wide text-white/40">Member leads</h2>
              <MemberList empty="" members={leadMembers} showPlansLink={false} />
            </section>
          )}
          <section>
            <h2 className="text-xs uppercase tracking-wide text-white/40">Quiz submissions</h2>
            {leads.length === 0 ? (
              <p className="mt-3 text-sm text-white/40">No quiz enquiries yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {leads.map((lead) => (
                  <li
                    key={lead.id}
                    className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{lead.email ?? "No email"}</span>
                      <span className="text-xs text-[var(--brand-diet)]">
                        Intent {lead.intentScore}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/50">
                      {new Date(lead.createdAt).toLocaleDateString()} · Routed to {lead.routedTo}
                    </p>
                    {"goal" in lead.quizResponsesJson && (
                      <p className="mt-2 text-sm text-white/60">
                        Goal: {String(lead.quizResponsesJson.goal)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "progress" && (
        <div className="space-y-2">
          {progress.length === 0 ? (
            <p className="text-sm text-white/40">No client progress data yet.</p>
          ) : (
            <ul className="space-y-2">
              {progress.map((row) => (
                <li key={row.memberId}>
                  <Link
                    href={`/coach/members/${row.memberId}?tab=journey`}
                    className="block rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 hover:border-[var(--brand-diet)]/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{row.name}</span>
                      <span className="text-xs uppercase text-white/40">{row.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--brand-diet)]">{row.windowLabel}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {row.checkInsInWindow} check-ins this period · Training wk{" "}
                      {row.latestTrainingWeek ?? "—"} · Nutrition wk{" "}
                      {row.latestNutritionWeek ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      {row.compliancePct}% compliance · {row.streakDays}d streak
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function MemberList({
  members,
  empty,
  showPlansLink,
}: {
  members: MemberRow[];
  empty: string;
  showPlansLink: boolean;
}) {
  if (members.length === 0) {
    return empty ? <p className="text-sm text-white/40">{empty}</p> : null;
  }

  return (
    <ul className="space-y-2">
      {members.map((m) => (
        <li key={m.id}>
          {showPlansLink ? (
            <Link
              href={`/coach/members/${m.id}`}
              className="block rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 hover:border-[var(--brand-workout)]/50"
            >
              <MemberCardContent member={m} />
            </Link>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
              <MemberCardContent member={m} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function MemberCardContent({ member }: { member: MemberRow }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="font-medium">{member.displayName ?? member.email}</span>
        <div className="flex items-center gap-2">
          {(member.trendAlerts?.length ?? 0) > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase text-amber-200">
              {coachCopy.atRiskBadge}
            </span>
          )}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs uppercase">
            {member.status}
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-white/50">
        {member.location ?? "—"} · Compliance {member.compliancePct}% · Streak {member.streakDays}d
        {member.importKey ? ` · ${member.importKey}` : ""}
      </p>
      {member.programStartDate && (
        <p className="mt-1 text-xs text-white/40">
          Program {member.programStartDate} – {member.programEndDate ?? "ongoing"}
        </p>
      )}
    </>
  );
}
