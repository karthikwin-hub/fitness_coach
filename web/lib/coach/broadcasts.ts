import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coachBroadcasts } from "@/lib/db/schema";

export type CoachBroadcast = {
  id: string;
  body: string;
  audioUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: typeof coachBroadcasts.$inferSelect): CoachBroadcast {
  return {
    id: row.id,
    body: row.body,
    audioUrl: row.audioUrl,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getActiveBroadcast(tenantId: string): Promise<CoachBroadcast | null> {
  const [row] = await db
    .select()
    .from(coachBroadcasts)
    .where(and(eq(coachBroadcasts.tenantId, tenantId), eq(coachBroadcasts.active, true)))
    .orderBy(desc(coachBroadcasts.updatedAt))
    .limit(1);
  return row ? mapRow(row) : null;
}

export async function listBroadcasts(tenantId: string): Promise<CoachBroadcast[]> {
  const rows = await db
    .select()
    .from(coachBroadcasts)
    .where(eq(coachBroadcasts.tenantId, tenantId))
    .orderBy(desc(coachBroadcasts.updatedAt))
    .limit(20);
  return rows.map(mapRow);
}

export async function upsertActiveBroadcast(
  tenantId: string,
  createdBy: string | null,
  input: { body: string; audioUrl?: string | null; active?: boolean },
): Promise<CoachBroadcast> {
  const existing = await getActiveBroadcast(tenantId);
  if (existing && input.active !== false) {
    const [row] = await db
      .update(coachBroadcasts)
      .set({
        body: input.body,
        audioUrl: input.audioUrl ?? existing.audioUrl,
        active: input.active ?? true,
        updatedAt: new Date(),
      })
      .where(eq(coachBroadcasts.id, existing.id))
      .returning();
    return mapRow(row);
  }

  if (existing && input.active === false) {
    await db
      .update(coachBroadcasts)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(coachBroadcasts.id, existing.id));
  }

  if (!input.body.trim()) {
    if (existing) {
      const [row] = await db
        .select()
        .from(coachBroadcasts)
        .where(eq(coachBroadcasts.id, existing.id))
        .limit(1);
      return row ? mapRow(row) : { id: "", body: "", audioUrl: null, active: false, createdAt: "", updatedAt: "" };
    }
  }

  await db
    .update(coachBroadcasts)
    .set({ active: false })
    .where(and(eq(coachBroadcasts.tenantId, tenantId), eq(coachBroadcasts.active, true)));

  const [row] = await db
    .insert(coachBroadcasts)
    .values({
      tenantId,
      createdBy: createdBy ?? undefined,
      body: input.body,
      audioUrl: input.audioUrl ?? null,
      active: input.active ?? true,
    })
    .returning();
  return mapRow(row);
}
