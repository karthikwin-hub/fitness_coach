/** Helna-approved micro-copy for coach portal (copy bible v1). */

export const coachCopy = {
  commandCenterTitle: "Command center",
  commandCenterSubtitle: "Coach portal",
  queueEmpty: "Clean slate. Your clients are putting in work.",
  queueEmptyFiltered: "No check-ins for this member yet.",
  queueTitlePending: (n: number) => `Check-ins needing review (${n})`,
  queueTitleHistory: (n: number) => `Check-in history (${n})`,
  noteSaved: "Saved — member can see this",
  approveHint:
    "Flagged items stay in the review queue; approved items drop off the queue but remain in history.",
  loadError: "Could not load check-ins. Refresh the page or sign in again.",
  atRiskBadge: "Needs attention",
  recipeDrawerTitle: "Quick-fix recipes",
  recipeDrawerHint: "Send a recipe suggestion to the member's plan or notes.",
  settingsTitle: "Brand & voice",
  broadcastTitle: "Coach note to members",
  broadcastHint: "Optional — shown on member dashboards when active. Not required daily.",
  retentionTitle: "Data retention & storage",
  retentionHint:
    "Permanently delete pictures, audio, video, and communication logs older than the selected period. Check-in numbers (weight, sleep, compliance) are kept; attachments are removed.",
  retentionCostHint:
    "Voice notes are typically 1–5 MB, photos 0.5–3 MB, and videos 10–50 MB. Shorter retention reduces Firebase storage costs.",
  retentionLastPurge: (iso: string) => `Last cleanup: ${new Date(iso).toLocaleString()}`,
  retentionPurgeConfirm:
    "Delete all messages, food diary entries, and media older than your retention period? This cannot be undone.",
} as const;
