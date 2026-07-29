/** Pure helpers for retention purge (testable without DB). */

export type RetentionCutoffInput = {
  retentionDays: number;
  now?: Date;
};

export function computeRetentionCutoff({
  retentionDays,
  now = new Date(),
}: RetentionCutoffInput): Date {
  const ms = Math.max(1, retentionDays) * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - ms);
}

export function isExternalMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("dev://") || url.startsWith("data:") || !url.includes("firebasestorage");
}

export type PurgeSummary = {
  messagesDeleted: number;
  foodEntriesDeleted: number;
  checkInsStripped: number;
  planDeliveriesStripped: number;
  broadcastsCleared: number;
  mediaFilesDeleted: number;
};

export function emptyPurgeSummary(): PurgeSummary {
  return {
    messagesDeleted: 0,
    foodEntriesDeleted: 0,
    checkInsStripped: 0,
    planDeliveriesStripped: 0,
    broadcastsCleared: 0,
    mediaFilesDeleted: 0,
  };
}

export function mergePurgeSummaries(a: PurgeSummary, b: PurgeSummary): PurgeSummary {
  return {
    messagesDeleted: a.messagesDeleted + b.messagesDeleted,
    foodEntriesDeleted: a.foodEntriesDeleted + b.foodEntriesDeleted,
    checkInsStripped: a.checkInsStripped + b.checkInsStripped,
    planDeliveriesStripped: a.planDeliveriesStripped + b.planDeliveriesStripped,
    broadcastsCleared: a.broadcastsCleared + b.broadcastsCleared,
    mediaFilesDeleted: a.mediaFilesDeleted + b.mediaFilesDeleted,
  };
}
