export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export type EmailResult =
  | { ok: true; dryRun: boolean; id?: string }
  | { ok: false; error: string };

/** Last dry-run payload — used by tests when RESEND_API_KEY is unset. */
let lastDryRun: EmailPayload | null = null;

export function getLastDryRunEmail(): EmailPayload | null {
  return lastDryRun;
}

export function clearLastDryRunEmail(): void {
  lastDryRun = null;
}

function defaultFrom(): string {
  return process.env.EMAIL_FROM ?? "plans@abstrack.duckdns.org";
}

export function formatFromDisplay(displayName: string, email?: string): string {
  const addr = email ?? defaultFrom();
  const safe = displayName.replace(/[<>"]/g, "").trim() || "Coach";
  return `${safe} <${addr}>`;
}

/**
 * Send email via Resend REST API. Falls back to dry-run (log + capture)
 * when RESEND_API_KEY is unset so local/dev/tests work without credentials.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const from = payload.from ?? defaultFrom();
  const body = {
    from,
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
    ...(payload.text ? { text: payload.text } : {}),
  };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    lastDryRun = { ...payload, from };
    console.info("[email] dry-run", {
      to: payload.to,
      subject: payload.subject,
      from,
    });
    return { ok: true, dryRun: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${detail}` };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, dryRun: false, id: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function buildPlanDeliveryEmailHtml(opts: {
  brandName: string;
  memberName: string;
  weekLabel: string;
  pdfUrl: string;
  viewerUrl: string;
  coachName: string | null;
}): { subject: string; html: string; text: string } {
  const fromLabel = opts.coachName
    ? `${opts.coachName} at ${opts.brandName}`
    : opts.brandName;
  const subject = `Your ${opts.weekLabel} plan from ${fromLabel}`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; color: #1e1e1e; line-height: 1.5;">
  <p>Hi ${escapeHtml(opts.memberName)},</p>
  <p>Your <strong>${escapeHtml(opts.weekLabel)}</strong> plan is ready.</p>
  <p>
    <a href="${escapeAttr(opts.pdfUrl)}" style="display:inline-block;background:#1D6468;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">
      Download PDF
    </a>
  </p>
  <p>Or <a href="${escapeAttr(opts.viewerUrl)}">open your plan in the app</a> (no sign-in needed to view).</p>
  <p style="color:#666;font-size:13px;">— ${escapeHtml(fromLabel)}</p>
</body>
</html>`.trim();

  const text = [
    `Hi ${opts.memberName},`,
    "",
    `Your ${opts.weekLabel} plan is ready.`,
    "",
    `PDF: ${opts.pdfUrl}`,
    `Open in app: ${opts.viewerUrl}`,
    "",
    `— ${fromLabel}`,
  ].join("\n");

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
