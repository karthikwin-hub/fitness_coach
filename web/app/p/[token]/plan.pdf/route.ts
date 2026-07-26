import { NextRequest, NextResponse } from "next/server";
import type { PlanDeliverySnapshot } from "@/lib/plans/delivery-snapshot";
import {
  recordDeliveryOpen,
  resolveDeliveryToken,
} from "@/lib/plans/delivery-tokens";
import { deliveryUrls, getAppBaseUrl } from "@/lib/plans/delivery-urls";
import { renderPlanPackPdf } from "@/lib/pdf/plan-pack";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const resolved = await resolveDeliveryToken(token);

  if (!resolved.ok) {
    const status =
      resolved.reason === "not_found"
        ? 404
        : resolved.reason === "revoked" || resolved.reason === "expired"
          ? 403
          : 404;
    return NextResponse.json(
      { error: resolved.reason.replace("_", " ") },
      { status },
    );
  }

  await recordDeliveryOpen(resolved.delivery.id);

  const snapshot = resolved.delivery.snapshot as PlanDeliverySnapshot;
  const baseUrl = getAppBaseUrl(request.nextUrl.origin);
  const urls = deliveryUrls(baseUrl, token);
  const buffer = await renderPlanPackPdf(snapshot, urls, token);

  const filename = `${snapshot.weekLabel
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()}-plan.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
