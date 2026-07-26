"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuthHeaders, authFetchJson } from "@/lib/api/client";
import { formatMemberName, type MemberProfile } from "@/lib/members/types";
import { MemberCheckInHistory } from "@/components/coach/member-check-in-history";
import { MemberDiarySummary } from "@/components/coach/member-diary-summary";
import { MessageThread } from "@/components/member/message-thread";
import { ProgramJourneyView } from "@/components/coach/program-journey-view";
import { CoachMemberProfileTab } from "@/components/coach/coach-member-profile-tab";
import {
  CoachMemberTabNav,
  parseCoachMemberTab,
  type CoachMemberTab,
} from "@/components/coach/coach-member-tab-nav";

export default function CoachMemberProfilePage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <Suspense
        fallback={
          <p className="px-4 py-6 text-white/50">Loading member…</p>
        }
      >
        <CoachMemberProfileContent />
      </Suspense>
    </RequireAuth>
  );
}

function CoachMemberProfileContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId =
    typeof params.memberId === "string"
      ? params.memberId
      : Array.isArray(params.memberId)
        ? params.memberId[0]
        : undefined;
  const activeTab = parseCoachMemberTab(searchParams.get("tab"));
  const getHeaders = useAuthHeaders();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [goalsText, setGoalsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setTab = useCallback(
    (tab: CoachMemberTab) => {
      if (!memberId) return;
      router.replace(`/coach/members/${memberId}?tab=${tab}`, { scroll: false });
    },
    [memberId, router],
  );

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
    if (!profile || !memberId) return;
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
    return <p className="px-4 py-6 text-white/50">Loading member…</p>;
  }

  if (!profile || !memberId) {
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
          <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </header>

      <CoachMemberTabNav active={activeTab} onChange={setTab} />

      {activeTab === "check-ins" && (
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-8">
          <p className="text-sm text-white/50">
            Recent meals, check-ins, and messages — same view as the command center.
          </p>
          <MemberDiarySummary memberId={memberId} />
          <MemberCheckInHistory memberId={memberId} />
          <section>
            <h2 className="mb-3 font-heading text-sm text-white/70">Messages</h2>
            <MessageThread role="coach" memberId={memberId} compact />
          </section>
        </div>
      )}

      {activeTab === "journey" && (
        <ProgramJourneyView mode="coach" memberId={memberId} />
      )}

      {activeTab === "profile" && (
        <CoachMemberProfileTab
          profile={profile}
          goalsText={goalsText}
          saving={saving}
          saved={saved}
          onGoalsChange={(value) => {
            setGoalsText(value);
            setSaved(false);
          }}
          onFieldChange={updateField}
          onSubmit={saveProfile}
        />
      )}
    </div>
  );
}
