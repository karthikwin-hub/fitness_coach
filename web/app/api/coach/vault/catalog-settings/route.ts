import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import {
  getVaultCatalogMarketing,
  upsertVaultCatalogMarketing,
} from "@/lib/vault/queries";
import type { VaultCatalogMarketing } from "@/lib/vault/types";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const marketing = await getVaultCatalogMarketing(user.tenantId);
  return NextResponse.json(marketing);
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | Partial<VaultCatalogMarketing>
    | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const marketing = await upsertVaultCatalogMarketing(user.tenantId, body);
  return NextResponse.json(marketing);
}
