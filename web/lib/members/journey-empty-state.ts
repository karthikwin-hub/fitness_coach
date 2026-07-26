import type { WindowMeta } from "@/lib/members/program-journey";

export type JourneyEmptyState = {
  kind: "no_program" | "not_started" | "waiting_for_plans" | "empty_period";
  title: string;
  message: string;
};

export type JourneyEmptyStateInput = {
  programStartDate: string | null;
  programEndDate: string | null;
  publishedTrainingCount: number;
  publishedNutritionCount: number;
  stats: {
    checkInsInWindow: number;
    deliveriesInWindow: number;
    appointmentsInWindow: number;
    trainingPublishedInWindow: number;
    nutritionPublishedInWindow: number;
  };
  window: WindowMeta;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatFriendlyDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** User-facing banner when a journey loads but has little or nothing to show. */
export function deriveJourneyEmptyState(
  input: JourneyEmptyStateInput,
): JourneyEmptyState | null {
  const today = todayIso();
  const hasPublishedPlans =
    input.publishedTrainingCount > 0 || input.publishedNutritionCount > 0;
  const hasWindowActivity =
    input.stats.checkInsInWindow > 0 ||
    input.stats.deliveriesInWindow > 0 ||
    input.stats.appointmentsInWindow > 0 ||
    input.stats.trainingPublishedInWindow > 0 ||
    input.stats.nutritionPublishedInWindow > 0;

  if (!input.programStartDate && !input.programEndDate && !hasPublishedPlans) {
    return {
      kind: "no_program",
      title: "No program yet",
      message:
        "Your coach hasn't set up a program timeline yet. You'll see plans, check-ins, and sessions here once onboarding is complete.",
    };
  }

  if (input.programStartDate && input.programStartDate > today) {
    return {
      kind: "not_started",
      title: "Program not started",
      message: `Your program begins on ${formatFriendlyDate(input.programStartDate)}. Your coach will publish plans closer to that date.`,
    };
  }

  if (!hasPublishedPlans) {
    return {
      kind: "waiting_for_plans",
      title: "Waiting for your first plan",
      message:
        "Your coach hasn't published any training or nutrition plans yet. Check back soon — they'll appear here automatically.",
    };
  }

  if (!hasWindowActivity) {
    return {
      kind: "empty_period",
      title: "Nothing in this period",
      message:
        input.window.totalWindows > 1
          ? "No activity in this 3-month window. Use ← Earlier or Later → to browse other periods of the program."
          : "No check-ins, plan deliveries, or coaching sessions recorded yet for this program period.",
    };
  }

  return null;
}
