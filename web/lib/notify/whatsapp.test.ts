import { describe, expect, it } from "vitest";
import {
  buildWhatsAppClickToSendLink,
  buildWhatsAppPlanMessage,
} from "@/lib/notify/whatsapp";

describe("buildWhatsAppPlanMessage", () => {
  it("includes pdf and viewer urls", () => {
    const msg = buildWhatsAppPlanMessage({
      memberFirstName: "Hetal",
      coachName: "Helna",
      brandName: "Abs-Track",
      weekLabel: "Week 7",
      pdfUrl: "https://example.com/p/tok/plan.pdf",
      viewerUrl: "https://example.com/p/tok",
    });
    expect(msg).toContain("Hi Hetal");
    expect(msg).toContain("Week 7");
    expect(msg).toContain("https://example.com/p/tok/plan.pdf");
    expect(msg).toContain("https://example.com/p/tok");
  });
});

describe("buildWhatsAppClickToSendLink", () => {
  it("builds wa.me url for valid phone", () => {
    const result = buildWhatsAppClickToSendLink({
      phone: "+1 415 555 0142",
      message: "Hello",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toMatch(/^https:\/\/wa\.me\/14155550142\?text=/);
      expect(result.e164).toBe("+14155550142");
    }
  });

  it("fails without country code", () => {
    const result = buildWhatsAppClickToSendLink({
      phone: "4155550142",
      message: "Hello",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_phone" });
  });
});
