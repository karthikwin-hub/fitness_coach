/** Helna-approved micro-copy for member portal (copy bible v1). */

export const memberCopy = {
  dashboardGreeting: (firstName: string) => `Good morning, ${firstName}`,
  nutritionEmptyPlan:
    "No published nutrition plan yet — you can still log food below.",
  nutritionLoading: "Loading nutrition…",
  workoutEmpty: "No published training plan yet.",
  streakToast7: "Seven days strong — Helna sees your consistency.",
  streakToast30: "Thirty-day streak. That's the work that transforms.",
  coachNoteLabel: "Note from Coach Helna",
  phaseStripLabel: "Your program phase",
} as const;
