import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { planTemplates } from "@/lib/db/schema";

const BUNDLE_CODE_START = 1000;

/** Next numeric template code for a tenant (1000+). Never derived from display name. */
export async function generateTemplateCode(tenantId: string): Promise<string> {
  const rows = await db
    .select({ key: planTemplates.key })
    .from(planTemplates)
    .where(eq(planTemplates.tenantId, tenantId));

  let max = BUNDLE_CODE_START - 1;
  for (const row of rows) {
    if (row.key && /^[0-9]+$/.test(row.key)) {
      max = Math.max(max, parseInt(row.key, 10));
    }
  }
  return String(max + 1);
}

export function isNumericTemplateCode(key: string): boolean {
  return /^[0-9]{4,6}$/.test(key);
}
