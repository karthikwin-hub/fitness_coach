import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { coachBroadcasts } from "@/lib/db/schema";
import type { BroadcastExpiresPreset } from "@/lib/coach/broadcast-expiry";
import { computeBroadcastExpiresAt, isBroadcastVisible } from "@/lib/coach/broadcast-expiry";

export type CoachBroadcast = {
  id: string;
  body: string;
  audioUrl: string | null;
  videoUrl: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertBroadcastInput = {
  body: string;
  audioUrl?: string | null;
  videoUrl?: string | null;
  active?: boolean;
  expiresPreset?: BroadcastExpiresPreset;
  expiresAt?: string | null;
};

function mapRow(row: typeof coachBroadcasts.$inferSelect): CoachBroadcast {
  return {
    id: row.id,
    body: row.body,
    audioUrl: row.audioUrl,
    videoUrl: row.videoUrl,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getLatestActiveRow(tenantId: string) {
  const [row] = await db
    .select()
    .from(coachBroadcasts)
    .where(and(eq(coachBroadcasts.tenantId, tenantId), eq(coachBroadcasts.active, true)))
    .orderBy(desc(coachBroadcasts.updatedAt))
    .limit(1);
  return row ?? null;
}

export async function getActiveBroadcast(tenantId: string): Promise<CoachBroadcast | null> {
  const now = new Date();
  const [row] = await db
    .select()
    .from(coachBroadcasts)
    .where(
      and(
        eq(coachBroadcasts.tenantId, tenantId),
        eq(coachBroadcasts.active, true),
        or(isNull(coachBroadcasts.expiresAt), gt(coachBroadcasts.expiresAt, now)),
      ),
    )
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

function resolveExpiresAt(input: UpsertBroadcastInput): Date | null {
  if (input.expiresPreset) {
    return computeBroadcastExpiresAt(input.expiresPreset, input.expiresAt);
  }
  if (input.expiresAt) {
    const d = new Date(input.expiresAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return computeBroadcastExpiresAt("48h");
}

export async function upsertActiveBroadcast(
  tenantId: string,
  createdBy: string | null,
  input: UpsertBroadcastInput,
): Promise<CoachBroadcast> {
  const existing = await getLatestActiveRow(tenantId);
  const expiresAt = input.active === false ? existing?.expiresAt ?? null : resolveExpiresAt(input);

  if (existing && input.active !== false) {
    const [row] = await db
      .update(coachBroadcasts)
      .set({
        body: input.body,
        audioUrl: input.audioUrl !== undefined ? input.audioUrl : existing.audioUrl,
        videoUrl: input.videoUrl !== undefined ? input.videoUrl : existing.videoUrl,
        expiresAt,
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
    const [row] = await db
      .select()
      .from(coachBroadcasts)
      .where(eq(coachBroadcasts.id, existing.id))
      .limit(1);
    return row
      ? mapRow(row)
      : {
          id: "",
          body: "",
          audioUrl: null,
          videoUrl: null,
          expiresAt: null,
          active: false,
          createdAt: "",
          updatedAt: "",
        };
  }

  const hasContent =
    input.body.trim().length > 0 ||
    Boolean(input.audioUrl?.trim()) ||
    Boolean(input.videoUrl?.trim());

  if (!hasContent) {
    if (existing) {
      const [row] = await db
        .select()
        .from(coachBroadcasts)
        .where(eq(coachBroadcasts.id, existing.id))
        .limit(1);
      return row
        ? mapRow(row)
        : {
            id: "",
            body: "",
            audioUrl: null,
            videoUrl: null,
            expiresAt: null,
            active: false,
            createdAt: "",
            updatedAt: "",
          };
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
      videoUrl: input.videoUrl ?? null,
      expiresAt,
      active: input.active ?? true,
    })
    .returning();
  return mapRow(row);
}

export { isBroadcastVisible };
