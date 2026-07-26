import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import {
  listVaultFamiliesForCoach,
  upsertVaultFamily,
} from "@/lib/vault/queries";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const families = await listVaultFamiliesForCoach(user.tenantId);
  return NextResponse.json(families);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.slug || !body?.title) {
    return NextResponse.json({ error: "slug and title required" }, { status: 400 });
  }

  const family = await upsertVaultFamily(user.tenantId, {
    slug: String(body.slug).trim().toLowerCase(),
    title: String(body.title).trim(),
    subtitle: body.subtitle ?? null,
    description: body.description ?? null,
    heroJson: body.heroJson ?? {},
    sortOrder: Number(body.sortOrder) || 0,
    published: Boolean(body.published),
  });

  return NextResponse.json(family, { status: 201 });
}
