/**
 * Resolve {{placeholders}} in content-block template strings.
 * Returns substituted text, or throws if any {{tag}} remains unresolved.
 */
export type TemplateVars = Record<string, string>;

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function collectPlaceholders(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    if (m[1]) found.add(m[1]);
  }
  return [...found];
}

export function resolveTemplateString(
  text: string,
  vars: TemplateVars,
): string {
  const resolved = text.replace(PLACEHOLDER_RE, (_, key: string) => {
    if (!(key in vars) || vars[key] == null || vars[key] === "") {
      return `{{${key}}}`;
    }
    return vars[key]!;
  });

  const leftover = collectPlaceholders(resolved);
  if (leftover.length > 0) {
    throw new Error(
      `Unresolved template placeholders: ${leftover.join(", ")}`,
    );
  }
  return resolved;
}

/** Strip characters that WinAnsi/pdfkit cannot encode reliably. */
export function toPdfSafeText(text: string): string {
  return text
    .replace(/\u2013|\u2014|\u2212/g, "-") // en/em/minus dashes
    .replace(/\u2264|\u2266/g, "<=") // ≤ ≦
    .replace(/\u2265|\u2267/g, ">=") // ≥ ≧
    .replace(/\u2022|\u00B7/g, "-") // bullets
    .replace(/\u2018|\u2019|\u201A/g, "'")
    .replace(/\u201C|\u201D|\u201E/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\u2715|\u2716|\u2717|\u2718/g, "x")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

export function buildMemberTemplateVars(input: {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string;
  programStartDate: string | null;
  programEndDate: string | null;
  healthGoals: string[];
  healthIssues: string | null;
  allergies: string | null;
  location: string | null;
}): TemplateVars {
  const full = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  const clientName = full || input.displayName || input.email;
  const goals =
    input.healthGoals.length > 0
      ? input.healthGoals.join(", ")
      : "your personal health goals";

  return {
    client_name: clientName,
    start_date: input.programStartDate ?? "your start date",
    end_date: input.programEndDate ?? "ongoing",
    health_goals: goals,
    location: input.location ?? "",
    health_issues: input.healthIssues ?? "",
    allergies: input.allergies ?? "",
  };
}

/** Build a per-member health considerations block (replaces seeded Hetal Focus). */
export function buildHealthConsiderationsBlock(input: {
  firstName: string | null;
  displayName: string | null;
  healthIssues: string | null;
  allergies: string | null;
  medications: string | null;
  healthGoals: string[];
  dietPreference: string | null;
}): {
  id: string;
  title: string;
  category: string;
  bodyJson: Record<string, unknown>;
} {
  const who =
    input.firstName ||
    input.displayName?.split(" ")[0] ||
    "Member";
  const items: string[] = [];

  if (input.healthGoals.length > 0) {
    items.push(`Focus areas: ${input.healthGoals.join("; ")}.`);
  }
  if (input.healthIssues) {
    items.push(`Health notes: ${input.healthIssues}`);
  }
  if (input.allergies) {
    items.push(`Allergies: ${input.allergies}`);
  }
  if (input.medications) {
    items.push(`Medications / supplements: ${input.medications}`);
  }
  if (input.dietPreference) {
    items.push(`Diet preference: ${input.dietPreference}.`);
  }
  if (items.length === 0) {
    items.push(
      "No specific health flags on file - follow the general nutrition and training guidelines.",
    );
  }

  return {
    id: "health-considerations-dynamic",
    title: `Health Considerations - ${who}`,
    category: "health_parameters",
    bodyJson: { items },
  };
}
