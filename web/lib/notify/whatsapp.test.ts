import { describe, expect, it } from "vitest";
import {
  buildWhatsAppBroadcastMessage,
  buildWhatsAppCheckInFeedbackMessage,
  buildWhatsAppClickToSendLink,
  buildWhatsAppPlanMessage,
  sendWhatsAppText,
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

describe("buildWhatsAppBroadcastMessage", () => {
  it("includes note body and dashboard link", () => {
    const msg = buildWhatsAppBroadcastMessage({
      memberFirstName: "Sarah",
      coachName: "Helna",
      brandName: "Abs-Track",
      body: "Great week!",
      dashboardUrl: "https://example.com/member",
    });
    expect(msg).toContain("Sarah");
    expect(msg).toContain("Great week!");
    expect(msg).toContain("https://example.com/member");
  });
});

describe("buildWhatsAppCheckInFeedbackMessage", () => {
  it("includes coach note and voice link", () => {
    const msg = buildWhatsAppCheckInFeedbackMessage({
      memberFirstName: "Sarah",
      coachName: "Helna",
      brandName: "Abs-Track",
      coachNote: "Solid week",
      dashboardUrl: "https://example.com/member",
      voiceNoteUrl: "https://example.com/voice.webm",
    });
    expect(msg).toContain("Solid week");
    expect(msg).toContain("https://example.com/voice.webm");
  });
});

describe("sendWhatsAppText", () => {
  it("dry-runs when cloud credentials are unset", async () => {
    const result = await sendWhatsAppText({
      phone: "+14155550142",
      message: "Test",
    });
    expect(result).toEqual({ ok: true, dryRun: true });
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
