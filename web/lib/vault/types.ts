export type VaultIncludeItem = string;

export type VaultFamilyHero = {
  isForYou?: string[];
  testimonials?: Array<{ name: string; quote: string; rating?: number }>;
  coachBio?: string;
};

export type VaultCatalogMarketing = {
  heroHeadline: string;
  heroSubhead: string;
  heroCtaLabel: string;
  trustStat: string;
  whyChoose: Array<{ title: string; description: string; icon: string }>;
  testimonials: Array<{
    name: string;
    quote: string;
    rating?: number;
    location?: string;
  }>;
  pressFeatures: Array<{ outlet: string; headline: string; year?: string }>;
  coachStory: { title: string; body: string; credentials?: string[] };
  journeySteps: Array<{ title: string; description: string }>;
  journeyCta: { headline: string; subhead: string; buttonLabel: string };
};

export type VaultCatalogFamily = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  heroJson: VaultFamilyHero;
  products: VaultCatalogProduct[];
};

export type VaultCatalogProduct = {
  id: string;
  slug: string;
  label: string;
  validityDays: number;
  listPriceInr: number | null;
  salePriceInr: number;
  listPriceUsd: number | null;
  salePriceUsd: number;
  includesJson: VaultIncludeItem[];
  badge: string | null;
  sortOrder: number;
};

export type VaultProductDetail = VaultCatalogFamily & {
  products: Array<
    VaultCatalogProduct & {
      items: Array<{
        id: string;
        itemType: string;
        refId: string | null;
        title: string;
        payloadJson: Record<string, unknown>;
        sortOrder: number;
      }>;
    }
  >;
};

export const DEFAULT_VAULT_CATALOG_MARKETING: VaultCatalogMarketing = {
  heroHeadline: "Self-paced fitness & nutrition vault",
  heroSubhead:
    "Structured programs you can start today — no 1-on-1 coaching required.",
  heroCtaLabel: "Start Your Journey",
  trustStat: "Trusted by professionals across India, the US, and Australia",
  whyChoose: [
    {
      title: "Nutrition-first",
      description: "Practical meal guides and shopping lists — not crash diets.",
      icon: "🥗",
    },
    {
      title: "Real home workouts",
      description: "Follow-along sessions with minimal equipment.",
      icon: "💪",
    },
    {
      title: "Flexible schedule",
      description: "Train when it fits — no gym or live calls required.",
      icon: "⏱",
    },
    {
      title: "Global community",
      description: "Built for busy professionals worldwide.",
      icon: "🌍",
    },
    {
      title: "Email support",
      description: "Get help when you need it between sessions.",
      icon: "✉",
    },
  ],
  testimonials: [],
  pressFeatures: [],
  coachStory: {
    title: "Meet Helna",
    body: "Helna coaches hybrid clients across India, the US, and Australia. These vault programs package her home-workout and nutrition fundamentals for people who want structure without weekly 1-on-1 calls.",
    credentials: [],
  },
  journeySteps: [
    { title: "Pick your program", description: "Choose the theme and duration that fits." },
    { title: "Get instant access", description: "Join the waitlist — checkout opens soon." },
    { title: "Begin at your pace", description: "Follow-along videos, meal guides, and lists." },
  ],
  journeyCta: {
    headline: "Ready to start your journey?",
    subhead: "Pick a program below and join the waitlist for early access.",
    buttonLabel: "Browse programs",
  },
};
