import { afterEach, describe, expect, it } from "vitest";
import {
  buildPlanDeliveryEmailHtml,
  clearLastDryRunEmail,
  formatFromDisplay,
  getLastDryRunEmail,
  sendEmail,
} from "@/lib/notify/email";

afterEach(() => {
  clearLastDryRunEmail();
  delete process.env.RESEND_API_KEY;
});

describe("sendEmail dry-run", () => {
  it("captures payload when RESEND_API_KEY is unset", async () => {
    const result = await sendEmail({
      to: "member@example.com",
      subject: "Your Week 7 plan",
      html: "<p>Hi</p>",
      text: "Hi",
    });
    expect(result).toEqual({ ok: true, dryRun: true });
    const captured = getLastDryRunEmail();
    expect(captured?.to).toBe("member@example.com");
    expect(captured?.subject).toBe("Your Week 7 plan");
    expect(captured?.from).toBeTruthy();
  });
});

describe("buildPlanDeliveryEmailHtml", () => {
  it("builds subject and links", () => {
    const { subject, html, text } = buildPlanDeliveryEmailHtml({
      brandName: "Abs-Track",
      memberName: "Hetal",
      weekLabel: "Week 7",
      pdfUrl: "https://example.com/p/t/plan.pdf",
      viewerUrl: "https://example.com/p/t",
      coachName: "Helna",
    });
    expect(subject).toContain("Week 7");
    expect(subject).toContain("Helna");
    expect(html).toContain("https://example.com/p/t/plan.pdf");
    expect(text).toContain("Open in app");
  });
});

describe("formatFromDisplay", () => {
  it("formats display name safely", () => {
    expect(formatFromDisplay("Helna at Abs-Track", "plans@example.com")).toBe(
      "Helna at Abs-Track <plans@example.com>",
    );
  });
});
