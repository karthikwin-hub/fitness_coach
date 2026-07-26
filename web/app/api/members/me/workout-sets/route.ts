import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { getMemberByUserId } from "@/lib/members/queries";
import {
  getWorkoutSetCompletions,
  localWorkoutDateString,
  setWorkoutSetCompleted,
} from "@/lib/workouts/set-logs";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== "member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const workoutDate =
    request.nextUrl.searchParams.get("date") ?? localWorkoutDateString();
  const rows = await getWorkoutSetCompletions(member.id, workoutDate);

  return NextResponse.json({ workoutDate, completions: rows });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== "member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const body = await request.json();
  const exerciseId = body.exerciseId as string | undefined;
  const setNumber = body.setNumber as number | undefined;
  const completed = body.completed as boolean | undefined;
  const workoutDate = (body.workoutDate as string | undefined) ?? localWorkoutDateString();

  if (!exerciseId || !setNumber || typeof completed !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await setWorkoutSetCompleted(member.id, exerciseId, setNumber, workoutDate, completed);

  return NextResponse.json({ ok: true });
}
