import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/server";
import { getActiveBroadcast } from "@/lib/coach/broadcasts";
import { db } from "@/lib/db";
import { checkIns } from "@/lib/db/schema";
import { resolvePlayableMediaUrl } from "@/lib/firebase/admin-storage";
import {
  computeStreakDays,
  computeWeeklyCompliance,
  todayDayIndex,
} from "@/lib/member/stats";
import { normalizeProgramPhases } from "@/lib/members/program-phases";
import { getMemberByUserId } from "@/lib/members/queries";
import {
  getPublishedNutritionPlan,
  getPublishedTrainingPlan,
} from "@/lib/plans/queries";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const [checkInRows, training, nutrition, coachBroadcast] = await Promise.all([
    db
      .select()
      .from(checkIns)
      .where(eq(checkIns.memberId, member.id))
      .orderBy(desc(checkIns.createdAt)),
    getPublishedTrainingPlan(member.id),
    getPublishedNutritionPlan(member.id),
    getActiveBroadcast(user.tenantId),
  ]);

  const streakDays = computeStreakDays(checkInRows);
  const compliancePct = computeWeeklyCompliance(checkInRows);

  const latestCheckInFeedbackRow = checkInRows.find(
    (c) => c.coachNote?.trim() || c.coachVoiceNoteUrl?.trim(),
  );
  const resolvedVoiceUrl = latestCheckInFeedbackRow?.coachVoiceNoteUrl
    ? await resolvePlayableMediaUrl(latestCheckInFeedbackRow.coachVoiceNoteUrl)
    : null;
  const latestCheckInFeedback = latestCheckInFeedbackRow
    ? {
        id: latestCheckInFeedbackRow.id,
        status: latestCheckInFeedbackRow.status,
        coachNote: latestCheckInFeedbackRow.coachNote,
        coachVoiceNoteUrl: resolvedVoiceUrl,
        coachVoiceNoteDurationSec: latestCheckInFeedbackRow.coachVoiceNoteDurationSec,
        createdAt: latestCheckInFeedbackRow.createdAt.toISOString(),
      }
    : null;

  const dayIdx = todayDayIndex();
  const todayWorkout =
    training?.days.find((d) => d.dayIndex === dayIdx) ??
    training?.days[0] ??
    null;

  const exerciseCount = todayWorkout
    ? todayWorkout.sections.reduce((n, s) => n + s.exercises.length, 0)
    : 0;

  const recentCheckInSlice = checkInRows.slice(0, 14);
  const [resolvedBroadcastAudio, resolvedBroadcastVideo, ...recentVoiceUrls] =
    await Promise.all([
      coachBroadcast?.audioUrl
        ? resolvePlayableMediaUrl(coachBroadcast.audioUrl)
        : Promise.resolve(null),
      coachBroadcast?.videoUrl
        ? resolvePlayableMediaUrl(coachBroadcast.videoUrl)
        : Promise.resolve(null),
      ...recentCheckInSlice.map((c) =>
        c.coachVoiceNoteUrl
          ? resolvePlayableMediaUrl(c.coachVoiceNoteUrl)
          : Promise.resolve(null),
      ),
    ]);

  return NextResponse.json({
    displayName: user.displayName,
    email: user.email,
    location: member.location,
    programStartDate: member.programStartDate,
    programEndDate: member.programEndDate,
    programPhases: normalizeProgramPhases(
      member.programPhasesJson,
      member.programStartDate,
      member.programEndDate,
    ),
    streakDays,
    compliancePct,
    stepGoal: training?.stepGoal ?? member.stepGoal ?? 10000,
    coachBroadcast: coachBroadcast?.active
      ? {
          body: coachBroadcast.body,
          audioUrl: resolvedBroadcastAudio,
          videoUrl: resolvedBroadcastVideo,
        }
      : null,
    latestCheckInFeedback,
    todayWorkout: todayWorkout
      ? {
          label: todayWorkout.label,
          exerciseCount,
          isRestDay: todayWorkout.sections.every((s) => s.exercises.length === 0),
        }
      : null,
    nutritionWeek: nutrition?.weekNumber ?? null,
    macros: nutrition
      ? {
          caloriesMin: nutrition.caloriesMin,
          caloriesMax: nutrition.caloriesMax,
          proteinMin: nutrition.proteinMin,
          proteinMax: nutrition.proteinMax,
        }
      : null,
    recentCheckIns: recentCheckInSlice.map((c, index) => ({
      id: c.id,
      status: c.status,
      coachNote: c.coachNote,
      coachVoiceNoteUrl: recentVoiceUrls[index],
      coachVoiceNoteDurationSec: c.coachVoiceNoteDurationSec,
      createdAt: c.createdAt.toISOString(),
      weightKg: c.weightKg,
      sleepHours: c.sleepHours,
    })),
  });
}
