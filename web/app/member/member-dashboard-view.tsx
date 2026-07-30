"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { useAuthHeaders, authFetchJson } from "@/lib/api/client";
import { CoachBroadcastCard } from "@/components/member/coach-broadcast-card";
import { CheckInFeedbackCard } from "@/components/member/check-in-feedback-card";
import { CoachFeedbackHistory } from "@/components/member/coach-feedback-history";
import { MemberDashboardSummary } from "@/components/member/member-dashboard-summary";
import { StreakToast } from "@/components/member/streak-toast";
import { memberCopy } from "@/lib/copy/member-portal";
import type { ProgramPhase } from "@/lib/members/program-phases";

type Dashboard = {
  displayName: string | null;
  email: string;
  location: string | null;
  programStartDate: string | null;
  programEndDate: string | null;
  programPhases: ProgramPhase[];
  streakDays: number;
  compliancePct: number;
  stepGoal: number;
  coachBroadcast: { body: string; audioUrl: string | null; videoUrl?: string | null } | null;
  latestCheckInFeedback: {
    id: string;
    status: string;
    coachNote: string | null;
    coachVoiceNoteUrl: string | null;
    coachVoiceNoteDurationSec: number | null;
    createdAt: string;
  } | null;
  todayWorkout: {
    label: string;
    exerciseCount: number;
    isRestDay: boolean;
  } | null;
  nutritionWeek: number | null;
  macros: {
    caloriesMin: number | null;
    caloriesMax: number | null;
    proteinMin: number | null;
    proteinMax: number | null;
  } | null;
  recentCheckIns: Array<{
    id: string;
    status: string;
    coachNote: string | null;
    coachVoiceNoteUrl: string | null;
    coachVoiceNoteDurationSec: number | null;
    createdAt: string;
    weightKg: number | null;
    sleepHours: number | null;
  }>;
};

function streakMessage(days: number): string | null {
  if (days === 7) return memberCopy.streakToast7;
  if (days === 30) return memberCopy.streakToast30;
  return null;
}

export function MemberDashboardView() {
  const { appUser } = useAuth();
  const getHeaders = useAuthHeaders();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const { data: next, error: fetchError } = await authFetchJson<Dashboard>(
      "/api/members/me/dashboard",
      {},
      getHeaders,
    );
    if (fetchError) {
      setError(fetchError);
      return;
    }
    setError(null);
    setData(next);
  }, [getHeaders]);

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void loadDashboard();
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadDashboard]);

  const memberName =
    data?.displayName ?? appUser?.displayName ?? appUser?.email ?? "Member";
  const memberEmail = data?.email ?? appUser?.email;
  const firstName = memberName.split(" ")[0];

  const streakToast = useMemo(() => {
    if (!data) return null;
    const msg = streakMessage(data.streakDays);
    if (!msg) return null;
    const key = `streak-toast-${data.streakDays}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key)) return null;
    if (typeof window !== "undefined") sessionStorage.setItem(key, "1");
    return msg;
  }, [data]);

  const highlightedFeedbackId = data?.latestCheckInFeedback?.id ?? null;
  const coachFeedbackList = useMemo(() => {
    if (!data?.recentCheckIns.length) return [];
    if (!highlightedFeedbackId) return data.recentCheckIns;
    return data.recentCheckIns.filter((c) => c.id !== highlightedFeedbackId);
  }, [data?.recentCheckIns, highlightedFeedbackId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-white/60">Signed in as {memberName}</p>
        <p className="text-white/50">Loading dashboard…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <header>
          <p className="text-sm text-white/60">Signed in as {memberName}</p>
          {memberEmail && memberName !== memberEmail && (
            <p className="text-xs text-white/40">{memberEmail}</p>
          )}
          <h1 className="font-heading mt-2 text-2xl">Your dashboard</h1>
        </header>
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {error ?? "Could not load dashboard."}
        </p>
      </div>
    );
  }

  const hasActiveMessages =
    Boolean(data.coachBroadcast) || Boolean(data.latestCheckInFeedback);

  return (
    <div className="space-y-4">
      <StreakToast message={streakToast} />

      <MemberDashboardSummary
        firstName={firstName}
        memberName={memberName}
        memberEmail={memberEmail}
        location={data.location}
        programStartDate={data.programStartDate}
        programEndDate={data.programEndDate}
        programPhases={data.programPhases}
        streakDays={data.streakDays}
        compliancePct={data.compliancePct}
        stepGoal={data.stepGoal}
      />

      {hasActiveMessages && (
        <section className="space-y-3" aria-label="Messages from your coach">
          {data.coachBroadcast && (
            <CoachBroadcastCard
              body={data.coachBroadcast.body}
              audioUrl={data.coachBroadcast.audioUrl}
              videoUrl={data.coachBroadcast.videoUrl ?? null}
            />
          )}
          {data.latestCheckInFeedback && (
            <CheckInFeedbackCard feedback={data.latestCheckInFeedback} />
          )}
        </section>
      )}

      <Link
        href="/member/check-in"
        className="tap-target flex w-full items-center justify-center rounded-xl bg-[var(--brand-diet)] py-4 text-center font-semibold text-[var(--brand-dark)]"
      >
        Submit Today&apos;s Check-In
      </Link>

      {coachFeedbackList.length > 0 && <CoachFeedbackHistory items={coachFeedbackList} />}

      <section className="rounded-2xl border border-white/10 p-4">
        <h2 className="font-heading text-sm text-[var(--brand-workout)]">
          Today&apos;s workout
        </h2>
        {data.todayWorkout ? (
          <>
            <p className="mt-2 font-medium">{data.todayWorkout.label}</p>
            {data.todayWorkout.isRestDay ? (
              <p className="mt-1 text-sm text-white/60">
                Rest day — focus on steps and recovery.
              </p>
            ) : (
              <p className="mt-1 text-sm text-white/60">
                {data.todayWorkout.exerciseCount} exercises scheduled
              </p>
            )}
            <Link
              href="/member/workouts"
              className="mt-3 inline-block text-sm font-medium text-[var(--brand-workout)]"
            >
              Start workout →
            </Link>
          </>
        ) : (
          <p className="mt-2 text-sm text-white/50">{memberCopy.workoutEmpty}</p>
        )}
      </section>

      {data.macros && (
        <section className="rounded-2xl border border-[var(--brand-diet)]/30 p-4">
          <h2 className="font-heading text-sm text-[var(--brand-diet)]">
            Week {data.nutritionWeek} nutrition
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {data.macros.caloriesMin}–{data.macros.caloriesMax} cal · Protein{" "}
            {data.macros.proteinMin}–{data.macros.proteinMax}g
          </p>
          <Link
            href="/member/nutrition"
            className="mt-3 inline-block text-sm font-medium text-[var(--brand-diet)]"
          >
            View full plan →
          </Link>
        </section>
      )}
    </div>
  );
}
