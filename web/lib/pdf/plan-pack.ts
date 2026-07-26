import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import {
  memberDisplayName,
  type PlanDeliverySnapshot,
  type SnapshotBlock,
  type SnapshotDay,
  type SnapshotExercise,
  type SnapshotSection,
} from "@/lib/plans/delivery-snapshot";
import { toPdfSafeText } from "@/lib/plans/template-vars";

export type PlanPackUrls = {
  viewerUrl: string;
  pdfUrl: string;
  baseUrl: string;
  workoutDeepLink?: string;
};

/** 16:9 landscape — matches Abs-Track ASIS plan decks. */
const PAGE_W = 720;
const PAGE_H = 405;
const MARGIN = 36;
const FOOTER_Y = PAGE_H - 20;
const CONTENT_BOTTOM = FOOTER_Y - 12;

const TEAL = "#16B1A9";
const PRIMARY = "#1D6468";
const GREEN = "#8AC75B";
const DARK = "#1E1E1E";

type DocState = {
  urls: PlanPackUrls;
  /** Absolute page indices (0-based) that received real content. */
  contentPages: Set<number>;
  /** Pages that are structural (cover / thank-you) — always keep. */
  structuralPages: Set<number>;
};

function brandAsset(name: string): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "brand", name),
    path.join(process.cwd(), "web", "public", "brand", name),
  ];
  if (name === "hero-title-0.png") {
    for (const p of [
      path.join(process.cwd(), "public", "brand", "hero-title-0.jpg"),
      path.join(process.cwd(), "web", "public", "brand", "hero-title-0.jpg"),
    ]) {
      if (fs.existsSync(p)) return p;
    }
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function rangeLabel(min: number | null, max: number | null, unit = ""): string {
  if (min == null && max == null) return "-";
  if (min != null && max != null) return `${min}-${max}${unit}`;
  if (min != null) return `${min}+${unit}`;
  return `<=${max}${unit}`;
}

function blockBodyLines(block: SnapshotBlock): string[] {
  const body = block.bodyJson;
  if (Array.isArray(body.items)) {
    return (body.items as unknown[]).map((i) =>
      toPdfSafeText(`- ${String(i)}`),
    );
  }
  if (body.categories && typeof body.categories === "object") {
    const lines: string[] = [];
    for (const [cat, items] of Object.entries(
      body.categories as Record<string, unknown>,
    )) {
      lines.push(toPdfSafeText(cat));
      if (Array.isArray(items)) {
        for (const item of items)
          lines.push(toPdfSafeText(`  - ${String(item)}`));
      }
    }
    return lines;
  }
  if (Array.isArray(body.recipes)) {
    return (body.recipes as Array<Record<string, unknown>>).map((r) => {
      const name = String(r.name ?? "Recipe");
      const protein = r.proteinG != null ? ` · ${r.proteinG}g protein` : "";
      const cal = r.calories != null ? ` · ${r.calories} kcal` : "";
      const note = r.note ? ` - ${r.note}` : "";
      return toPdfSafeText(`- ${name}${protein}${cal}${note}`);
    });
  }
  if (typeof body.template === "string") {
    return body.template
      .split(/\n+/)
      .filter(Boolean)
      .map((line) => toPdfSafeText(line));
  }
  return [];
}

function sectionTitle(section: SnapshotSection): string {
  const map: Record<string, string> = {
    warmup: "WARM UP",
    resistance: "RESISTANCE TRAINING",
    core: "ABS / CORE",
    cardio: "CARDIO FINISHERS",
    stretch: "STRETCHING & RECOVERY",
  };
  const base = map[section.type] ?? section.type.toUpperCase();
  if (section.restNote) return `${base}  (${section.restNote})`;
  return base;
}

function youtubeUrl(videoId: string | null): string | null {
  if (!videoId) return null;
  if (videoId.startsWith("http")) return videoId;
  return `https://youtu.be/${videoId}`;
}

function currentPageIndex(doc: PDFKit.PDFDocument): number {
  const range = doc.bufferedPageRange();
  return range.start + range.count - 1;
}

function markContent(doc: PDFKit.PDFDocument, state: DocState) {
  state.contentPages.add(currentPageIndex(doc));
}

function addPage(doc: PDFKit.PDFDocument) {
  doc.addPage({ size: [PAGE_W, PAGE_H], margin: MARGIN });
  doc.x = MARGIN;
  doc.y = MARGIN;
}

function ensureSpace(
  doc: PDFKit.PDFDocument,
  state: DocState,
  needed: number,
) {
  if (doc.y + needed <= CONTENT_BOTTOM) return;
  addPage(doc);
}

function drawChromeOnPage(
  doc: PDFKit.PDFDocument,
  urls: PlanPackUrls,
  pageIndex: number,
) {
  doc.switchToPage(pageIndex);

  // Zero bottom margin so footer text cannot overflow onto a new page
  const page = doc.page;
  const prev = { ...page.margins };
  page.margins = { top: 0, left: 0, bottom: 0, right: 0 };

  const mark = brandAsset("mark-corner-1.png");
  if (mark) {
    try {
      doc.image(mark, PAGE_W - MARGIN - 34, 10, { width: 30 });
    } catch {
      /* ignore */
    }
  }

  const savedY = doc.y;
  doc
    .fontSize(8)
    .fillColor("#888888")
    .text("Open in app", MARGIN, FOOTER_Y, {
      width: PAGE_W - MARGIN * 2,
      align: "center",
      lineBreak: false,
      link: urls.viewerUrl,
    });
  doc.y = savedY;
  page.margins = prev;
}

/**
 * Single opening page: logo + hero + teal banner (condensed from old pages 1+2).
 */
async function drawOpeningPage(
  doc: PDFKit.PDFDocument,
  state: DocState,
  snapshot: PlanDeliverySnapshot,
  urls: PlanPackUrls,
) {
  doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
  state.structuralPages.add(currentPageIndex(doc));

  const logoBandH = 70;
  const bannerH = 70;
  const heroH = PAGE_H - logoBandH - bannerH;

  doc.rect(0, 0, PAGE_W, logoBandH).fill("#FFFFFF");
  const logo = brandAsset("logo-color.png");
  if (logo) {
    const size = 54;
    doc.image(logo, (PAGE_W - size) / 2, (logoBandH - size) / 2, {
      width: size,
      height: size,
    });
  } else {
    doc
      .fontSize(18)
      .fillColor(PRIMARY)
      .text("ABS-TRACK", 0, logoBandH / 2 - 10, {
        width: PAGE_W,
        align: "center",
        lineBreak: false,
      });
  }

  const hero = brandAsset("hero-title-0.png");
  if (hero) {
    try {
      doc.image(hero, 0, logoBandH, {
        width: PAGE_W,
        height: heroH,
        cover: [PAGE_W, heroH],
      });
    } catch {
      doc.rect(0, logoBandH, PAGE_W, heroH).fill(DARK);
    }
  } else {
    doc.rect(0, logoBandH, PAGE_W, heroH).fill(DARK);
  }

  const mark = brandAsset("mark-corner-1.png");
  if (mark) {
    try {
      doc.image(mark, PAGE_W - 50, logoBandH + 8, { width: 34 });
    } catch {
      /* ignore */
    }
  }

  const bannerY = logoBandH + heroH;
  doc.rect(0, bannerY, PAGE_W, bannerH).fill(TEAL);

  const name = memberDisplayName(snapshot).toUpperCase();
  doc
    .fontSize(15)
    .fillColor("#FFFFFF")
    .text(`${name}  :  PHYSIQUE TRANSFORMATION`, MARGIN, bannerY + 10, {
      width: PAGE_W - MARGIN * 2 - 88,
      lineBreak: false,
    });
  doc
    .fontSize(10)
    .fillColor("#FFFFFF")
    .text("Nutrition   ·   Training   ·   Mentoring", MARGIN, bannerY + 32, {
      width: PAGE_W - MARGIN * 2 - 88,
      lineBreak: false,
    });

  const delivered = new Date(snapshot.deliveredAt);
  const dateLabel = delivered.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const stepGoal = snapshot.training?.stepGoal;
  const stepLabel = stepGoal
    ? `Min: ${Math.round((stepGoal * 0.8) / 1000)}k – ${(stepGoal / 1000).toFixed(0)}K steps`
    : "";
  doc
    .fontSize(10)
    .fillColor("#FFFFFF")
    .text(
      `${snapshot.weekLabel.toUpperCase()}  –  ${dateLabel}${stepLabel ? `  ·  ${stepLabel}` : ""}`,
      MARGIN,
      bannerY + 50,
      { width: PAGE_W - MARGIN * 2 - 88, lineBreak: false },
    );

  const qrDataUrl = await QRCode.toDataURL(urls.viewerUrl, {
    margin: 1,
    width: 90,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const qrBuf = Buffer.from(qrDataUrl.split(",")[1]!, "base64");
  doc.image(qrBuf, PAGE_W - MARGIN - 56, bannerY + 7, {
    width: 54,
    height: 54,
  });
}

function drawContentHeader(
  doc: PDFKit.PDFDocument,
  state: DocState,
  title: string,
  accent = TEAL,
) {
  markContent(doc, state);
  doc
    .fontSize(14)
    .fillColor(accent)
    .text(title, MARGIN, doc.y, { width: PAGE_W - MARGIN * 2 - 44 });
  const lineY = doc.y + 4;
  doc
    .moveTo(MARGIN, lineY)
    .lineTo(PAGE_W - MARGIN - 44, lineY)
    .strokeColor(accent)
    .lineWidth(1.5)
    .stroke();
  doc.y = lineY + 14;
}

function drawGroceryTable(
  doc: PDFKit.PDFDocument,
  state: DocState,
  block: SnapshotBlock,
  accent: string,
) {
  const categories = block.bodyJson.categories as Record<string, unknown>;
  const entries = Object.entries(categories).map(([name, items]) => ({
    name,
    items: Array.isArray(items) ? items.map((i) => String(i)) : [],
  }));
  if (entries.length === 0) return;

  const maxItems = Math.max(...entries.map((e) => e.items.length), 1);
  const headerH = 22;
  const rowH = 15;
  const titleH = 28;
  const pad = 8;
  const needed = titleH + headerH + maxItems * rowH + pad * 2 + 20;

  // Keep the whole grocery table on one page
  if (doc.y + needed > CONTENT_BOTTOM) {
    addPage(doc);
  }

  markContent(doc, state);
  doc
    .fontSize(12)
    .fillColor(accent)
    .text(toPdfSafeText(block.title), MARGIN, doc.y, {
      width: PAGE_W - MARGIN * 2,
    });
  doc.moveDown(0.4);

  const tableTop = doc.y;
  const tableW = PAGE_W - MARGIN * 2;
  const colCount = entries.length;
  const colW = tableW / colCount;
  const tableH = headerH + maxItems * rowH + pad;

  // Soft card background
  doc.roundedRect(MARGIN, tableTop, tableW, tableH, 6).fill("#F3FAF0");

  // Column header band
  doc.rect(MARGIN, tableTop, tableW, headerH).fill(accent);

  entries.forEach((col, i) => {
    const x = MARGIN + i * colW;

    // Vertical divider (except first)
    if (i > 0) {
      doc
        .moveTo(x, tableTop)
        .lineTo(x, tableTop + tableH)
        .strokeColor("#D5E8D0")
        .lineWidth(0.6)
        .stroke();
    }

    doc
      .fontSize(9)
      .fillColor("#FFFFFF")
      .text(toPdfSafeText(col.name.toUpperCase()), x + 6, tableTop + 6, {
        width: colW - 12,
        align: "center",
        lineBreak: false,
      });

    col.items.forEach((item, row) => {
      const y = tableTop + headerH + row * rowH + 3;
      doc
        .fontSize(9)
        .fillColor(DARK)
        .text(toPdfSafeText(item), x + 8, y, {
          width: colW - 16,
          lineBreak: false,
        });
    });
  });

  markContent(doc, state);
  doc.y = tableTop + tableH + 14;
}

function drawBlocks(
  doc: PDFKit.PDFDocument,
  state: DocState,
  blocks: SnapshotBlock[],
  accent: string,
) {
  for (const block of blocks) {
    const isGrocery =
      block.category === "grocery_list" ||
      (block.bodyJson.categories &&
        typeof block.bodyJson.categories === "object");

    if (isGrocery) {
      drawGroceryTable(doc, state, block, accent);
      continue;
    }

    ensureSpace(doc, state, 48);
    markContent(doc, state);
    doc
      .fontSize(12)
      .fillColor(accent)
      .text(toPdfSafeText(block.title), MARGIN, doc.y, {
        width: PAGE_W - MARGIN * 2,
      });
    doc.moveDown(0.35);
    doc.fontSize(10).fillColor("#333333");
    for (const line of blockBodyLines(block)) {
      ensureSpace(doc, state, 16);
      markContent(doc, state);
      doc.text(line, MARGIN + 8, doc.y, {
        width: PAGE_W - MARGIN * 2 - 16,
        lineGap: 3,
      });
    }
    doc.moveDown(0.7);
  }
}

function drawWeeklySplit(
  doc: PDFKit.PDFDocument,
  state: DocState,
  snapshot: PlanDeliverySnapshot,
) {
  const training = snapshot.training;
  if (!training || training.days.length === 0) return;

  addPage(doc);
  drawContentHeader(
    doc,
    state,
    `WORKOUT SPLIT FOR ${snapshot.weekLabel.toUpperCase()}`,
    snapshot.branding.accentWorkout ?? TEAL,
  );

  const cols = Math.min(training.days.length, 7);
  const gap = 10;
  const colW = (PAGE_W - MARGIN * 2 - gap * (cols - 1)) / cols;
  const cardH = 140;
  const startY = doc.y + 8;

  training.days.forEach((day, i) => {
    const x = MARGIN + i * (colW + gap);
    doc.roundedRect(x, startY, colW, cardH, 8).fill("#F4F8F8");
    doc
      .fontSize(9)
      .fillColor(PRIMARY)
      .text(
        day.label.split("—")[0]?.trim().toUpperCase() ?? `DAY ${i + 1}`,
        x + 6,
        startY + 16,
        { width: colW - 12, align: "center" },
      );
    const focus =
      day.muscleGroup?.toUpperCase() ||
      day.label.split("—")[1]?.trim().toUpperCase() ||
      "TRAINING";
    doc.fontSize(10).fillColor(DARK).text(focus, x + 6, startY + 52, {
      width: colW - 12,
      align: "center",
    });
    const exCount = day.sections.reduce((n, s) => n + s.exercises.length, 0);
    doc
      .fontSize(8)
      .fillColor("#666666")
      .text(
        exCount === 0 ? "Rest / recovery" : `${exCount} exercises`,
        x + 6,
        startY + 105,
        { width: colW - 12, align: "center" },
      );
  });

  markContent(doc, state);
  doc.y = startY + cardH + 20;
  if (training.stepGoal) {
    doc
      .fontSize(10)
      .fillColor("#555555")
      .text(
        `Daily step goal: ${training.stepGoal.toLocaleString()}  ·  Scan the cover QR to open this plan in the app.`,
        MARGIN,
        doc.y,
        { width: PAGE_W - MARGIN * 2 },
      );
  }
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number): number {
  const colNo = MARGIN;
  const colEx = MARGIN + 40;
  const colReps = PAGE_W - MARGIN - 130;
  const colSets = PAGE_W - MARGIN - 55;
  doc.fontSize(9).fillColor("#777777");
  doc.text("NO", colNo, y, { width: 34, lineBreak: false });
  doc.text("EXERCISE (tap for video)", colEx, y, {
    width: colReps - colEx - 8,
    lineBreak: false,
  });
  doc.text("REPS", colReps, y, { width: 60, lineBreak: false });
  doc.text("SETS", colSets, y, { width: 44, lineBreak: false });
  doc
    .moveTo(MARGIN, y + 14)
    .lineTo(PAGE_W - MARGIN, y + 14)
    .strokeColor("#CCCCCC")
    .lineWidth(0.7)
    .stroke();
  return y + 20;
}

function drawExerciseRow(
  doc: PDFKit.PDFDocument,
  ex: SnapshotExercise,
  no: string,
  y: number,
): number {
  const colNo = MARGIN;
  const colEx = MARGIN + 40;
  const colReps = PAGE_W - MARGIN - 130;
  const colSets = PAGE_W - MARGIN - 55;
  const link = youtubeUrl(ex.youtubeVideoId);

  doc.fontSize(11).fillColor(DARK);
  doc.text(no, colNo, y, { width: 34, lineBreak: false });

  const name = toPdfSafeText(ex.name);
  const reps = toPdfSafeText(String(ex.reps ?? "-"));
  const sets = toPdfSafeText(String(ex.sets ?? "-"));

  if (link) {
    doc.fillColor(PRIMARY).text(name, colEx, y, {
      width: colReps - colEx - 8,
      link,
      underline: true,
      lineBreak: false,
    });
  } else {
    doc.fillColor(DARK).text(name, colEx, y, {
      width: colReps - colEx - 8,
      lineBreak: false,
    });
  }

  doc.fillColor(DARK);
  doc.text(reps, colReps, y, {
    width: 60,
    lineBreak: false,
  });
  doc.text(sets, colSets, y, {
    width: 44,
    lineBreak: false,
  });
  return y + 20;
}

function drawDay(
  doc: PDFKit.PDFDocument,
  state: DocState,
  day: SnapshotDay,
  dayNumber: number,
  snapshot: PlanDeliverySnapshot,
) {
  const accent = snapshot.branding.accentWorkout ?? TEAL;

  // Always continue on the current page when a day header + first section fit.
  // Mid-day overflow uses ensureSpace — avoids short days stranded alone on a page.
  const headerNeed = 56;
  if (doc.y + headerNeed > CONTENT_BOTTOM) {
    addPage(doc);
  } else if (doc.y > MARGIN + 4) {
    doc.y += 14;
    doc
      .moveTo(MARGIN, doc.y)
      .lineTo(PAGE_W - MARGIN, doc.y)
      .strokeColor("#E8E8E8")
      .lineWidth(0.7)
      .stroke();
    doc.y += 16;
  }

  markContent(doc, state);
  const dayTitle = day.label
    .replace(/^Day\s*\d+\s*[—–-]?\s*/i, "")
    .toUpperCase();
  doc
    .fontSize(14)
    .fillColor(accent)
    .text(toPdfSafeText(`DAY ${dayNumber}  -  ${dayTitle}`), MARGIN, doc.y, {
      width: PAGE_W - MARGIN * 2 - 44,
    });
  doc.moveDown(0.25);
  if (day.muscleGroup) {
    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(
        toPdfSafeText(`Muscle group: ${day.muscleGroup.toUpperCase()}`),
        {
          width: PAGE_W - MARGIN * 2,
        },
      );
  }
  doc.moveDown(0.55);

  if (day.sections.length === 0) {
    doc
      .fontSize(11)
      .fillColor("#444444")
      .text(
        "Rest / recovery day — walk, stretch, hit your step goal.",
        MARGIN,
        doc.y,
      );
    doc.moveDown(1);
    return;
  }

  let y = drawTableHeader(doc, doc.y);
  doc.y = y;

  for (const section of day.sections) {
    ensureSpace(doc, state, 44);
    markContent(doc, state);
    y = doc.y;
    doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 22).fill("#EEF6F6");
    doc
      .fontSize(10)
      .fillColor(PRIMARY)
      .text(sectionTitle(section), MARGIN + 10, y + 5, {
        width: PAGE_W - MARGIN * 2 - 20,
        lineBreak: false,
      });
    doc.y = y + 28;

    if (section.exercises.length === 0) {
      ensureSpace(doc, state, 24);
      markContent(doc, state);
      doc
        .fontSize(10)
        .fillColor("#444444")
        .text(
          section.type === "cardio"
            ? "15 min spin bike  OR  15 min brisk walk/run (speed 6+)  OR  15–20 min elliptical (strides >160)"
            : section.type === "stretch"
              ? "Full body stretch & foam rolling — see Stretching & Recovery section"
              : "—",
          MARGIN + 10,
          doc.y,
          { width: PAGE_W - MARGIN * 2 - 20 },
        );
      doc.moveDown(0.7);
      continue;
    }

    let rowNo = 1;
    for (const ex of section.exercises) {
      ensureSpace(doc, state, 24);
      markContent(doc, state);
      const label = ex.supersetGroup ?? String(rowNo);
      doc.y = drawExerciseRow(doc, ex, label, doc.y);
      rowNo += 1;
    }
    doc.y += 10;
  }
}

function drawNutrition(
  doc: PDFKit.PDFDocument,
  state: DocState,
  snapshot: PlanDeliverySnapshot,
) {
  const nutrition = snapshot.nutrition;
  if (!nutrition) return;

  const diet = snapshot.branding.accentDiet ?? GREEN;
  addPage(doc);
  drawContentHeader(
    doc,
    state,
    `NUTRITION · WEEK ${nutrition.weekNumber}`,
    diet,
  );

  const cardY = doc.y;
  const cardH = 60;
  doc.roundedRect(MARGIN, cardY, PAGE_W - MARGIN * 2, cardH, 8).fill("#F3FAF0");
  const macros: Array<[string, string]> = [
    ["Calories", rangeLabel(nutrition.caloriesMin, nutrition.caloriesMax)],
    ["Protein", rangeLabel(nutrition.proteinMin, nutrition.proteinMax, "g")],
    ["Carbs max", rangeLabel(null, nutrition.carbsMax, "g")],
    ["Fat", rangeLabel(nutrition.fatMin, nutrition.fatMax, "g")],
  ];
  const colW = (PAGE_W - MARGIN * 2) / 4;
  macros.forEach(([label, value], i) => {
    const x = MARGIN + i * colW;
    doc.fontSize(9).fillColor("#666666").text(label, x + 6, cardY + 12, {
      width: colW - 12,
      align: "center",
    });
    doc.fontSize(13).fillColor(DARK).text(value, x + 6, cardY + 32, {
      width: colW - 12,
      align: "center",
    });
  });
  markContent(doc, state);
  doc.y = cardY + cardH + 16;

  drawBlocks(doc, state, nutrition.blocks, diet);
}

function drawThankYou(doc: PDFKit.PDFDocument, state: DocState) {
  doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
  state.structuralPages.add(currentPageIndex(doc));
  doc.rect(0, 0, PAGE_W, PAGE_H).fill("#FFFFFF");
  const logo = brandAsset("logo-color.png");
  if (logo) {
    const size = 110;
    doc.image(logo, (PAGE_W - size) / 2, 85, { width: size, height: size });
  }
  const bannerH = 68;
  doc.rect(0, PAGE_H - bannerH, PAGE_W, bannerH).fill(TEAL);
  doc
    .fontSize(16)
    .fillColor("#FFFFFF")
    .text("THANK YOU AND ALL THE VERY BEST!", 0, PAGE_H - bannerH + 24, {
      width: PAGE_W,
      align: "center",
      lineBreak: false,
    });
}

/**
 * Render a branded Abs-Track-style plan pack PDF from an immutable snapshot.
 */
export async function renderPlanPackPdf(
  snapshot: PlanDeliverySnapshot,
  urls: PlanPackUrls,
  _token: string,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margin: MARGIN,
    autoFirstPage: false,
    bufferPages: true,
    info: {
      Title: `${snapshot.weekLabel} Plan — ${memberDisplayName(snapshot)}`,
      Author: snapshot.branding.name ?? "ABS-TRACK",
    },
  });

  const state: DocState = {
    urls,
    contentPages: new Set(),
    structuralPages: new Set(),
  };

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  await drawOpeningPage(doc, state, snapshot, urls);

  const workoutAccent = snapshot.branding.accentWorkout ?? TEAL;

  if (snapshot.training && snapshot.training.blocks.length > 0) {
    addPage(doc);
    drawContentHeader(
      doc,
      state,
      "WORKOUT GUIDELINES & RECOVERY",
      workoutAccent,
    );
    drawBlocks(doc, state, snapshot.training.blocks, workoutAccent);
  }

  drawWeeklySplit(doc, state, snapshot);

  if (snapshot.training) {
    addPage(doc);
    snapshot.training.days.forEach((day, i) => {
      drawDay(doc, state, day, i + 1, snapshot);
    });
  }

  if (snapshot.nutrition) {
    drawNutrition(doc, state, snapshot);
  }

  drawThankYou(doc, state);

  // Chrome only on pages that have content (skip accidental blanks)
  const rangeBeforeChrome = doc.bufferedPageRange();
  const keep = new Set<number>([
    ...state.contentPages,
    ...state.structuralPages,
  ]);

  for (let i = rangeBeforeChrome.start; i < rangeBeforeChrome.start + rangeBeforeChrome.count; i++) {
    if (!keep.has(i)) continue;
    if (state.structuralPages.has(i)) continue;
    drawChromeOnPage(doc, urls, i);
  }

  // If chrome somehow spawned pages, drop anything not in `keep`
  const rangeAfter = doc.bufferedPageRange();
  const totalAfter = rangeAfter.count;
  doc.end();
  const full = await done;

  if (totalAfter <= keep.size) return full;
  return stripPages(full, keep, totalAfter);
}

async function stripPages(
  buffer: Buffer,
  keep: Set<number>,
  totalPages: number,
): Promise<Buffer> {
  if (keep.size >= totalPages) return buffer;
  try {
    const pdfLib = await import("pdf-lib").catch(() => null);
    if (!pdfLib) return buffer;
    const src = await pdfLib.PDFDocument.load(buffer);
    const out = await pdfLib.PDFDocument.create();
    const indices = [...keep].sort((a, b) => a - b);
    const copied = await out.copyPages(src, indices);
    for (const p of copied) out.addPage(p);
    return Buffer.from(await out.save());
  } catch {
    return buffer;
  }
}
