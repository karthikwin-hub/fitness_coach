import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contentBlocks,
  exercises,
  members,
  users,
} from "@/lib/db/schema";
import { isValidImportKey } from "@/lib/members/import-key";
import { isValidMemberId } from "@/lib/members/uuid";
import type {
  ImportSummary,
  ParsedMemberWorkbook,
  RowIssue,
  ValidationResult,
} from "@/lib/import/types";

const MEMBER_STATUSES = new Set(["invited", "active", "paused", "lead"]);
const PLAN_STATUSES = new Set(["draft", "published"]);
const SECTION_TYPES = new Set(["warmup", "resistance", "core", "cardio", "stretch"]);
const DIET_PREFERENCES = new Set(["indian", "western", "hybrid", "vegetarian"]);
const NOTE_TYPES = new Set(["coach_note", "check_in_note"]);

type MemberRef = { memberId?: string; importKey?: string };

function memberRefKey(ref: MemberRef): string | null {
  if (ref.memberId) return `id:${ref.memberId}`;
  if (ref.importKey) return `key:${ref.importKey.toLowerCase()}`;
  return null;
}

function issue(
  sheet: string,
  row: number,
  message: string,
  column?: string,
  severity: RowIssue["severity"] = "error",
): RowIssue {
  return { sheet, row, column, message, severity };
}

export async function validateMemberWorkbook(
  tenantId: string,
  workbook: ParsedMemberWorkbook,
): Promise<ValidationResult> {
  const issues: RowIssue[] = [];
  const summary: ImportSummary = {
    members: { create: 0, update: 0 },
    trainingPlans: { create: 0, update: 0 },
    nutritionPlans: { create: 0, update: 0 },
    notes: { create: 0 },
  };

  const memberIds = workbook.members
    .map((m) => m.memberId)
    .filter((id): id is string => Boolean(id));
  const importKeys = [
    ...workbook.members.map((m) => m.importKey).filter(Boolean),
    ...workbook.trainingPlans.map((r) => r.importKey).filter(Boolean),
    ...workbook.nutritionPlans.map((r) => r.importKey).filter(Boolean),
    ...workbook.notes.map((r) => r.importKey).filter(Boolean),
  ] as string[];

  const existingById = new Map<string, { importKey: string | null }>();
  if (memberIds.length > 0) {
    const rows = await db
      .select({ id: members.id, importKey: members.importKey })
      .from(members)
      .where(and(eq(members.tenantId, tenantId), inArray(members.id, memberIds)));
    for (const row of rows) existingById.set(row.id, { importKey: row.importKey });
  }

  const existingByImportKey = new Map<string, string>();
  if (importKeys.length > 0) {
    const normalized = [...new Set(importKeys.map((k) => k.trim()))];
    const rows = await db
      .select({ id: members.id, importKey: members.importKey })
      .from(members)
      .where(
        and(eq(members.tenantId, tenantId), inArray(members.importKey, normalized)),
      );
    for (const row of rows) {
      if (row.importKey) existingByImportKey.set(row.importKey.toLowerCase(), row.id);
    }
  }

  const exerciseSlugs = new Set(
    (
      await db
        .select({ slug: exercises.slug })
        .from(exercises)
        .where(eq(exercises.tenantId, tenantId))
    )
      .map((r) => r.slug)
      .filter((s): s is string => Boolean(s)),
  );

  const blockSlugs = new Set(
    (
      await db
        .select({ slug: contentBlocks.slug })
        .from(contentBlocks)
        .where(eq(contentBlocks.tenantId, tenantId))
    ).map((r) => r.slug),
  );

  const resolvedMembers = new Map<string, string>();
  const importKeyInSheet = new Map<string, number>();

  for (const row of workbook.members) {
    if (row.memberId && !isValidMemberId(row.memberId)) {
      issues.push(issue("Members", row.row, "Invalid member_id UUID", "member_id"));
      continue;
    }
    if (row.importKey && !isValidImportKey(row.importKey)) {
      issues.push(issue("Members", row.row, "Invalid import_key format", "import_key"));
      continue;
    }
    if (row.status && !MEMBER_STATUSES.has(row.status)) {
      issues.push(
        issue("Members", row.row, `Invalid status: ${row.status}`, "status"),
      );
    }
    if (row.dietPreference && !DIET_PREFERENCES.has(row.dietPreference)) {
      issues.push(
        issue("Members", row.row, `Invalid diet_preference: ${row.dietPreference}`, "diet_preference"),
      );
    }

    const isUpdateById = Boolean(row.memberId && existingById.has(row.memberId));
    const isUpdateByKey =
      Boolean(row.importKey && existingByImportKey.has(row.importKey.toLowerCase()));

    if (row.memberId && !existingById.has(row.memberId)) {
      issues.push(
        issue("Members", row.row, "member_id not found in tenant", "member_id"),
      );
      continue;
    }

    if (!row.memberId && !row.importKey) {
      if (!row.email?.includes("@")) {
        issues.push(
          issue("Members", row.row, "email required for new members without import_key", "email"),
        );
        continue;
      }
      summary.members!.create += 1;
    } else if (isUpdateById || isUpdateByKey) {
      summary.members!.update += 1;
    } else {
      if (!row.email?.includes("@")) {
        issues.push(
          issue("Members", row.row, "email required when creating by import_key", "email"),
        );
        continue;
      }
      summary.members!.create += 1;
    }

    if (row.importKey) {
      const keyLower = row.importKey.toLowerCase();
      const prior = importKeyInSheet.get(keyLower);
      if (prior != null) {
        issues.push(
          issue("Members", row.row, `Duplicate import_key in sheet (row ${prior})`, "import_key"),
        );
      } else {
        importKeyInSheet.set(keyLower, row.row);
      }
    }

    const ref = memberRefKey({ memberId: row.memberId, importKey: row.importKey });
    if (ref) {
      const id =
        row.memberId ??
        existingByImportKey.get(row.importKey!.toLowerCase()) ??
        `new:${row.importKey!.toLowerCase()}`;
      resolvedMembers.set(ref, id);
    }
  }

  for (const row of workbook.members) {
    if (!row.email?.includes("@")) continue;
    const [existingEmail] = await db
      .select({ id: users.id, memberId: members.id })
      .from(users)
      .innerJoin(members, eq(members.userId, users.id))
      .where(and(eq(users.tenantId, tenantId), eq(users.email, row.email.trim().toLowerCase())))
      .limit(1);
    if (!existingEmail) continue;

    const updatingId =
      row.memberId ?? (row.importKey ? existingByImportKey.get(row.importKey.toLowerCase()) : null);
    if (updatingId && updatingId === existingEmail.memberId) continue;
    if (!updatingId) {
      issues.push(
        issue("Members", row.row, "Email already in use by another member", "email"),
      );
    }
  }

  function resolveMemberRef(ref: MemberRef, sheet: string, rowNum: number): string | null {
    if (!ref.memberId && !ref.importKey) {
      issues.push(
        issue(sheet, rowNum, "member_id or import_key required (email is not a join key)"),
      );
      return null;
    }
    if (ref.memberId) {
      if (!existingById.has(ref.memberId)) {
        const fromSheet = resolvedMembers.get(`id:${ref.memberId}`);
        if (!fromSheet) {
          issues.push(issue(sheet, rowNum, "member_id not found", "member_id"));
          return null;
        }
      }
      return ref.memberId;
    }
    const keyLower = ref.importKey!.toLowerCase();
    const existingId = existingByImportKey.get(keyLower);
    if (existingId) return existingId;
    const sheetId = resolvedMembers.get(`key:${keyLower}`);
    if (sheetId) return sheetId;
    issues.push(issue(sheet, rowNum, "import_key not found — add member on Members sheet first", "import_key"));
    return null;
  }

  const trainingGroups = new Set<string>();
  for (const row of workbook.trainingPlans) {
    if (row.weekNumber == null) {
      issues.push(issue("TrainingPlans", row.row, "week_number required", "week_number"));
      continue;
    }
    if (row.status && !PLAN_STATUSES.has(row.status)) {
      issues.push(issue("TrainingPlans", row.row, `Invalid status: ${row.status}`, "status"));
    }
    if (row.sectionType && !SECTION_TYPES.has(row.sectionType)) {
      issues.push(
        issue("TrainingPlans", row.row, `Invalid section_type: ${row.sectionType}`, "section_type"),
      );
    }
    if (row.exerciseSlug && !exerciseSlugs.has(row.exerciseSlug)) {
      issues.push(
        issue(
          "TrainingPlans",
          row.row,
          `Unknown exercise_slug: ${row.exerciseSlug} — import catalog first`,
          "exercise_slug",
        ),
      );
    }
    const memberResolved = resolveMemberRef(
      { memberId: row.memberId, importKey: row.importKey },
      "TrainingPlans",
      row.row,
    );
    if (!memberResolved) continue;
    const groupKey = `${memberResolved}:${row.weekNumber}`;
    if (!trainingGroups.has(groupKey)) {
      trainingGroups.add(groupKey);
      summary.trainingPlans!.create += 1;
    }
  }

  const nutritionGroups = new Set<string>();
  for (const row of workbook.nutritionPlans) {
    if (row.weekNumber == null) {
      issues.push(issue("NutritionPlans", row.row, "week_number required", "week_number"));
      continue;
    }
    if (row.status && !PLAN_STATUSES.has(row.status)) {
      issues.push(issue("NutritionPlans", row.row, `Invalid status: ${row.status}`, "status"));
    }
    for (const slug of row.contentBlockSlugs ?? []) {
      if (!blockSlugs.has(slug)) {
        issues.push(
          issue(
            "NutritionPlans",
            row.row,
            `Unknown content block slug: ${slug}`,
            "content_block_slugs",
          ),
        );
      }
    }
    const memberResolved = resolveMemberRef(
      { memberId: row.memberId, importKey: row.importKey },
      "NutritionPlans",
      row.row,
    );
    if (!memberResolved) continue;
    const groupKey = `${memberResolved}:${row.weekNumber}`;
    if (!nutritionGroups.has(groupKey)) {
      nutritionGroups.add(groupKey);
      summary.nutritionPlans!.create += 1;
    }
  }

  for (const row of workbook.notes) {
    if (!row.body?.trim()) {
      issues.push(issue("Notes", row.row, "body required", "body"));
      continue;
    }
    if (row.noteType && !NOTE_TYPES.has(row.noteType)) {
      issues.push(issue("Notes", row.row, `Invalid note_type: ${row.noteType}`, "note_type"));
    }
    const memberResolved = resolveMemberRef(
      { memberId: row.memberId, importKey: row.importKey },
      "Notes",
      row.row,
    );
    if (!memberResolved) continue;
    summary.notes!.create += 1;
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return {
    valid: !hasErrors,
    issues,
    summary,
    workbook,
  };
}
