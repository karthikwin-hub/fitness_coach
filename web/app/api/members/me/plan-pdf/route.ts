import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { getMemberByUserId } from "@/lib/members/queries";
import type { PlanDeliverySnapshot } from "@/lib/plans/delivery-snapshot";
import { getLatestActiveDeliveryForMember } from "@/lib/plans/delivery-tokens";
import { deliveryUrls, getAppBaseUrl } from "@/lib/plans/delivery-urls";
import { renderPlanPackPdf } from "@/lib/pdf/plan-pack";

/**
 * Signed-in member downloads their latest plan PDF.
 * Re-renders from the stored snapshot (immutable). Uses a placeholder token
 * segment in exercise watch links pointing at the signed-in app routes via
 * a synthetic "member" base — watch links go to /member/workouts.
 */
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
    return NextResponse.json(
      { error: "No delivered plan yet" },
      { status: 404 },
    );
  }

  const snapshot = delivery.snapshotJson as PlanDeliverySnapshot;
  const baseUrl = getAppBaseUrl(request.nextUrl.origin);
  // Member-authenticated PDF: deep links go to signed-in routes.
  const urls = {
    baseUrl,
    viewerUrl: `${baseUrl}/member/workouts`,
    pdfUrl: `${baseUrl}/api/members/me/plan-pdf`,
    workoutDeepLink: `${baseUrl}/member/workouts`,
  };

  const buffer = await renderPlanPackPdf(snapshot, urls, "unused");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${snapshot.weekLabel
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()}-plan.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
