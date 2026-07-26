/**
 * Simple, non-technical Abs-Track how-to guide for coaches.
 * Covers coach, active member, and new-member journeys in plain language.
 */
import PDFDocument from "pdfkit";

const TEAL = "#16B1A9";
const DARK = "#0d3d38";

type Section = {
  heading: string;
  intro?: string;
  bullets?: string[];
};

const SECTIONS: Section[] = [
  {
    heading: "Welcome",
    intro:
      "This short guide explains how Abs-Track works for you (the coach) and for your clients. Keep it handy when onboarding someone new or answering “where do I…?” questions.",
  },
  {
    heading: "For you — the coach",
    intro: "Sign in with your coach Google account (or Coach — Helna in local testing).",
    bullets: [
      "Command center: review daily check-ins, meal photos, and approve or flag what needs a note.",
      "Members: open a client’s profile to see goals, health notes, program dates, and messages.",
      "Plans: open Plan delivery → pick a client → build or update training and nutrition for the week.",
      "Templates: use + Gym template or + Home template to start from a full week, then tweak for that person.",
      "Publish: when the week looks right, Save & publish training and nutrition.",
      "Send the plan: on the client plan page, Prepare delivery → Preview PDF, email, WhatsApp, or copy the link.",
      "Settings: set brand colours and an optional note that appears on every member’s home screen.",
      "Download this guide anytime from Settings (coach only).",
    ],
  },
  {
    heading: "Sending a weekly plan (coach)",
    intro: "Publishing and sending are two steps — publish first, then deliver.",
    bullets: [
      "Publish the training week and nutrition week for that client.",
      "Open their plan hub → Prepare delivery (one pack covers both).",
      "Preview the PDF — cover, guidelines, workouts, nutrition, grocery table.",
      "Email sends a link (needs email configured). WhatsApp opens a ready-to-send message.",
      "The link lets the client open the plan without signing in. They sign in to log workouts and food.",
    ],
  },
  {
    heading: "For active members (your clients)",
    intro: "Clients sign in with Google and land on their home dashboard.",
    bullets: [
      "Home: streak, progress, today’s focus, and your optional coach note.",
      "Check-in: weight, sleep, energy, soreness, and an optional meal photo — sent to you.",
      "Workouts: today’s session with videos; tick sets as they go (saved automatically).",
      "Nutrition: calorie/protein targets, tips from you, and a food diary (search or add manually).",
      "Messages: chat with you in the app.",
      "New plan banner: when you deliver a week, they see a notice and can download the PDF.",
      "Magic link from WhatsApp/email: open the plan pack and QR on the cover; sign in for logging.",
    ],
  },
  {
    heading: "For someone new (no plan yet)",
    intro: "Prospects and brand-new members see a quieter app until you publish their first week.",
    bullets: [
      "Prospects: landing page → philosophy → short quiz. High-intent leads appear under Members → New enquiries.",
      "New member account: they sign in with Google and get an empty dashboard.",
      "They can still message you and start a food diary.",
      "Once you publish training + nutrition (and optionally deliver the PDF), their home, workouts, and nutrition fill in.",
    ],
  },
  {
    heading: "Quick tips",
    bullets: [
      "Always publish before Prepare delivery — delivery uses the published week.",
      "Personal details (goals, allergies) flow into the welcome letter and health notes on the PDF.",
      "Grocery list prints as a neat table so it fits on one page for shopping.",
      "If a WhatsApp or email link stops working, prepare a new delivery (old links can expire when revoked).",
    ],
  },
];

export async function renderCoachHowtoGuidePdf(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4", autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 96;

    doc.fontSize(20).fillColor(DARK).text("Abs-Track — How to use the app", {
      width: pageWidth,
    });
    doc.moveDown(0.35);
    doc
      .fontSize(11)
      .fillColor("#555555")
      .text("A simple guide for coaches and the people they coach", {
        width: pageWidth,
      });
    doc.moveDown(0.2);
    doc
      .fontSize(9)
      .fillColor("#888888")
      .text(`Updated ${new Date().toLocaleDateString()}  ·  Coach download only`, {
        width: pageWidth,
      });
    doc.moveDown(1);

    for (const section of SECTIONS) {
      if (doc.y > doc.page.height - 120) doc.addPage();

      doc.fontSize(13).fillColor(TEAL).text(section.heading, { width: pageWidth });
      doc.moveDown(0.35);

      if (section.intro) {
        doc.fontSize(10).fillColor("#333333").text(section.intro, {
          width: pageWidth,
          lineGap: 2,
        });
        doc.moveDown(0.4);
      }

      if (section.bullets) {
        for (const bullet of section.bullets) {
          if (doc.y > doc.page.height - 72) doc.addPage();
          doc.fontSize(10).fillColor("#333333").text(`•  ${bullet}`, {
            width: pageWidth,
            lineGap: 2,
          });
          doc.moveDown(0.25);
        }
      }

      doc.moveDown(0.55);
    }

    doc.end();
  });
}
