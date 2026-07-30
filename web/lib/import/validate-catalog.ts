import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contentBlocks,
  exercises,
  planTemplates,
} from "@/lib/db/schema";
import { DEFAULT_EXERCISE_CATEGORIES } from "@/lib/plans/exercise-categories";
import { normalizeYoutubeVideoId } from "@/lib/youtube/parse-video-id";
import type {
  ImportSummary,
  ParsedCatalogWorkbook,
  RowIssue,
  ValidationResult,
} from "@/lib/import/types";

const CONTENT_BLOCK_CATEGORIES = new Set([
  "nutrition_tips",
  "grocery_list",
  "health_parameters",
  "sweet_cravings",
  "welcome_letter",
  "workout_guidelines",
  "stretching_routine",
  "cardio_finisher",
  "success_strategies",
]);

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,62}$/;
const TEMPLATE_KEY_RE = /^[a-z0-9][a-z0-9_-]{1,62}$/;

function issue(
  sheet: string,
  row: number,
  message: string,
  column?: string,
  severity: RowIssue["severity"] = "error",
): RowIssue {
  return { sheet, row, column, message, severity };
}

export async function validateCatalogWorkbook(
  tenantId: string,
  workbook: ParsedCatalogWorkbook,
): Promise<ValidationResult> {
  const issues: RowIssue[] = [];
  const summary: ImportSummary = {
    exercises: { create: 0, update: 0 },
    contentBlocks: { create: 0, update: 0 },
    planTemplates: { create: 0, update: 0 },
  };

  const slugs = workbook.exercises.map((r) => r.slug).filter(Boolean) as string[];
  const blockSlugs = workbook.contentBlocks.map((r) => r.slug).filter(Boolean) as string[];
  const templateKeys = workbook.planTemplates.map((r) => r.key).filter(Boolean) as string[];

  const existingExerciseSlugs = new Set<string>();
  if (slugs.length > 0) {
    const rows = await db
      .select({ slug: exercises.slug })
      .from(exercises)
      .where(and(eq(exercises.tenantId, tenantId), inArray(exercises.slug, slugs)));
    for (const row of rows) {
      if (row.slug) existingExerciseSlugs.add(row.slug);
    }
  }

  const existingBlockSlugs = new Set<string>();
  if (blockSlugs.length > 0) {
    const rows = await db
      .select({ slug: contentBlocks.slug })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.tenantId, tenantId), inArray(contentBlocks.slug, blockSlugs)));
    for (const row of rows) existingBlockSlugs.add(row.slug);
  }

  const existingTemplateKeys = new Set<string>();
  if (templateKeys.length > 0) {
    const rows = await db
      .select({ key: planTemplates.key })
      .from(planTemplates)
      .where(and(eq(planTemplates.tenantId, tenantId), inArray(planTemplates.key, templateKeys)));
    for (const row of rows) {
      if (row.key) existingTemplateKeys.add(row.key);
    }
  }

  const categorySlugs = new Set<string>(DEFAULT_EXERCISE_CATEGORIES.map((c) => c.slug));

  const slugSeen = new Map<string, number>();
  for (const row of workbook.exercises) {
    if (!row.slug) {
      issues.push(issue("Exercises", row.row, "slug required", "slug"));
      continue;
    }
    if (!SLUG_RE.test(row.slug)) {
      issues.push(issue("Exercises", row.row, "Invalid slug format", "slug"));
    }
    if (!row.name) {
      issues.push(issue("Exercises", row.row, "name required", "name"));
    }
    if (row.youtubeVideoIdOrUrl && !normalizeYoutubeVideoId(row.youtubeVideoIdOrUrl)) {
      issues.push(
        issue(
          "Exercises",
          row.row,
          "Invalid YouTube URL or video ID",
          "youtube_video_id_or_url",
        ),
      );
    }
    if (row.videoSource && row.videoSource !== "owned" && row.videoSource !== "third_party") {
      issues.push(issue("Exercises", row.row, "video_source must be owned or third_party", "video_source"));
    }
    if (row.categorySlug && !categorySlugs.has(row.categorySlug.toLowerCase())) {
      issues.push(
        issue(
          "Exercises",
          row.row,
          `Unknown category_slug: ${row.categorySlug}`,
          "category_slug",
          "warning",
        ),
      );
    }
    const prior = slugSeen.get(row.slug);
    if (prior != null) {
      issues.push(issue("Exercises", row.row, `Duplicate slug in sheet (row ${prior})`, "slug"));
    } else {
      slugSeen.set(row.slug, row.row);
    }
    if (existingExerciseSlugs.has(row.slug)) {
      summary.exercises!.update += 1;
    } else {
      summary.exercises!.create += 1;
    }
  }

  const blockSlugSeen = new Map<string, number>();
  for (const row of workbook.contentBlocks) {
    if (!row.slug) {
      issues.push(issue("ContentBlocks", row.row, "slug required", "slug"));
      continue;
    }
    if (!row.category) {
      issues.push(issue("ContentBlocks", row.row, "category required", "category"));
    } else if (!CONTENT_BLOCK_CATEGORIES.has(row.category)) {
      issues.push(
        issue("ContentBlocks", row.row, `Invalid category: ${row.category}`, "category"),
      );
    }
    if (!row.title) {
      issues.push(issue("ContentBlocks", row.row, "title required", "title"));
    }
    if (row.bodyJson) {
      try {
        JSON.parse(row.bodyJson);
      } catch {
        issues.push(issue("ContentBlocks", row.row, "body_json must be valid JSON", "body_json"));
      }
    }
    const prior = blockSlugSeen.get(row.slug);
    if (prior != null) {
      issues.push(
        issue("ContentBlocks", row.row, `Duplicate slug in sheet (row ${prior})`, "slug"),
      );
    } else {
      blockSlugSeen.set(row.slug, row.row);
    }
    if (existingBlockSlugs.has(row.slug)) {
      summary.contentBlocks!.update += 1;
    } else {
      summary.contentBlocks!.create += 1;
    }
  }

  const keySeen = new Map<string, number>();
  for (const row of workbook.planTemplates) {
    if (!row.key) {
      issues.push(issue("PlanTemplates", row.row, "key required", "key"));
      continue;
    }
    if (!TEMPLATE_KEY_RE.test(row.key)) {
      issues.push(issue("PlanTemplates", row.row, "Invalid key format", "key"));
    }
    if (!row.name) {
      issues.push(issue("PlanTemplates", row.row, "name required", "name"));
    }
    if (row.trainingJson) {
      try {
        JSON.parse(row.trainingJson);
      } catch {
        issues.push(
          issue("PlanTemplates", row.row, "training_json must be valid JSON", "training_json"),
        );
      }
    }
    if (row.nutritionJson) {
      try {
        JSON.parse(row.nutritionJson);
      } catch {
        issues.push(
          issue("PlanTemplates", row.row, "nutrition_json must be valid JSON", "nutrition_json"),
        );
      }
    }
    const prior = keySeen.get(row.key);
    if (prior != null) {
      issues.push(issue("PlanTemplates", row.row, `Duplicate key in sheet (row ${prior})`, "key"));
    } else {
      keySeen.set(row.key, row.row);
    }
    if (existingTemplateKeys.has(row.key)) {
      summary.planTemplates!.update += 1;
    } else {
      summary.planTemplates!.create += 1;
    }
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return {
    valid: !hasErrors,
    issues,
    summary,
    workbook,
  };
}
