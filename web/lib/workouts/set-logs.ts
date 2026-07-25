import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workoutSetLogs } from "@/lib/db/schema";

export { localWorkoutDateString } from "@/lib/workouts/date";
export async function getWorkoutSetCompletions(memberId: string, workoutDate: string) {
  return db
    .select({
      exerciseId: workoutSetLogs.exerciseId,
      setNumber: workoutSetLogs.setNumber,
    })
    .from(workoutSetLogs)
    .where(
      and(
        eq(workoutSetLogs.memberId, memberId),
        eq(workoutSetLogs.workoutDate, workoutDate),
      ),
    );
}

export async function setWorkoutSetCompleted(
  memberId: string,
  exerciseId: string,
  setNumber: number,
  workoutDate: string,
  completed: boolean,
) {
  if (completed) {
    await db
      .insert(workoutSetLogs)
      .values({ memberId, exerciseId, setNumber, workoutDate })
      .onConflictDoNothing();
    return;
  }

  await db
    .delete(workoutSetLogs)
    .where(
      and(
        eq(workoutSetLogs.memberId, memberId),
        eq(workoutSetLogs.exerciseId, exerciseId),
        eq(workoutSetLogs.workoutDate, workoutDate),
        eq(workoutSetLogs.setNumber, setNumber),
      ),
    );
}
