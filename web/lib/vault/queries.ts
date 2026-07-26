import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  vaultCatalogSettings,
  vaultProductFamilies,
  vaultProductItems,
  vaultProducts,
} from "@/lib/db/schema";
import type { VaultCatalogFamily, VaultFamilyHero, VaultProductDetail } from "@/lib/vault/types";
import {
  DEFAULT_VAULT_CATALOG_MARKETING,
  type VaultCatalogMarketing,
} from "@/lib/vault/types";
function mapProduct(row: typeof vaultProducts.$inferSelect) {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    validityDays: row.validityDays,
    listPriceInr: row.listPriceInr,
    salePriceInr: row.salePriceInr,
    listPriceUsd: row.listPriceUsd,
    salePriceUsd: row.salePriceUsd,
    includesJson: (row.includesJson ?? []) as string[],
    badge: row.badge,
    sortOrder: row.sortOrder,
  };
}

export async function listPublishedVaultCatalog(
  tenantId: string,
): Promise<VaultCatalogFamily[]> {
  const families = await db
    .select()
    .from(vaultProductFamilies)
    .where(
      and(
        eq(vaultProductFamilies.tenantId, tenantId),
        eq(vaultProductFamilies.published, true),
      ),
    )
    .orderBy(asc(vaultProductFamilies.sortOrder));

  const result: VaultCatalogFamily[] = [];
  for (const family of families) {
    const products = await db
      .select()
      .from(vaultProducts)
      .where(
        and(
          eq(vaultProducts.familyId, family.id),
          eq(vaultProducts.active, true),
        ),
      )
      .orderBy(asc(vaultProducts.sortOrder));

    if (products.length === 0) continue;

    result.push({
      id: family.id,
      slug: family.slug,
      title: family.title,
      subtitle: family.subtitle,
      description: family.description,
      heroJson: (family.heroJson ?? {}) as VaultFamilyHero,
      products: products.map(mapProduct),
    });
  }
  return result;
}

export async function getPublishedVaultFamilyBySlug(
  tenantId: string,
  familySlug: string,
): Promise<VaultProductDetail | null> {
  const [family] = await db
    .select()
    .from(vaultProductFamilies)
    .where(
      and(
        eq(vaultProductFamilies.tenantId, tenantId),
        eq(vaultProductFamilies.slug, familySlug),
        eq(vaultProductFamilies.published, true),
      ),
    )
    .limit(1);

  if (!family) return null;

  const products = await db
    .select()
    .from(vaultProducts)
    .where(
      and(
        eq(vaultProducts.familyId, family.id),
        eq(vaultProducts.active, true),
      ),
    )
    .orderBy(asc(vaultProducts.sortOrder));

  const productsWithItems = [];
  for (const product of products) {
    const items = await db
      .select()
      .from(vaultProductItems)
      .where(eq(vaultProductItems.productId, product.id))
      .orderBy(asc(vaultProductItems.sortOrder));

    productsWithItems.push({
      ...mapProduct(product),
      items: items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        refId: item.refId,
        title: item.title,
        payloadJson: (item.payloadJson ?? {}) as Record<string, unknown>,
        sortOrder: item.sortOrder,
      })),
    });
  }

  return {
    id: family.id,
    slug: family.slug,
    title: family.title,
    subtitle: family.subtitle,
    description: family.description,
    heroJson: (family.heroJson ?? {}) as VaultFamilyHero,
    products: productsWithItems,
  };
}

export async function listVaultFamiliesForCoach(tenantId: string) {
  const families = await db
    .select()
    .from(vaultProductFamilies)
    .where(eq(vaultProductFamilies.tenantId, tenantId))
    .orderBy(asc(vaultProductFamilies.sortOrder));

  const out = [];
  for (const family of families) {
    const products = await db
      .select()
      .from(vaultProducts)
      .where(eq(vaultProducts.familyId, family.id))
      .orderBy(asc(vaultProducts.sortOrder));

    const productsWithItems = [];
    for (const product of products) {
      const items = await db
        .select()
        .from(vaultProductItems)
        .where(eq(vaultProductItems.productId, product.id))
        .orderBy(asc(vaultProductItems.sortOrder));
      productsWithItems.push({ ...product, items });
    }

    out.push({ ...family, products: productsWithItems });
  }
  return out;
}

export async function getVaultFamilyForCoach(tenantId: string, familyId: string) {
  const [family] = await db
    .select()
    .from(vaultProductFamilies)
    .where(
      and(
        eq(vaultProductFamilies.id, familyId),
        eq(vaultProductFamilies.tenantId, tenantId),
      ),
    )
    .limit(1);
  if (!family) return null;

  const products = await db
    .select()
    .from(vaultProducts)
    .where(eq(vaultProducts.familyId, family.id))
    .orderBy(asc(vaultProducts.sortOrder));

  const productsWithItems = [];
  for (const product of products) {
    const items = await db
      .select()
      .from(vaultProductItems)
      .where(eq(vaultProductItems.productId, product.id))
      .orderBy(asc(vaultProductItems.sortOrder));
    productsWithItems.push({ ...product, items });
  }

  return { ...family, products: productsWithItems };
}

export async function upsertVaultFamily(
  tenantId: string,
  input: {
    id?: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    heroJson?: VaultFamilyHero;
    sortOrder?: number;
    published?: boolean;
  },
) {
  if (input.id) {
    const [row] = await db
      .update(vaultProductFamilies)
      .set({
        slug: input.slug,
        title: input.title,
        subtitle: input.subtitle ?? null,
        description: input.description ?? null,
        heroJson: input.heroJson ?? {},
        sortOrder: input.sortOrder ?? 0,
        published: input.published ?? false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(vaultProductFamilies.id, input.id),
          eq(vaultProductFamilies.tenantId, tenantId),
        ),
      )
      .returning();
    return row ?? null;
  }

  const [row] = await db
    .insert(vaultProductFamilies)
    .values({
      tenantId,
      slug: input.slug,
      title: input.title,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      heroJson: input.heroJson ?? {},
      sortOrder: input.sortOrder ?? 0,
      published: input.published ?? false,
    })
    .returning();
  return row;
}

export async function upsertVaultProduct(
  tenantId: string,
  input: {
    id?: string;
    familyId: string;
    slug: string;
    label: string;
    validityDays: number;
    listPriceInr?: number | null;
    salePriceInr: number;
    listPriceUsd?: number | null;
    salePriceUsd: number;
    includesJson?: string[];
    badge?: string | null;
    sortOrder?: number;
    active?: boolean;
  },
) {
  const payload = {
    slug: input.slug,
    label: input.label,
    validityDays: input.validityDays,
    listPriceInr: input.listPriceInr ?? null,
    salePriceInr: input.salePriceInr,
    listPriceUsd: input.listPriceUsd ?? null,
    salePriceUsd: input.salePriceUsd,
    includesJson: input.includesJson ?? [],
    badge: input.badge ?? null,
    sortOrder: input.sortOrder ?? 0,
    active: input.active ?? true,
    updatedAt: new Date(),
  };

  if (input.id) {
    const [row] = await db
      .update(vaultProducts)
      .set(payload)
      .where(
        and(
          eq(vaultProducts.id, input.id),
          eq(vaultProducts.tenantId, tenantId),
        ),
      )
      .returning();
    return row ?? null;
  }

  const [row] = await db
    .insert(vaultProducts)
    .values({ tenantId, familyId: input.familyId, ...payload })
    .returning();
  return row;
}

export async function replaceVaultProductItems(
  productId: string,
  items: Array<{
    itemType: "video" | "content_block" | "nutrition_note" | "shopping_list" | "external_link";
    refId?: string | null;
    title: string;
    payloadJson?: Record<string, unknown>;
    sortOrder?: number;
  }>,
) {
  await db.delete(vaultProductItems).where(eq(vaultProductItems.productId, productId));
  if (items.length === 0) return [];
  return db
    .insert(vaultProductItems)
    .values(
      items.map((item, index) => ({
        productId,
        itemType: item.itemType,
        refId: item.refId ?? null,
        title: item.title,
        payloadJson: item.payloadJson ?? {},
        sortOrder: item.sortOrder ?? index,
      })),
    )
    .returning();
}

export async function deleteVaultFamily(tenantId: string, familyId: string) {
  await db
    .delete(vaultProductFamilies)
    .where(
      and(
        eq(vaultProductFamilies.id, familyId),
        eq(vaultProductFamilies.tenantId, tenantId),
      ),
    );
}

function mergeCatalogMarketing(
  partial: Record<string, unknown> | null | undefined,
): VaultCatalogMarketing {
  const src = partial ?? {};
  return {
    ...DEFAULT_VAULT_CATALOG_MARKETING,
    ...src,
    whyChoose:
      (src.whyChoose as VaultCatalogMarketing["whyChoose"]) ??
      DEFAULT_VAULT_CATALOG_MARKETING.whyChoose,
    testimonials:
      (src.testimonials as VaultCatalogMarketing["testimonials"]) ??
      DEFAULT_VAULT_CATALOG_MARKETING.testimonials,
    pressFeatures:
      (src.pressFeatures as VaultCatalogMarketing["pressFeatures"]) ??
      DEFAULT_VAULT_CATALOG_MARKETING.pressFeatures,
    coachStory: {
      ...DEFAULT_VAULT_CATALOG_MARKETING.coachStory,
      ...((src.coachStory as VaultCatalogMarketing["coachStory"]) ?? {}),
    },
    journeySteps:
      (src.journeySteps as VaultCatalogMarketing["journeySteps"]) ??
      DEFAULT_VAULT_CATALOG_MARKETING.journeySteps,
    journeyCta: {
      ...DEFAULT_VAULT_CATALOG_MARKETING.journeyCta,
      ...((src.journeyCta as VaultCatalogMarketing["journeyCta"]) ?? {}),
    },
  };
}

export async function getVaultCatalogMarketing(
  tenantId: string,
): Promise<VaultCatalogMarketing> {
  const [row] = await db
    .select()
    .from(vaultCatalogSettings)
    .where(eq(vaultCatalogSettings.tenantId, tenantId))
    .limit(1);

  return mergeCatalogMarketing(
    (row?.marketingJson ?? {}) as Record<string, unknown>,
  );
}

export async function upsertVaultCatalogMarketing(
  tenantId: string,
  marketing: Partial<VaultCatalogMarketing>,
) {
  const current = await getVaultCatalogMarketing(tenantId);
  const next = mergeCatalogMarketing({ ...current, ...marketing });

  const [row] = await db
    .insert(vaultCatalogSettings)
    .values({
      tenantId,
      marketingJson: next,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: vaultCatalogSettings.tenantId,
      set: {
        marketingJson: next,
        updatedAt: new Date(),
      },
    })
    .returning();

  return mergeCatalogMarketing(
    (row.marketingJson ?? {}) as Record<string, unknown>,
  );
}