import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { replaceVaultProductItems } from "@/lib/vault/queries";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vaultProducts } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
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
  const items = Array.isArray(body?.items) ? body.items : [];
  const saved = await replaceVaultProductItems(id, items);
  return NextResponse.json(saved);
}
