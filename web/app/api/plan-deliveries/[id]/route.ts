import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { planDeliveries } from "@/lib/db/schema";
import {
  buildPlanDeliveryEmailHtml,
  formatFromDisplay,
  sendEmail,
} from "@/lib/notify/email";
import { buildWhatsAppClickToSendLink, buildWhatsAppPlanMessage } from "@/lib/notify/whatsapp";
import type { PlanDeliverySnapshot } from "@/lib/plans/delivery-snapshot";
import { memberDisplayName } from "@/lib/plans/delivery-snapshot";
import { deliveryUrls, getAppBaseUrl } from "@/lib/plans/delivery-urls";

type Params = { params: Promise<{ id: string }> };

async function loadDelivery(id: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(planDeliveries)
    .where(
      and(eq(planDeliveries.id, id), eq(planDeliveries.tenantId, tenantId)),
    )
    .limit(1);
  return row ?? null;
}

/**
 * PATCH actions:
 * - { action: "revoke" }
 * - { action: "mark_whatsapp_sent" }
 * - { action: "send_email" }
 * - { action: "whatsapp_link", token: string }  // rebuilds wa.me using raw token (coach-only, once)
 *
 * Note: the raw token is only returned at create time. For WhatsApp/email after
 * create, the coach UI must keep the token from the create response, or pass
 * token when requesting the link / sending email.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const row = await loadDelivery(id, user.tenantId);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { action?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  if (action === "revoke") {
    const [updated] = await db
      .update(planDeliveries)
      .set({ revokedAt: new Date() })
      .where(eq(planDeliveries.id, id))
      .returning();
    return NextResponse.json({ delivery: updated });
  }

  if (action === "mark_whatsapp_sent") {
    const [updated] = await db
      .update(planDeliveries)
      .set({ whatsappSentAt: new Date() })
      .where(eq(planDeliveries.id, id))
      .returning();
    return NextResponse.json({ delivery: updated });
  }

  if (action === "whatsapp_link") {
    if (!body.token) {
      return NextResponse.json(
        { error: "token required (from prepare response)" },
        { status: 400 },
      );
    }
    const snapshot = row.snapshotJson as PlanDeliverySnapshot;
    const baseUrl = getAppBaseUrl(request.nextUrl.origin);
    const urls = deliveryUrls(baseUrl, body.token);
    const message = buildWhatsAppPlanMessage({
      memberFirstName: snapshot.member.firstName,
      coachName: snapshot.coach.displayName,
      brandName: snapshot.branding.name ?? "Coach Platform",
      weekLabel: snapshot.weekLabel,
      pdfUrl: urls.pdfUrl,
      viewerUrl: urls.viewerUrl,
    });
    const link = buildWhatsAppClickToSendLink({
      phone: snapshot.member.phone,
      message,
    });
    if (!link.ok) {
      return NextResponse.json(
        { error: "Member phone missing or invalid (need +country code)" },
        { status: 400 },
      );
    }
    return NextResponse.json({ url: link.url, e164: link.e164, message });
  }

  if (action === "send_email") {
    if (!body.token) {
      return NextResponse.json(
        { error: "token required (from prepare response)" },
        { status: 400 },
      );
    }
    if (row.revokedAt) {
      return NextResponse.json({ error: "Delivery revoked" }, { status: 400 });
    }

    const snapshot = row.snapshotJson as PlanDeliverySnapshot;
    const baseUrl = getAppBaseUrl(request.nextUrl.origin);
    const urls = deliveryUrls(baseUrl, body.token);
    const brandName = snapshot.branding.name ?? "Coach Platform";
    const coachName = snapshot.coach.displayName;
    const { subject, html, text } = buildPlanDeliveryEmailHtml({
      brandName,
      memberName: memberDisplayName(snapshot),
      weekLabel: snapshot.weekLabel,
      pdfUrl: urls.pdfUrl,
      viewerUrl: urls.viewerUrl,
      coachName,
    });

    const fromDisplay = formatFromDisplay(
      coachName ? `${coachName} at ${brandName}` : brandName,
    );

    const result = await sendEmail({
      to: snapshot.member.email,
      subject,
      html,
      text,
      from: fromDisplay,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const [updated] = await db
      .update(planDeliveries)
      .set({ emailSentAt: new Date() })
      .where(eq(planDeliveries.id, id))
      .returning();

    return NextResponse.json({
      delivery: updated,
      dryRun: result.dryRun,
      emailId: result.id,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
