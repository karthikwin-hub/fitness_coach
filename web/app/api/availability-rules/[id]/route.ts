import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import {
  deleteAvailabilityRule,
  getAvailabilityRuleById,
} from "@/lib/appointments/queries";
import { deleteRuleFromGoogle } from "@/lib/appointments/google-calendar";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const rule = await getAvailabilityRuleById(id, user.tenantId, user.id);
  if (!rule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await deleteRuleFromGoogle(rule);
  } catch (error) {
    console.error("[availability] recurring Google delete failed", error);
  }
  await deleteAvailabilityRule(id, user.tenantId, user.id);
  return NextResponse.json({ ok: true });
}
