import { e164Digits, normalizeToE164 } from "@/lib/notify/phone";

export type WhatsAppLinkResult =
  | { ok: true; url: string; e164: string }
  | { ok: false; reason: "invalid_phone" };

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
