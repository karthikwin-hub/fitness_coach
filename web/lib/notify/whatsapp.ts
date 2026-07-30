import { e164Digits, normalizeToE164 } from "@/lib/notify/phone";

export type WhatsAppLinkResult =
  | { ok: true; url: string; e164: string }
  | { ok: false; reason: "invalid_phone" };

export type WhatsAppSendResult =
  | { ok: true; dryRun: boolean; messageId?: string }
  | { ok: false; error: string };

export function buildWhatsAppPlanMessage(opts: {
  memberFirstName: string | null;
  coachName: string | null;
  brandName: string;
  weekLabel: string;
  pdfUrl: string;
  viewerUrl: string;
}): string {
  const hello = opts.memberFirstName
    ? `Hi ${opts.memberFirstName}`
    : "Hi there";
  const from = opts.coachName
    ? `${opts.coachName} at ${opts.brandName}`
    : opts.brandName;

  return [
    `${hello}! Your ${opts.weekLabel} plan from ${from} is ready.`,
    "",
    `PDF: ${opts.pdfUrl}`,
    `Open in app: ${opts.viewerUrl}`,
    "",
    "Tap the links anytime — no sign-in needed to view your plan.",
  ].join("\n");
}

/**
 * Build a click-to-send wa.me URL. Does not send anything automatically.
 */
export function buildWhatsAppClickToSendLink(opts: {
  phone: string | null | undefined;
  message: string;
}): WhatsAppLinkResult {
  const e164 = normalizeToE164(opts.phone);
  if (!e164) return { ok: false, reason: "invalid_phone" };

  const url = `https://wa.me/${e164Digits(e164)}?text=${encodeURIComponent(opts.message)}`;
  return { ok: true, url, e164 };
}

export function buildWhatsAppBroadcastMessage(opts: {
  memberFirstName: string | null;
  coachName: string | null;
  brandName: string;
  body: string;
  dashboardUrl: string;
  audioUrl?: string | null;
  videoUrl?: string | null;
}): string {
  const hello = opts.memberFirstName ? `Hi ${opts.memberFirstName}` : "Hi there";
  const from = opts.coachName ? `${opts.coachName} at ${opts.brandName}` : opts.brandName;
  const lines = [`${hello}! New note from ${from}:`, "", opts.body.trim() || "(Voice or video note — open the app to listen/watch.)"];
  if (opts.audioUrl) lines.push("", `Voice note: ${opts.audioUrl}`);
  if (opts.videoUrl) lines.push("", `Video: ${opts.videoUrl}`);
  lines.push("", `Open your dashboard: ${opts.dashboardUrl}`);
  return lines.join("\n");
}

export function buildWhatsAppCheckInFeedbackMessage(opts: {
  memberFirstName: string | null;
  coachName: string | null;
  brandName: string;
  coachNote: string | null;
  dashboardUrl: string;
  voiceNoteUrl?: string | null;
}): string {
  const hello = opts.memberFirstName ? `Hi ${opts.memberFirstName}` : "Hi there";
  const from = opts.coachName ? `${opts.coachName} at ${opts.brandName}` : opts.brandName;
  const lines = [`${hello}! ${from} left feedback on your check-in:`];
  if (opts.coachNote?.trim()) {
    lines.push("", opts.coachNote.trim());
  } else {
    lines.push("", "Open the app to listen to your coach's voice note.");
  }
  if (opts.voiceNoteUrl) lines.push("", `Voice note: ${opts.voiceNoteUrl}`);
  lines.push("", `View in app: ${opts.dashboardUrl}`);
  return lines.join("\n");
}

/** Send a WhatsApp text via Meta Cloud API, or dry-run when credentials are unset. */
export async function sendWhatsAppText(opts: {
  phone: string | null | undefined;
  message: string;
}): Promise<WhatsAppSendResult> {
  const e164 = normalizeToE164(opts.phone);
  if (!e164) return { ok: false, error: "invalid_phone" };

  const accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.info("[whatsapp] dry-run", {
      to: e164,
      preview: opts.message.slice(0, 120),
    });
    return { ok: true, dryRun: true };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: e164Digits(e164),
        type: "text",
        text: { body: opts.message },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, error: `WhatsApp API ${res.status}: ${detail}` };
    }

    const data = (await res.json()) as { messages?: Array<{ id?: string }> };
    return { ok: true, dryRun: false, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
