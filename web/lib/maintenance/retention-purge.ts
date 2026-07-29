import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  checkIns,
  coachBroadcasts,
  foodDiaryEntries,
  messages,
  planDeliveries,
  tenants,
} from "@/lib/db/schema";
import { deleteFirebaseStorageUrls } from "@/lib/firebase/admin-storage";
import {
  computeRetentionCutoff,
  emptyPurgeSummary,
  type PurgeSummary,
} from "@/lib/maintenance/retention-helpers";

export async function purgeTenantRetention(
  tenantId: string,
  retentionDays: number,
): Promise<PurgeSummary> {
  const cutoff = computeRetentionCutoff({ retentionDays });
  const summary = emptyPurgeSummary();
  const urlsToDelete: string[] = [];

  const oldMessages = await db
    .select({
      id: messages.id,
      audioUrl: messages.audioUrl,
    })
    .from(messages)
    .where(and(eq(messages.tenantId, tenantId), lt(messages.createdAt, cutoff)));

  for (const row of oldMessages) {
    if (row.audioUrl) urlsToDelete.push(row.audioUrl);
  }
  if (oldMessages.length > 0) {
    await db
      .delete(messages)
      .where(and(eq(messages.tenantId, tenantId), lt(messages.createdAt, cutoff)));
    summary.messagesDeleted = oldMessages.length;
  }

  const oldFood = await db
    .select({ id: foodDiaryEntries.id, photoUrl: foodDiaryEntries.photoUrl })
    .from(foodDiaryEntries)
    .where(and(eq(foodDiaryEntries.tenantId, tenantId), lt(foodDiaryEntries.createdAt, cutoff)));

  for (const row of oldFood) {
    if (row.photoUrl) urlsToDelete.push(row.photoUrl);
  }
  if (oldFood.length > 0) {
    await db
      .delete(foodDiaryEntries)
      .where(and(eq(foodDiaryEntries.tenantId, tenantId), lt(foodDiaryEntries.createdAt, cutoff)));
    summary.foodEntriesDeleted = oldFood.length;
  }

  const oldCheckIns = await db
    .select({
      id: checkIns.id,
      mealPhotoUrl: checkIns.mealPhotoUrl,
      coachVoiceNoteUrl: checkIns.coachVoiceNoteUrl,
    })
    .from(checkIns)
    .where(and(eq(checkIns.tenantId, tenantId), lt(checkIns.createdAt, cutoff)));

  for (const row of oldCheckIns) {
    if (row.mealPhotoUrl) urlsToDelete.push(row.mealPhotoUrl);
    if (row.coachVoiceNoteUrl) urlsToDelete.push(row.coachVoiceNoteUrl);
  }
  if (oldCheckIns.length > 0) {
    await db
      .update(checkIns)
      .set({
        mealPhotoUrl: null,
        coachVoiceNoteUrl: null,
        coachVoiceNoteDurationSec: null,
      })
      .where(and(eq(checkIns.tenantId, tenantId), lt(checkIns.createdAt, cutoff)));
    summary.checkInsStripped = oldCheckIns.length;
  }

  const oldDeliveries = await db
    .select({
      id: planDeliveries.id,
      coachVoiceNoteUrl: planDeliveries.coachVoiceNoteUrl,
    })
    .from(planDeliveries)
    .where(and(eq(planDeliveries.tenantId, tenantId), lt(planDeliveries.createdAt, cutoff)));

  for (const row of oldDeliveries) {
    if (row.coachVoiceNoteUrl) urlsToDelete.push(row.coachVoiceNoteUrl);
  }
  if (oldDeliveries.length > 0) {
    await db
      .update(planDeliveries)
      .set({
        coachVoiceNoteUrl: null,
        coachVoiceNoteDurationSec: null,
      })
      .where(and(eq(planDeliveries.tenantId, tenantId), lt(planDeliveries.createdAt, cutoff)));
    summary.planDeliveriesStripped = oldDeliveries.length;
  }

  const oldBroadcasts = await db
    .select({
      id: coachBroadcasts.id,
      audioUrl: coachBroadcasts.audioUrl,
      videoUrl: coachBroadcasts.videoUrl,
    })
    .from(coachBroadcasts)
    .where(
      and(
        eq(coachBroadcasts.tenantId, tenantId),
        lt(coachBroadcasts.updatedAt, cutoff),
        eq(coachBroadcasts.active, false),
      ),
    );

  for (const row of oldBroadcasts) {
    if (row.audioUrl) urlsToDelete.push(row.audioUrl);
    if (row.videoUrl) urlsToDelete.push(row.videoUrl);
  }
  if (oldBroadcasts.length > 0) {
    await db
      .update(coachBroadcasts)
      .set({ audioUrl: null, videoUrl: null })
      .where(
        and(
          eq(coachBroadcasts.tenantId, tenantId),
          lt(coachBroadcasts.updatedAt, cutoff),
          eq(coachBroadcasts.active, false),
        ),
      );
    summary.broadcastsCleared = oldBroadcasts.length;
  }

  summary.mediaFilesDeleted = await deleteFirebaseStorageUrls(urlsToDelete);

  await db
    .update(tenants)
    .set({ lastPurgeAt: new Date() })
    .where(eq(tenants.id, tenantId));

  return summary;
}

export async function purgeAllTenantsRetention(): Promise<
  Record<string, PurgeSummary>
> {
  const rows = await db
    .select({ id: tenants.id, retentionDays: tenants.retentionDays })
    .from(tenants);

  const results: Record<string, PurgeSummary> = {};
  for (const tenant of rows) {
    results[tenant.id] = await purgeTenantRetention(tenant.id, tenant.retentionDays);
  }
  return results;
}
