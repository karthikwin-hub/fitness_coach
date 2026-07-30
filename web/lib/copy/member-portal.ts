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
  checkInFeedbackLabel: "Feedback on your check-in",
  checkInFeedbackDate: (date: string) => `From your ${date} check-in`,
  checkInFeedbackPending: "Still under review",
  coachFeedbackSectionHint:
    "Notes and voice messages tied to specific check-ins — not the general coach broadcast above.",
  coachFeedbackShowOlder: (count: number) =>
    `Show ${count} older ${count === 1 ? "entry" : "entries"}`,
  coachFeedbackPage: (page: number, total: number) => `Page ${page} of ${total}`,
  coachFeedbackCollapse: "Hide older feedback",
  phaseStripLabel: "Your program phase",
} as const;
