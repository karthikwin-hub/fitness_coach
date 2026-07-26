/**
 * Generates PDF user guides for Coach, Member, and New Member personas,
 * plus the coach how-to guide (same content as Settings download).
 * Run: npm run guides:pdf
 */
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { renderCoachHowtoGuidePdf } from "../lib/pdf/coach-howto-guide";

const BASE = process.env.GUIDE_BASE_URL ?? "http://localhost:3010";
const OUT_DIR = path.resolve(__dirname, "../../docs/guides");

type GuideSection = {
  title: string;
  body?: string[];
  links?: { label: string; path: string; note?: string }[];
  steps?: string[];
};

type Guide = {
  filename: string;
  title: string;
  subtitle: string;
  persona: string;
  sections: GuideSection[];
};

const guides: Guide[] = [
  {
    filename: "dev-sign-on-guide.pdf",
    title: "Abs-Track Dev Sign-On Guide",
    subtitle: "Switch personas locally without Firebase",
    persona: "All dev personas (coach + 5 member accounts)",
    sections: [
      {
        title: "1. Open the login page",
        steps: [
          `Go to ${BASE}/login`,
          "If you are already signed in, use Switch persona in the yellow dev banner, or open /login?switch=1",
          "The persona picker appears when Firebase is not configured",
        ],
        links: [
          { label: "Sign in / persona picker", path: "/login" },
          { label: "Force switch persona", path: "/login?switch=1" },
        ],
      },
      {
        title: "2. Coach persona",
        body: ["Full coach access — command center, members, plans, content blocks."],
        steps: [
          "Click Coach — Helna",
          "Lands on /coach",
        ],
        links: [{ label: "Command center", path: "/coach" }],
      },
      {
        title: "3. Member personas (pick one)",
        body: [
          "Each member button signs you in as a different seeded client with their own profile and API token.",
        ],
        steps: [
          "Member — Demo (Hetal plans): default demo account with full plans and check-ins",
          "Member — Hetal: pilot client USA, home training",
          "Member — Dr. Avinash: pilot client India, gym training",
          "Member — Shruti: pilot client Australia, vegetarian home training",
          "Member — New (no plans): newly onboarded member, empty dashboard",
        ],
        links: [{ label: "Member dashboard", path: "/member" }],
      },
      {
        title: "4. Dev persona quick reference",
        links: [
          { label: "Coach — Helna", path: "/login", note: "Then click Coach — Helna" },
          { label: "Member — Demo", path: "/login", note: "member@abstrack.local · has plans" },
          { label: "Member — Hetal", path: "/login", note: "hetal@abstrack.local" },
          { label: "Member — Dr. Avinash", path: "/login", note: "avinash@abstrack.local" },
          { label: "Member — Shruti", path: "/login", note: "shruti@abstrack.local" },
          { label: "Member — New", path: "/login", note: "newmember@abstrack.local · no plans" },
        ],
      },
      {
        title: "5. Switch without restarting",
        steps: [
          "Click Switch persona in the yellow dev banner on any page",
          "Or open /login?switch=1 to clear the current session",
          "Pick a different persona from the list",
          "Coach accounts cannot open /member — use a member persona for the member app",
        ],
        links: [{ label: "Switch persona", path: "/login?switch=1" }],
      },
      {
        title: "6. Re-seed profiles & data",
        steps: [
          "From the web folder run: npm run db:seed",
          "Ensures all member profiles, plans, and check-ins exist",
        ],
      },
    ],
  },
  {
    filename: "coach-user-guide.pdf",
    title: "Abs-Track Coach User Guide",
    subtitle: "For Helna and coaching staff",
    persona: "Coach (dev: Enter as Coach on /login)",
    sections: [
      {
        title: "1. Sign in",
        steps: [
          `Open ${BASE}/login`,
          "Local dev (no Firebase): click Coach — Helna",
          "Production: Continue with Google using an email listed in COACH_EMAILS",
          "You land on the Command center at /coach",
        ],
        links: [
          { label: "Sign in", path: "/login" },
          { label: "Command center", path: "/coach" },
        ],
      },
      {
        title: "2. Daily workflow — review check-ins",
        body: [
          "Review member daily check-ins (weight, sleep, meal photo, AI analysis).",
          "Each row shows 7-day sparklines, a compliance mini-ring, and Needs attention when trend rules fire.",
          "Approve or flag items that need follow-up.",
        ],
        steps: [
          "Open Command center",
          "Scan the left queue — member name, status, sparklines, and alert badges",
          "Select a check-in — review meal photo, AI summary, and today's food diary totals",
          "Add a coach note (optional) and click Save note",
          "Click Approve (animated) or Flag for follow-up",
          "On flagged or at-risk check-ins, open Quick-fix recipes to append a meal suggestion to your note",
          "Filter by member or open Full history for one client",
        ],
        links: [{ label: "Command center", path: "/coach" }],
      },
      {
        title: "3. Brand, voice & coach note (Settings)",
        body: [
          "Configure tenant accent colors and post an optional mindset note for all active members.",
          "Dual accent: separate workout (teal) and nutrition (green) colors. Single accent: one brand color with derived secondary.",
          "Coach note appears on member dashboards only when active — not required daily.",
        ],
        steps: [
          "Open Settings from the top navigation bar (visible on every coach screen)",
          "Choose Dual or Single accent mode; pick colors",
          "Configure calendar defaults and optional Google Calendar connection",
          "Enter an optional coach note (text) and optional audio URL",
          "Click Save settings — members see the note on their dashboard",
          "Download how-to guide (PDF) for a plain-language reference",
        ],
        links: [{ label: "Coach settings", path: "/coach/settings" }],
      },
      {
        title: "3b. Calendar & appointments",
        body: [
          "Custom in-app calendar for client appointments — not a Cal.com embed.",
          "Block one-off times, whole days/weeks, or recurring weekdays (e.g. every Sunday).",
          "Meeting types: in person, Google Meet (auto when Google connected), Zoom, WhatsApp, or none.",
          "Optional Google Calendar OAuth mirrors appointments and blocked time to your Google calendar.",
        ],
        steps: [
          "Open Calendar from the top navigation bar",
          "Drag-select on the week grid to create an appointment or block time",
          "Set meeting type, location, and join link defaults under Settings",
          "Connect Google Calendar under Settings for Meet links and busy-time sync",
        ],
        links: [
          { label: "Coach calendar", path: "/coach/calendar" },
          { label: "Coach settings", path: "/coach/settings" },
        ],
      },
      {
        title: "4. Member roster & profiles",
        body: [
          "View all clients by status: active, paused, or new enquiries from the quiz.",
          "At-risk clients show a Needs attention badge (sleep decline, missed check-ins, low protein).",
          "Open a full editable profile: contact, program dates, program phases, goals, health, coach notes.",
        ],
        steps: [
          "Open Members from the top navigation bar or Plan delivery → Clients tab",
          "Use tabs: Active clients | Paused / inactive | New enquiries",
          "Click a client to open their profile",
          "Set program start/end dates and edit program phase labels and date ranges",
          "Edit fields and click Save profile",
          "Review food diary summary and check-in history on the profile page",
          "Use Plan delivery on the profile to build or publish plans",
        ],
        links: [
          { label: "Members list", path: "/coach/members" },
          { label: "Example profile", path: "/coach/members/{member-id}", note: "Replace {member-id} with a client UUID from the list" },
        ],
      },
      {
        title: "5. Plan delivery",
        body: [
          "Build and publish weekly training and nutrition plans for each client.",
          "Plan delivery tabs (Clients, Content blocks, Exercise catalog, Pilot metrics) stay visible on every plan-delivery screen.",
          "When editing a client's plans, the page shows their name so you always know who you are working on.",
          "Use gym or home templates for a full week, then personalise.",
          "After publish, Prepare delivery to send one PDF pack by email, WhatsApp, or link.",
        ],
        steps: [
          "Open Plan delivery and choose a client",
          "Training: + Gym/Home template (or clone last week), edit, Save & publish",
          "Nutrition: set macros, attach content blocks, Save & publish",
          "Back on the client plan hub → Prepare delivery",
          "Preview PDF, Send email, Send on WhatsApp, or Copy link",
          "Members see a new-plan banner and can download the PDF in the app",
        ],
        links: [
          { label: "Plan delivery hub", path: "/coach/plans" },
          { label: "Training builder", path: "/coach/plans/{member-id}/training" },
          { label: "Nutrition builder", path: "/coach/plans/{member-id}/nutrition" },
          { label: "Client plan hub", path: "/coach/plans/{member-id}" },
        ],
      },
      {
        title: "5b. How-to guide PDF",
        body: [
          "Download a plain-language guide covering coach, member, and new-member journeys from Settings.",
        ],
        steps: [
          "Open Settings",
          "Click Download how-to guide (PDF)",
        ],
        links: [{ label: "Coach settings", path: "/coach/settings" }],
      },
      {
        title: "6. Content library & exercises",
        body: [
          "Reusable blocks (welcome letters, nutrition tips, quick-fix recipes) attach to nutrition plans.",
          "Success strategies and nutrition tips prioritize Abs-Track food diary; MyFitnessPal is optional.",
          "Exercise catalog: expand a row to edit or delete YouTube-linked movements.",
        ],
        steps: [
          "Content blocks: tap a block to expand, edit body text, Save changes",
          "Exercises: expand a row, edit fields, Save, or Delete",
        ],
        links: [
          { label: "Content block library", path: "/coach/content-blocks" },
          { label: "Exercise catalog", path: "/coach/exercises" },
        ],
      },
      {
        title: "7. Pilot metrics",
        body: ["Track plan publish duration and pilot KPIs for Abs-Track."],
        links: [{ label: "Pilot metrics", path: "/coach/pilot" }],
      },
      {
        title: "8. Switch persona (local dev)",
        steps: [
          "Click Switch persona in the yellow dev banner, or open /login?switch=1",
          "Pick Coach — Helna or any Member persona",
          "See dev-sign-on-guide.pdf for the full persona list",
        ],
        links: [
          { label: "Switch persona", path: "/login?switch=1" },
          { label: "Command center", path: "/coach" },
        ],
      },
      {
        title: "Coach link quick reference",
        links: [
          { label: "Command center", path: "/coach" },
          { label: "Coach settings", path: "/coach/settings" },
          { label: "Calendar", path: "/coach/calendar" },
          { label: "Members", path: "/coach/members" },
          { label: "Plan delivery", path: "/coach/plans" },
          { label: "Content blocks", path: "/coach/content-blocks" },
          { label: "Exercises", path: "/coach/exercises" },
          { label: "Pilot metrics", path: "/coach/pilot" },
          { label: "Sign in", path: "/login" },
        ],
      },
    ],
  },
  {
    filename: "member-user-guide.pdf",
    title: "Abs-Track Member User Guide",
    subtitle: "For active clients with a published plan",
    persona: "Current member (dev: Member — Demo (Hetal plans) on /login)",
    sections: [
      {
        title: "1. Sign in",
        steps: [
          `Open ${BASE}/login`,
          "Local dev: click Member — Demo (Hetal plans) or another member persona",
          "Production: Continue with Google (any email not in COACH_EMAILS)",
          "You land on your dashboard at /member",
        ],
        links: [
          { label: "Sign in", path: "/login" },
          { label: "Dashboard", path: "/member" },
        ],
      },
      {
        title: "2. Dashboard",
        body: [
          "Your home screen shows streak, weekly compliance, step goal, program phase strip, and optional note from Coach Helna.",
          "When Helna has not posted a note, no empty placeholder is shown.",
          "Streak milestones (7 and 30 days) show a brief CSS toast with Helna's message.",
        ],
        steps: [
          "Open Dashboard (bottom nav)",
          "Review program phase strip and coach note (if present)",
          "Review streak and compliance",
          "Tap Submit Today's Check-In for daily logging",
          "Tap Start workout or View full plan for details",
        ],
        links: [{ label: "Dashboard", path: "/member" }],
      },
      {
        title: "3. Daily check-in",
        body: [
          "Send weight, sleep, energy, soreness, and an optional meal photo to your coach.",
          "Optionally add the meal to your food diary from the check-in flow.",
          "AI may auto-approve high-confidence meals; others go to coach review.",
        ],
        steps: [
          "Open Check-in from dashboard button or bottom nav",
          "Tap to attach a meal photo (camera or gallery)",
          "Enter weight (kg) and sleep (hours)",
          "Adjust energy and soreness sliders",
          "Optional: check Add to food diary",
          "Tap Send to Coach Helna",
        ],
        links: [{ label: "Check-in", path: "/member/check-in" }],
      },
      {
        title: "4. Workouts",
        body: [
          "Today's session from your coach's published training plan, with exercise videos.",
          "Set completion is saved — checkboxes persist when you return.",
        ],
        steps: [
          "Open Workouts in the bottom nav",
          "Review today's label and sections (warmup, resistance, etc.)",
          "Tap an exercise to play the YouTube demo",
          "Check off sets as you complete them — progress is saved automatically",
        ],
        links: [{ label: "Workouts", path: "/member/workouts" }],
      },
      {
        title: "5. Nutrition & food diary",
        body: [
          "Weekly macro targets, attached coach content blocks, and a native Abs-Track food diary.",
          "Log meals with + Add on each meal section — search foods, enter manually, or use barcode (stub in dev).",
          "Running calorie and protein totals update as you log.",
        ],
        steps: [
          "Open Nutrition in the bottom nav",
          "Review calorie and protein targets for your week",
          "Tap + Add on Breakfast, Lunch, Dinner, or Snack",
          "Search for a food or enter manually; save to update running totals",
          "Read attached content sections (tips, guides) from your plan",
        ],
        links: [{ label: "Nutrition", path: "/member/nutrition" }],
      },
      {
        title: "6. Appointments",
        body: [
          "Book 30-minute slots with your coach. Choose one or more consecutive slots (30, 60, or 90 minutes).",
          "After booking you receive email confirmation with an ICS calendar file and an Add to Google Calendar link.",
          "Reschedule or cancel from the Appointments page. Join links appear for Google Meet, Zoom, or WhatsApp when configured.",
        ],
        steps: [
          "Open Appointments in the bottom nav",
          "Pick an available day and time slot",
          "Confirm booking — check email for calendar invite",
        ],
        links: [{ label: "Appointments", path: "/member/appointments" }],
      },
      {
        title: "7. Messages",
        body: ["Messaging with your coach."],
        links: [{ label: "Messages", path: "/member/messages" }],
      },
      {
        title: "8. Switch persona (local dev)",
        steps: [
          "Open /login?switch=1 to clear the current session",
          "Choose Member — Demo, Hetal, Avinash, Shruti, or New (no plans)",
        ],
        links: [{ label: "Switch persona", path: "/login?switch=1" }],
      },
      {
        title: "Member link quick reference",
        links: [
          { label: "Dashboard", path: "/member" },
          { label: "Check-in", path: "/member/check-in" },
          { label: "Workouts", path: "/member/workouts" },
          { label: "Nutrition", path: "/member/nutrition" },
          { label: "Appointments", path: "/member/appointments" },
          { label: "Messages", path: "/member/messages" },
          { label: "Sign in", path: "/login" },
        ],
      },
    ],
  },
  {
    filename: "new-member-user-guide.pdf",
    title: "Abs-Track New Member & Prospect Guide",
    subtitle: "From first visit to becoming a client",
    persona: "Prospect / new enquiry / newly provisioned member (no plan yet)",
    sections: [
      {
        title: "1. Discover Abs-Track",
        body: [
          "Prospects start on the marketing site, learn the philosophy, and take the qualifying quiz.",
        ],
        steps: [
          "Visit the landing page",
          "Optional: read the philosophy pillars",
          "Start the qualifying quiz",
        ],
        links: [
          { label: "Landing page", path: "/" },
          { label: "Philosophy", path: "/philosophy" },
          { label: "Qualifying quiz", path: "/quiz" },
        ],
      },
      {
        title: "2. Complete the quiz (new enquiry)",
        body: [
          "Quiz answers create a lead record visible to the coach under New enquiries.",
          "High-intent outcomes may route to Cal.com booking (when configured).",
        ],
        steps: [
          "Open /quiz",
          "Answer goal, struggle, diet, location, and commitment questions",
          "Enter email if prompted",
          "Submit — your enquiry appears in the coach Members → New enquiries tab",
        ],
        links: [{ label: "Qualifying quiz", path: "/quiz" }],
      },
      {
        title: "3. What the coach sees",
        body: [
          "Coach reviews quiz submissions and member leads before onboarding.",
        ],
        steps: [
          "Coach opens /coach/members",
          "New enquiries tab shows quiz submissions (email, intent score, goal)",
          "Coach converts lead to active client and fills profile at /coach/members/{id}",
        ],
        links: [{ label: "Coach members (coach only)", path: "/coach/members" }],
      },
      {
        title: "4. Create your account (production)",
        body: [
          "After coach invites you, sign in with Google to create your member account.",
          "First Google sign-in auto-provisions a member record (empty profile, no plans until coach publishes).",
        ],
        steps: [
          "Open /login",
          "Click Continue with Google",
          "Use an email that is NOT in the coach allowlist",
          "You arrive at /member with a blank dashboard until plans are published",
        ],
        links: [
          { label: "Sign in", path: "/login" },
          { label: "New member dashboard", path: "/member" },
        ],
      },
      {
        title: "5. Local dev — simulate new member",
        steps: [
          "Open /login?switch=1",
          "Click Member — New (no plans)",
          "Dashboard shows empty state until coach publishes plans",
          "Alternatively complete /quiz to create a coach-only lead enquiry",
        ],
        links: [
          { label: "Switch persona", path: "/login?switch=1" },
          { label: "Quiz (prospect)", path: "/quiz" },
        ],
      },
      {
        title: "6. After onboarding",
        body: [
          "Once the coach publishes training and nutrition plans, use the Member User Guide for daily workflows.",
          "Coach may post an optional note on Settings — it appears on your dashboard when active.",
          "Log food in Nutrition even before your first plan is published.",
        ],
        links: [
          { label: "Member dashboard", path: "/member" },
          { label: "First check-in", path: "/member/check-in" },
        ],
      },
      {
        title: "Prospect & new member link quick reference",
        links: [
          { label: "Landing", path: "/" },
          { label: "Philosophy", path: "/philosophy" },
          { label: "Quiz", path: "/quiz" },
          { label: "Sign in", path: "/login" },
          { label: "Member dashboard", path: "/member" },
          { label: "Check-in", path: "/member/check-in" },
        ],
      },
    ],
  },
];

function urlFor(path: string): string {
  if (path.startsWith("http")) return path;
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function renderGuide(doc: InstanceType<typeof PDFDocument>, guide: Guide) {
  const margin = 50;
  const pageWidth = doc.page.width - margin * 2;

  doc.fontSize(22).fillColor("#0d3d38").text(guide.title, margin, margin, { width: pageWidth });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#333").text(guide.subtitle);
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#666").text(`Persona: ${guide.persona}`);
  doc.text(`Base URL: ${BASE}`);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`);
  doc.moveDown(1.5);

  for (const section of guide.sections) {
    if (doc.y > doc.page.height - 120) doc.addPage();

    doc.fontSize(14).fillColor("#16B1A9").text(section.title, margin, doc.y, { width: pageWidth });
    doc.moveDown(0.4);

    if (section.body) {
      doc.fontSize(10).fillColor("#333");
      for (const para of section.body) {
        doc.text(para, margin, doc.y, { width: pageWidth, align: "left" });
        doc.moveDown(0.3);
      }
    }

    if (section.steps) {
      doc.fontSize(10).fillColor("#333").text("Steps:", margin, doc.y);
      doc.moveDown(0.2);
      section.steps.forEach((step, i) => {
        if (doc.y > doc.page.height - 80) doc.addPage();
        doc.text(`${i + 1}. ${step}`, margin + 10, doc.y, { width: pageWidth - 10 });
        doc.moveDown(0.2);
      });
      doc.moveDown(0.3);
    }

    if (section.links) {
      doc.fontSize(10).fillColor("#333").text("Links:", margin, doc.y);
      doc.moveDown(0.2);
      for (const link of section.links) {
        if (doc.y > doc.page.height - 60) doc.addPage();
        const href = urlFor(link.path);
        doc.fillColor("#333").text(`• ${link.label}`, margin + 10, doc.y, { width: pageWidth - 10 });
        doc.fillColor("#0066cc").text(`  ${href}`, margin + 20, doc.y, {
          width: pageWidth - 20,
          link: href,
          underline: true,
        });
        if (link.note) {
          doc.fillColor("#666").text(`  (${link.note})`, margin + 20, doc.y, { width: pageWidth - 20 });
        }
        doc.moveDown(0.15);
      }
      doc.moveDown(0.4);
    }

    doc.moveDown(0.5);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const guide of guides) {
    const outPath = path.join(OUT_DIR, guide.filename);
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    renderGuide(doc, guide);
    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on("finish", () => {
        console.log(`Wrote ${outPath}`);
        resolve();
      });
      stream.on("error", reject);
    });
  }

  const howtoPath = path.join(OUT_DIR, "abstrack-how-to-guide.pdf");
  fs.writeFileSync(howtoPath, await renderCoachHowtoGuidePdf());
  console.log(`Wrote ${howtoPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
