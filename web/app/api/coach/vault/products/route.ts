import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { getVaultFamilyForCoach, upsertVaultProduct } from "@/lib/vault/queries";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const familyId = body?.familyId as string | undefined;
  if (!familyId || !body?.slug || !body?.label) {
    return NextResponse.json({ error: "Invalid product payload" }, { status: 400 });
  }

  const family = await getVaultFamilyForCoach(user.tenantId, familyId);
  if (!family) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }

  const product = await upsertVaultProduct(user.tenantId, {
    familyId,
    slug: String(body.slug).trim().toLowerCase(),
    label: String(body.label).trim(),
    validityDays: Number(body.validityDays) || 90,
    listPriceInr: body.listPriceInr != null ? Number(body.listPriceInr) : null,
    salePriceInr: Number(body.salePriceInr) || 0,
    listPriceUsd: body.listPriceUsd != null ? Number(body.listPriceUsd) : null,
    salePriceUsd: Number(body.salePriceUsd) || 0,
    includesJson: Array.isArray(body.includesJson) ? body.includesJson : [],
    badge: body.badge ?? null,
    sortOrder: Number(body.sortOrder) || 0,
    active: body.active !== false,
  });

  return NextResponse.json(product, { status: 201 });
}
