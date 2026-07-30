import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentBlocks } from "@/lib/db/schema";

/** Ordered block IDs → slugs (skips unknown IDs). */
export async function blockIdsToSlugs(
  tenantId: string,
  blockIds: string[],
): Promise<string[]> {
  if (blockIds.length === 0) return [];

  const rows = await db
    .select({ id: contentBlocks.id, slug: contentBlocks.slug })
    .from(contentBlocks)
    .where(
      and(
        eq(contentBlocks.tenantId, tenantId),
        inArray(contentBlocks.id, blockIds),
      ),
    );

  const slugById = new Map(rows.map((r) => [r.id, r.slug]));
  return blockIds
    .map((id) => slugById.get(id))
    .filter((slug): slug is string => Boolean(slug));
}

/** Ordered slugs → block IDs. Throws if any slug is missing. */
export async function resolveBlockSlugsToIds(
  tenantId: string,
  slugs: string[],
): Promise<string[]> {
  if (slugs.length === 0) return [];

  const rows = await db
    .select({ id: contentBlocks.id, slug: contentBlocks.slug })
    .from(contentBlocks)
    .where(
      and(
        eq(contentBlocks.tenantId, tenantId),
        inArray(contentBlocks.slug, slugs),
      ),
    );

  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));
  const missing = slugs.filter((s) => !idBySlug.has(s));
  if (missing.length > 0) {
    throw new Error(
      `Template references missing content blocks: ${missing.sort().join(", ")}`,
    );
  }

  return slugs.map((s) => idBySlug.get(s)!);
}
