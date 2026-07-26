import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { getMemberByUserId } from "@/lib/members/queries";
import { getLatestActiveDeliveryForMember } from "@/lib/plans/delivery-tokens";

/** Latest active plan delivery metadata for the signed-in member (banner + download). */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== "member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const delivery = await getLatestActiveDeliveryForMember(
    member.id,
    user.tenantId,
  );

  if (!delivery) {
    return NextResponse.json({ delivery: null });
  }

  return NextResponse.json({
    delivery: {
      id: delivery.id,
      weekLabel: delivery.weekLabel,
      createdAt: delivery.createdAt,
      firstOpenedAt: delivery.firstOpenedAt,
    },
  });
}
