import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { upsertVaultProduct } from "@/lib/vault/queries";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vaultProducts } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const [existing] = await db
    .select()
    .from(vaultProducts)
    .where(
      and(eq(vaultProducts.id, id), eq(vaultProducts.tenantId, user.tenantId)),
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const product = await upsertVaultProduct(user.tenantId, {
    id,
    familyId: existing.familyId,
    slug: body.slug ?? existing.slug,
    label: body.label ?? existing.label,
    validityDays: body.validityDays ?? existing.validityDays,
    listPriceInr: body.listPriceInr ?? existing.listPriceInr,
    salePriceInr: body.salePriceInr ?? existing.salePriceInr,
    listPriceUsd: body.listPriceUsd ?? existing.listPriceUsd,
    salePriceUsd: body.salePriceUsd ?? existing.salePriceUsd,
    includesJson: body.includesJson ?? (existing.includesJson as string[]),
    badge: body.badge ?? existing.badge,
    sortOrder: body.sortOrder ?? existing.sortOrder,
    active: body.active ?? existing.active,
  });

  return NextResponse.json(product);
}
