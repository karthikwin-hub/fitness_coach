"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { coachCopy } from "@/lib/copy/coach-portal";

type MemberRow = {
  id: string;
  status: "lead" | "active" | "paused";
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

type Tab = "active" | "paused" | "enquiries";

export function CoachMembersView() {
  const getHeaders = useAuthHeaders();
  const [tab, setTab] = useState<Tab>("active");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch("/api/members", {}, getHeaders).then((r) => r.json()),
      authFetch("/api/members/alerts", {}, getHeaders).then((r) => r.json()),
      authFetch("/api/leads", {}, getHeaders).then((r) => r.json()),
    ])
      .then(([memberRows, alertsBody, leadRows]) => {
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
      })
      .finally(() => setLoading(false));
  }, [getHeaders]);

  const activeMembers = members.filter((m) => m.status === "active");
  const pausedMembers = members.filter((m) => m.status === "paused");
  const leadMembers = members.filter((m) => m.status === "lead");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "active", label: "Active clients", count: activeMembers.length },
    { id: "paused", label: "Paused / inactive", count: pausedMembers.length },
    {
      id: "enquiries",
      label: "New enquiries",
      count: leads.length + leadMembers.length,
    },
  ];

  if (loading) {
    return <p className="px-4 py-6 text-white/50">Loading members…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
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
      </p>
      {member.programStartDate && (
        <p className="mt-1 text-xs text-white/40">
          Program {member.programStartDate} – {member.programEndDate ?? "ongoing"}
        </p>
      )}
    </>
  );
}
