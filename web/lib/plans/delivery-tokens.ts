import { createHash, randomBytes } from "crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { planDeliveries } from "@/lib/db/schema";
import type { PlanDeliverySnapshot } from "@/lib/plans/delivery-snapshot";

export const DELIVERY_TOKEN_BYTES = 32;
export const DELIVERY_EXPIRY_DAYS = 120;

export type ResolvedDelivery = {
  id: string;
  tenantId: string;
  memberId: string;
  weekLabel: string;
  snapshot: PlanDeliverySnapshot;
  expiresAt: Date;
  revokedAt: Date | null;
};

export function mintDeliveryToken(): string {
  return randomBytes(DELIVERY_TOKEN_BYTES).toString("base64url");
}

export function hashDeliveryToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function deliveryExpiresAt(from = new Date()): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + DELIVERY_EXPIRY_DAYS);
  return d;
}

export function isDeliveryExpired(
  expiresAt: Date,
  now = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function isDeliveryRevoked(revokedAt: Date | null): boolean {
  return revokedAt != null;
}

/**
 * Resolve a raw delivery token to its snapshot.
 * Never returns an AuthUser — read-only delivery access only.
 */
export async function resolveDeliveryToken(
  token: string,
): Promise<
  | { ok: true; delivery: ResolvedDelivery }
  | { ok: false; reason: "not_found" | "expired" | "revoked" }
> {
  if (!token || token.length < 16) {
    return { ok: false, reason: "not_found" };
  }

  const tokenHash = hashDeliveryToken(token);
  const [row] = await db
    .select()
    .from(planDeliveries)
    .where(eq(planDeliveries.tokenHash, tokenHash))
    .limit(1);

  if (!row) return { ok: false, reason: "not_found" };
  if (isDeliveryRevoked(row.revokedAt)) {
    return { ok: false, reason: "revoked" };
  }
  if (isDeliveryExpired(row.expiresAt)) {
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    delivery: {
      id: row.id,
      tenantId: row.tenantId,
      memberId: row.memberId,
      weekLabel: row.weekLabel,
      snapshot: row.snapshotJson as PlanDeliverySnapshot,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
    },
  };
}

export async function recordDeliveryOpen(deliveryId: string): Promise<void> {
  await db
    .update(planDeliveries)
    .set({
      openCount: sql`${planDeliveries.openCount} + 1`,
      firstOpenedAt: sql`coalesce(${planDeliveries.firstOpenedAt}, now())`,
    })
    .where(eq(planDeliveries.id, deliveryId));
}

export async function listDeliveriesForMember(
  memberId: string,
  tenantId: string,
) {
  return db
    .select({
      id: planDeliveries.id,
      weekLabel: planDeliveries.weekLabel,
      trainingPlanId: planDeliveries.trainingPlanId,
      nutritionPlanId: planDeliveries.nutritionPlanId,
      expiresAt: planDeliveries.expiresAt,
      revokedAt: planDeliveries.revokedAt,
      emailSentAt: planDeliveries.emailSentAt,
      whatsappSentAt: planDeliveries.whatsappSentAt,
      firstOpenedAt: planDeliveries.firstOpenedAt,
      openCount: planDeliveries.openCount,
      createdAt: planDeliveries.createdAt,
    })
    .from(planDeliveries)
    .where(
      and(
        eq(planDeliveries.memberId, memberId),
        eq(planDeliveries.tenantId, tenantId),
      ),
    )
    .orderBy(desc(planDeliveries.createdAt));
}

export async function getLatestActiveDeliveryForMember(
  memberId: string,
  tenantId: string,
) {
  const [row] = await db
    .select()
    .from(planDeliveries)
    .where(
      and(
        eq(planDeliveries.memberId, memberId),
        eq(planDeliveries.tenantId, tenantId),
        isNull(planDeliveries.revokedAt),
      ),
    )
    .orderBy(desc(planDeliveries.createdAt))
    .limit(1);

  if (!row) return null;
  if (isDeliveryExpired(row.expiresAt)) return null;
  return row;
}
