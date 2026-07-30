import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, users } from "@/lib/db/schema";
import { resolvePlayableMediaUrl } from "@/lib/firebase/admin-storage";
import { getAppBaseUrl } from "@/lib/plans/delivery-urls";
import {
  buildWhatsAppBroadcastMessage,
  buildWhatsAppCheckInFeedbackMessage,
  sendWhatsAppText,
  type WhatsAppSendResult,
} from "@/lib/notify/whatsapp";

export type WhatsAppDeliverySummary = {
  attempted: number;
  sent: number;
  dryRun: number;
  skipped: number;
  failures: Array<{ memberId: string; error: string }>;
};

export async function listWhatsAppOptInMembers(tenantId: string) {
  return db
    .select({
      memberId: members.id,
      firstName: members.firstName,
      phone: members.phone,
      displayName: users.displayName,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(
      and(
        eq(members.tenantId, tenantId),
        eq(members.status, "active"),
        eq(members.whatsappUpdatesOptIn, true),
      ),
    );
}

function emptySummary(): WhatsAppDeliverySummary {
  return { attempted: 0, sent: 0, dryRun: 0, skipped: 0, failures: [] };
}

function tallyResult(
  summary: WhatsAppDeliverySummary,
  memberId: string,
  result: WhatsAppSendResult,
) {
  summary.attempted += 1;
  if (!result.ok) {
    summary.failures.push({ memberId, error: result.error });
    return;
  }
  if (result.dryRun) summary.dryRun += 1;
  else summary.sent += 1;
}

export async function notifyBroadcastViaWhatsApp(opts: {
  tenantId: string;
  brandName: string;
  coachName: string | null;
  body: string;
  audioUrl?: string | null;
  videoUrl?: string | null;
  requestOrigin?: string | null;
}): Promise<WhatsAppDeliverySummary> {
  const summary = emptySummary();
  const dashboardUrl = `${getAppBaseUrl(opts.requestOrigin)}/member`;
  const [playableAudio, playableVideo] = await Promise.all([
    opts.audioUrl ? resolvePlayableMediaUrl(opts.audioUrl) : Promise.resolve(null),
    opts.videoUrl ? resolvePlayableMediaUrl(opts.videoUrl) : Promise.resolve(null),
  ]);

  const recipients = await listWhatsAppOptInMembers(opts.tenantId);
  for (const member of recipients) {
    if (!member.phone?.trim()) {
      summary.skipped += 1;
      continue;
    }

    const message = buildWhatsAppBroadcastMessage({
      memberFirstName: member.firstName,
      coachName: opts.coachName,
      brandName: opts.brandName,
      body: opts.body,
      dashboardUrl,
      audioUrl: playableAudio,
      videoUrl: playableVideo,
    });

    tallyResult(
      summary,
      member.memberId,
      await sendWhatsAppText({ phone: member.phone, message }),
    );
  }

  return summary;
}

export async function notifyCheckInFeedbackViaWhatsApp(opts: {
  tenantId: string;
  memberId: string;
  brandName: string;
  coachName: string | null;
  coachNote: string | null;
  coachVoiceNoteUrl?: string | null;
  requestOrigin?: string | null;
}): Promise<WhatsAppDeliverySummary> {
  const summary = emptySummary();

  const [member] = await db
    .select({
      memberId: members.id,
      firstName: members.firstName,
      phone: members.phone,
      whatsappUpdatesOptIn: members.whatsappUpdatesOptIn,
      status: members.status,
    })
    .from(members)
    .where(and(eq(members.id, opts.memberId), eq(members.tenantId, opts.tenantId)))
    .limit(1);

  if (!member || member.status !== "active" || !member.whatsappUpdatesOptIn) {
    summary.skipped += 1;
    return summary;
  }

  if (!member.phone?.trim()) {
    summary.skipped += 1;
    return summary;
  }

  const dashboardUrl = `${getAppBaseUrl(opts.requestOrigin)}/member`;
  const voiceNoteUrl = opts.coachVoiceNoteUrl
    ? await resolvePlayableMediaUrl(opts.coachVoiceNoteUrl)
    : null;

  const message = buildWhatsAppCheckInFeedbackMessage({
    memberFirstName: member.firstName,
    coachName: opts.coachName,
    brandName: opts.brandName,
    coachNote: opts.coachNote,
    dashboardUrl,
    voiceNoteUrl,
  });

  tallyResult(
    summary,
    member.memberId,
    await sendWhatsAppText({ phone: member.phone, message }),
  );

  return summary;
}
