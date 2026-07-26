import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  tenants,
  vaultProductFamilies,
  vaultProductItems,
  vaultProducts,
} from "@/lib/db/schema";
import { upsertVaultCatalogMarketing } from "@/lib/vault/queries";
import { DEMO_CATALOG_MARKETING } from "@/lib/vault/demo-marketing";
import type { VaultFamilyHero } from "@/lib/vault/types";

type SkuSeed = {
  slug: string;
  label: string;
  validityDays: number;
  listPriceInr: number | null;
  salePriceInr: number;
  listPriceUsd: number | null;
  salePriceUsd: number;
  includesJson: string[];
  badge?: string | null;
  sortOrder: number;
  items?: Array<{
    itemType: "nutrition_note" | "shopping_list";
    title: string;
    payloadJson: Record<string, unknown>;
    sortOrder: number;
  }>;
};

type FamilySeed = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  heroJson: VaultFamilyHero;
  sortOrder: number;
  skus: SkuSeed[];
};

const DEMO_FAMILIES: FamilySeed[] = [
  {
    slug: "stay-fit-busy-professionals",
    title: "StayFit for Busy Professionals",
    subtitle: "Home workouts + practical nutrition when time is tight",
    description:
      "Follow-along sessions, a sample weekly meal plan, and a shopping list — built for working adults who want structure without a gym or 1-on-1 coaching.",
    heroJson: {
      isForYou: [
        "You work long hours and need efficient home workouts",
        "You want nutrition guidance without extreme diets",
        "You prefer self-paced programs over live coaching calls",
        "You travel or work from home and need flexible scheduling",
      ],
      testimonials: [
        {
          name: "Priya S.",
          quote: "Finally a plan that fits between meetings — 25 minutes and I'm done.",
          rating: 5,
        },
        {
          name: "James L.",
          quote: "The shopping list alone saved me hours every week.",
          rating: 5,
        },
      ],
      coachBio:
        "Helna built Abs-Track for hybrid coaching worldwide. This self-paced vault packs her home-workout and nutrition fundamentals for professionals who are not ready for 1-on-1 coaching yet.",
    },
    sortOrder: 0,
    skus: [
      {
        slug: "3-month",
        label: "3-Month Plan",
        validityDays: 90,
        listPriceInr: 4500,
        salePriceInr: 3000,
        listPriceUsd: 75,
        salePriceUsd: 50,
        includesJson: [
          "20+ follow-along home workouts",
          "Core + strength — minimal equipment",
          "Sample 1-week busy-professional meal plan",
          "Printable shopping list",
          "Flexible schedule — no gym required",
          "Email support",
        ],
        sortOrder: 0,
        items: [
          {
            itemType: "nutrition_note",
            title: "Sample week — busy professional meals",
            payloadJson: {
              summary: "Balanced macros with quick prep options for office days.",
            },
            sortOrder: 0,
          },
          {
            itemType: "shopping_list",
            title: "Weekly grocery list",
            payloadJson: {
              items: ["Greek yogurt", "Eggs", "Oats", "Chicken breast", "Mixed greens", "Brown rice"],
            },
            sortOrder: 1,
          },
        ],
      },
      {
        slug: "6-month",
        label: "6-Month Plan",
        validityDays: 180,
        listPriceInr: 6500,
        salePriceInr: 4500,
        listPriceUsd: 110,
        salePriceUsd: 75,
        badge: "BEST SELLER",
        includesJson: [
          "40+ follow-along home workouts",
          "Progressive strength blocks",
          "Extended nutrition guide + shopping lists",
          "Weekly structure template",
          "Flexible schedule — no gym required",
          "Email support",
        ],
        sortOrder: 1,
        items: [
          {
            itemType: "nutrition_note",
            title: "Extended nutrition guide",
            payloadJson: { summary: "Six weeks of meal templates with swap options." },
            sortOrder: 0,
          },
        ],
      },
    ],
  },
  {
    slug: "post-delivery-reset",
    title: "Post-Delivery Reset",
    subtitle: "Gentle core recovery and strength for new moms",
    description:
      "Rebuild core strength safely after delivery with follow-along sessions, pelvic-floor friendly progressions, and nourishing meal templates for busy new parents.",
    heroJson: {
      isForYou: [
        "You are recovering postpartum and want safe, guided movement",
        "You need short sessions that fit around baby schedules",
        "You want practical nutrition without restrictive dieting",
        "You prefer structure over figuring it out alone",
      ],
      testimonials: [
        {
          name: "Ananya M.",
          quote: "The core progressions felt safe and I finally understood diastasis basics.",
          rating: 5,
        },
        {
          name: "Sarah K.",
          quote: "Twenty-minute sessions while the baby naps — exactly what I needed.",
          rating: 5,
        },
      ],
      coachBio:
        "Helna guides new moms through sustainable recovery — combining gentle strength, core awareness, and nutrition that supports energy, not deprivation.",
    },
    sortOrder: 1,
    skus: [
      {
        slug: "3-month",
        label: "3-Month Reset",
        validityDays: 90,
        listPriceInr: 3999,
        salePriceInr: 2499,
        listPriceUsd: 65,
        salePriceUsd: 45,
        includesJson: [
          "15+ gentle follow-along workouts",
          "Core recovery progressions",
          "Sample 1-week nourishing meal plan",
          "Printable shopping list",
          "Pelvic-floor friendly modifications",
          "Email support",
        ],
        sortOrder: 0,
        items: [
          {
            itemType: "nutrition_note",
            title: "New mom nourishment guide",
            payloadJson: { summary: "Energy-supporting meals with quick prep options." },
            sortOrder: 0,
          },
        ],
      },
      {
        slug: "6-month",
        label: "6-Month Recovery",
        validityDays: 180,
        listPriceInr: 5999,
        salePriceInr: 3999,
        listPriceUsd: 95,
        salePriceUsd: 65,
        includesJson: [
          "30+ progressive recovery workouts",
          "Strength return pathway",
          "Extended meal templates + swaps",
          "Weekly habit tracker",
          "Email support",
        ],
        sortOrder: 1,
      },
    ],
  },
  {
    slug: "sustainable-weight-loss",
    title: "Sustainable Weight Loss",
    subtitle: "Fat loss without extremes — nutrition-first, home workouts",
    description:
      "A structured fat-loss program with calorie-aware meal guides, strength + cardio home sessions, and habits you can maintain long after the program ends.",
    heroJson: {
      isForYou: [
        "You have tried crash diets and want something sustainable",
        "You want clear meal structure without cutting entire food groups",
        "You prefer home workouts over gym memberships",
        "You want accountability through structure, not daily calls",
      ],
      testimonials: [
        {
          name: "Rohit P.",
          quote: "Lost 6 kg in 12 weeks without feeling hungry all the time.",
          rating: 5,
        },
        {
          name: "Emily T.",
          quote: "The meal swaps made this work with my family dinners.",
          rating: 5,
        },
      ],
      coachBio:
        "Helna's nutrition-first approach helps you lose weight sustainably — combining practical meal plans with efficient home training blocks.",
    },
    sortOrder: 2,
    skus: [
      {
        slug: "3-month",
        label: "3-Month Transform",
        validityDays: 90,
        listPriceInr: 4500,
        salePriceInr: 2999,
        listPriceUsd: 75,
        salePriceUsd: 49,
        includesJson: [
          "25+ fat-loss focused home workouts",
          "Calorie-aware meal plan templates",
          "Weekly shopping lists",
          "Habit tracker",
          "Email support",
        ],
        sortOrder: 0,
      },
      {
        slug: "6-month",
        label: "6-Month Transform",
        validityDays: 180,
        listPriceInr: 6999,
        salePriceInr: 4499,
        listPriceUsd: 115,
        salePriceUsd: 75,
        badge: "BEST SELLER",
        includesJson: [
          "45+ progressive workouts",
          "Extended nutrition guide",
          "Meal prep playbook",
          "Monthly structure templates",
          "Email support",
        ],
        sortOrder: 1,
      },
    ],
  },
  {
    slug: "core-abs-foundations",
    title: "Core & Abs Foundations",
    subtitle: "Build a strong midsection at home — minimal equipment",
    description:
      "Master core stability and ab strength with progressive follow-along sessions. Perfect if you want a focused strength block without a full gym program.",
    heroJson: {
      isForYou: [
        "You want visible core strength and better posture",
        "You have 20–30 minutes and basic home equipment",
        "You are tired of random ab videos with no progression",
        "You want nutrition tips that support muscle recovery",
      ],
      testimonials: [
        {
          name: "David W.",
          quote: "My lower back feels stronger and the progressions actually make sense.",
          rating: 5,
        },
        {
          name: "Meera R.",
          quote: "Clear cues and no gimmicks — just solid core work.",
          rating: 5,
        },
      ],
      coachBio:
        "Helna's core programming emphasizes stability first, then strength — safe progressions you can repeat and build on.",
    },
    sortOrder: 3,
    skus: [
      {
        slug: "3-month",
        label: "3-Month Core",
        validityDays: 90,
        listPriceInr: 3500,
        salePriceInr: 2499,
        listPriceUsd: 59,
        salePriceUsd: 39,
        includesJson: [
          "18+ core-focused workouts",
          "Stability → strength progressions",
          "Recovery nutrition tips",
          "Printable workout calendar",
          "Email support",
        ],
        sortOrder: 0,
      },
      {
        slug: "6-month",
        label: "6-Month Core",
        validityDays: 180,
        listPriceInr: 5500,
        salePriceInr: 3799,
        listPriceUsd: 89,
        salePriceUsd: 59,
        includesJson: [
          "35+ progressive core sessions",
          "Full-body integration blocks",
          "Meal timing guide for recovery",
          "Email support",
        ],
        sortOrder: 1,
      },
    ],
  },
  {
    slug: "nutrition-essentials",
    title: "Nutrition Essentials",
    subtitle: "Practical meal planning for real life — no workout bundle required",
    description:
      "A diet-first video course covering macros, Indian and Western meal templates, grocery planning, and sustainable habits — ideal if you want nutrition structure before adding training.",
    heroJson: {
      isForYou: [
        "You want to fix nutrition before committing to workouts",
        "You cook for a family and need flexible meal templates",
        "You travel between India, US, or Australia and need adaptable plans",
        "You want to understand macros without obsessive tracking",
      ],
      testimonials: [
        {
          name: "Lisa H.",
          quote: "Finally understood portions without weighing every meal.",
          rating: 5,
        },
        {
          name: "Arjun V.",
          quote: "The Indian meal swaps section alone was worth it.",
          rating: 5,
        },
      ],
      coachBio:
        "Helna's nutrition philosophy: structure over restriction. This course packages her most practical meal-planning frameworks for self-paced learners.",
    },
    sortOrder: 4,
    skus: [
      {
        slug: "full-access",
        label: "Full Access",
        validityDays: 365,
        listPriceInr: 4999,
        salePriceInr: 1999,
        listPriceUsd: 79,
        salePriceUsd: 35,
        badge: "BEST VALUE",
        includesJson: [
          "12-part nutrition video course",
          "Macro basics without obsession",
          "Indian + Western meal templates",
          "Grocery planning worksheets",
          "Travel and eating-out guide",
          "Email support",
        ],
        sortOrder: 0,
        items: [
          {
            itemType: "nutrition_note",
            title: "Starter meal template pack",
            payloadJson: { summary: "Four weeks of mix-and-match meals." },
            sortOrder: 0,
          },
          {
            itemType: "shopping_list",
            title: "Pantry essentials list",
            payloadJson: {
              items: ["Lentils", "Quinoa", "Eggs", "Leafy greens", "Olive oil", "Spices kit"],
            },
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    slug: "travel-hybrid-worker",
    title: "Travel-Proof Fitness",
    subtitle: "Stay consistent when your schedule and location change weekly",
    description:
      "Hotel-room friendly workouts, minimal-equipment strength, and travel nutrition guides — built for consultants, sales teams, and hybrid workers who are rarely in one place.",
    heroJson: {
      isForYou: [
        "You travel frequently for work",
        "You need workouts that work in hotel rooms or small spaces",
        "You want nutrition strategies for airports and client dinners",
        "You cannot commit to fixed gym schedules",
      ],
      testimonials: [
        {
          name: "Michael B.",
          quote: "Used this across three countries in one month — still hit my step and workout goals.",
          rating: 5,
        },
        {
          name: "Divya N.",
          quote: "The travel meal guide saved me from airport food traps.",
          rating: 5,
        },
      ],
      coachBio:
        "Helna coaches global professionals daily — this pack distills her travel-proof workout and nutrition playbooks into a self-paced program.",
    },
    sortOrder: 5,
    skus: [
      {
        slug: "3-month",
        label: "3-Month Pack",
        validityDays: 90,
        listPriceInr: 4200,
        salePriceInr: 2799,
        listPriceUsd: 69,
        salePriceUsd: 45,
        includesJson: [
          "20+ travel-friendly workouts",
          "Hotel-room and bodyweight options",
          "Airport and restaurant nutrition guide",
          "Packing checklist for fitness gear",
          "Email support",
        ],
        sortOrder: 0,
      },
      {
        slug: "6-month",
        label: "6-Month Pack",
        validityDays: 180,
        listPriceInr: 6200,
        salePriceInr: 4199,
        listPriceUsd: 99,
        salePriceUsd: 69,
        includesJson: [
          "40+ progressive travel workouts",
          "Timezone-adjusted schedule templates",
          "Extended travel nutrition playbook",
          "Email support",
        ],
        sortOrder: 1,
      },
    ],
  },
];

async function upsertFamily(tenantId: string, family: FamilySeed) {
  const [existing] = await db
    .select()
    .from(vaultProductFamilies)
    .where(
      and(
        eq(vaultProductFamilies.tenantId, tenantId),
        eq(vaultProductFamilies.slug, family.slug),
      ),
    )
    .limit(1);

  let familyId: string;
  if (existing) {
    await db
      .update(vaultProductFamilies)
      .set({
        title: family.title,
        subtitle: family.subtitle,
        description: family.description,
        heroJson: family.heroJson,
        sortOrder: family.sortOrder,
        published: true,
        updatedAt: new Date(),
      })
      .where(eq(vaultProductFamilies.id, existing.id));
    familyId = existing.id;
  } else {
    const [row] = await db
      .insert(vaultProductFamilies)
      .values({
        tenantId,
        slug: family.slug,
        title: family.title,
        subtitle: family.subtitle,
        description: family.description,
        heroJson: family.heroJson,
        sortOrder: family.sortOrder,
        published: true,
      })
      .returning();
    familyId = row.id;
  }

  for (const sku of family.skus) {
    const [existingSku] = await db
      .select()
      .from(vaultProducts)
      .where(
        and(eq(vaultProducts.familyId, familyId), eq(vaultProducts.slug, sku.slug)),
      )
      .limit(1);

    let productId: string;
    if (existingSku) {
      await db
        .update(vaultProducts)
        .set({
          label: sku.label,
          validityDays: sku.validityDays,
          listPriceInr: sku.listPriceInr,
          salePriceInr: sku.salePriceInr,
          listPriceUsd: sku.listPriceUsd,
          salePriceUsd: sku.salePriceUsd,
          includesJson: sku.includesJson,
          badge: sku.badge ?? null,
          sortOrder: sku.sortOrder,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(vaultProducts.id, existingSku.id));
      productId = existingSku.id;
    } else {
      const [row] = await db
        .insert(vaultProducts)
        .values({
          tenantId,
          familyId,
          slug: sku.slug,
          label: sku.label,
          validityDays: sku.validityDays,
          listPriceInr: sku.listPriceInr,
          salePriceInr: sku.salePriceInr,
          listPriceUsd: sku.listPriceUsd,
          salePriceUsd: sku.salePriceUsd,
          includesJson: sku.includesJson,
          badge: sku.badge ?? null,
          sortOrder: sku.sortOrder,
          active: true,
        })
        .returning();
      productId = row.id;
    }

    if (sku.items?.length) {
      const existingItems = await db
        .select({ id: vaultProductItems.id })
        .from(vaultProductItems)
        .where(eq(vaultProductItems.productId, productId))
        .limit(1);

      if (existingItems.length === 0) {
        await db.insert(vaultProductItems).values(
          sku.items.map((item) => ({
            productId,
            itemType: item.itemType,
            title: item.title,
            payloadJson: item.payloadJson,
            sortOrder: item.sortOrder,
          })),
        );
      }
    }
  }
}

export async function seedVaultDemoCatalog(tenantId: string) {
  for (const family of DEMO_FAMILIES) {
    await upsertFamily(tenantId, family);
  }
  console.log(`Vault demo catalog seeded: ${DEMO_FAMILIES.length} program families.`);
}

export async function seedVaultCatalogMarketing(tenantId: string) {
  await upsertVaultCatalogMarketing(tenantId, DEMO_CATALOG_MARKETING);
  console.log("Vault catalog marketing seeded.");
}

export async function seedVaultForDefaultTenant() {
  const slug = process.env.DEFAULT_TENANT_SLUG ?? "abstrack";
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (!tenant) return;
  await seedVaultDemoCatalog(tenant.id);
  await seedVaultCatalogMarketing(tenant.id);
}

/** @deprecated Use seedVaultDemoCatalog */
export async function seedVaultStarterPack(tenantId: string) {
  await seedVaultDemoCatalog(tenantId);
  await seedVaultCatalogMarketing(tenantId);
}
