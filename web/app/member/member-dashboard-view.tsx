"use client";



import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Flame, Footprints } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";

import { useAuthHeaders, authFetchJson } from "@/lib/api/client";

import { CoachBroadcastCard } from "@/components/member/coach-broadcast-card";

import { NewPlanBanner } from "@/components/member/new-plan-banner";

import { ProgramPhaseStrip } from "@/components/member/program-phase-strip";

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

  coachBroadcast: { body: string; audioUrl: string | null } | null;

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



  useEffect(() => {

    authFetchJson<Dashboard>("/api/members/me/dashboard", {}, getHeaders)

      .then(({ data, error: fetchError }) => {

        if (fetchError) {

          setError(fetchError);

          return;

        }

        setData(data);

      })

      .finally(() => setLoading(false));

  }, [getHeaders]);



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



  return (

    <div className="space-y-6">

      <StreakToast message={streakToast} />



      <NewPlanBanner />



      <header className="dashboard-hero rounded-2xl p-4">

        <p className="text-sm text-white/60">{memberCopy.dashboardGreeting(firstName)}</p>

        <h1 className="font-heading mt-1 text-2xl">{memberName}</h1>

        <p className="mt-1 text-xs text-white/40">

          {memberEmail}

          {data.location ? ` · ${data.location}` : ""}

          {data.programStartDate

            ? ` · Program ${data.programStartDate} – ${data.programEndDate ?? "ongoing"}`

            : ""}

        </p>

      </header>



      {data.coachBroadcast && (

        <CoachBroadcastCard

          body={data.coachBroadcast.body}

          audioUrl={data.coachBroadcast.audioUrl}

        />

      )}



      <ProgramPhaseStrip phases={data.programPhases} />



      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">

          <Flame className="h-6 w-6 text-orange-400" />

        </div>

        <div>

          <p className="text-2xl font-bold">

            {data.streakDays} day streak

          </p>

          <p className="text-sm text-white/60">

            {data.compliancePct}% compliance this week

          </p>

        </div>

      </div>



      <div className="flex items-center gap-4 rounded-2xl border border-[var(--brand-workout)]/30 bg-[var(--brand-dark-surface)] p-4">

        <Footprints className="h-8 w-8 text-[var(--brand-workout)]" />

        <div>

          <p className="text-sm text-white/60">Daily step goal</p>

          <p className="text-xl font-bold">{data.stepGoal.toLocaleString()} steps</p>

        </div>

      </div>



      <Link

        href="/member/check-in"

        className="tap-target flex w-full items-center justify-center rounded-xl bg-[var(--brand-diet)] py-4 text-center font-semibold text-[var(--brand-dark)]"

      >

        Submit Today&apos;s Check-In

      </Link>



      {data.recentCheckIns.length > 0 && (

        <section className="rounded-2xl border border-white/10 p-4">

          <h2 className="font-heading text-sm text-[var(--brand-diet)]">Coach feedback</h2>

          <p className="mt-1 text-xs text-white/40">Your recent check-ins and notes from Coach Helna</p>

          <ul className="mt-4 space-y-3">

            {data.recentCheckIns.map((c) => (

              <li

                key={c.id}

                className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-3"

              >

                <div className="flex items-center justify-between gap-2">

                  <span className="text-sm text-white/70">

                    {new Date(c.createdAt).toLocaleDateString()}

                  </span>

                  <span

                    className={`rounded-full px-2 py-0.5 text-xs uppercase ${

                      c.status === "approved"

                        ? "bg-[var(--brand-diet)]/20 text-[var(--brand-diet)]"

                        : c.status === "flagged"

                          ? "bg-red-500/20 text-red-300"

                          : "bg-white/10 text-white/60"

                    }`}

                  >

                    {c.status}

                  </span>

                </div>

                {(c.weightKg != null || c.sleepHours != null) && (

                  <p className="mt-1 text-xs text-white/50">

                    {c.weightKg != null && `${c.weightKg}kg`}

                    {c.weightKg != null && c.sleepHours != null && " · "}

                    {c.sleepHours != null && `${c.sleepHours}h sleep`}

                  </p>

                )}

                {c.coachNote ? (

                  <p className="mt-2 text-sm text-white/80">{c.coachNote}</p>

                ) : c.status === "approved" ? (

                  <p className="mt-2 text-sm text-white/50">Approved — keep it up!</p>

                ) : c.status === "flagged" ? (

                  <p className="mt-2 text-sm text-amber-200">Flagged — coach will follow up</p>

                ) : null}

              </li>

            ))}

          </ul>

        </section>

      )}



      <section className="rounded-2xl border border-white/10 p-4">

        <h2 className="font-heading text-sm text-[var(--brand-workout)]">

          Today&apos;s workout

        </h2>

        {data.todayWorkout ? (

          <>

            <p className="mt-2 font-medium">{data.todayWorkout.label}</p>

            {data.todayWorkout.isRestDay ? (

              <p className="mt-1 text-sm text-white/60">Rest day — focus on steps and recovery.</p>

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


