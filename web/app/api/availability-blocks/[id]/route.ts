import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { deleteBlock, getBlockById } from "@/lib/appointments/queries";
import { deleteBlockFromGoogle } from "@/lib/appointments/google-calendar";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const block = await getBlockById(id, user.tenantId, user.id);
  if (!block) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await deleteBlockFromGoogle(block);
  } catch (error) {
    console.error("[availability] Google delete failed", error);
  }
  await deleteBlock(id, user.tenantId, user.id);
  return NextResponse.json({ ok: true });
}
