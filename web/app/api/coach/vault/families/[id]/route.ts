import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import {
  deleteVaultFamily,
  getVaultFamilyForCoach,
  upsertVaultFamily,
} from "@/lib/vault/queries";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const family = await getVaultFamilyForCoach(user.tenantId, id);
  if (!family) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(family);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const existing = await getVaultFamilyForCoach(user.tenantId, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const family = await upsertVaultFamily(user.tenantId, {
    id,
    slug: body.slug ?? existing.slug,
    title: body.title ?? existing.title,
    subtitle: body.subtitle ?? existing.subtitle,
    description: body.description ?? existing.description,
    heroJson: body.heroJson ?? existing.heroJson,
    sortOrder: body.sortOrder ?? existing.sortOrder,
    published: body.published ?? existing.published,
  });

  return NextResponse.json(family);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await deleteVaultFamily(user.tenantId, id);
  return NextResponse.json({ ok: true });
}
