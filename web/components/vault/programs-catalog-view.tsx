"use client";

import { useState } from "react";
import Link from "next/link";
import {
  VaultCurrencyToggle,
  VaultProgramCard,
  defaultCatalogCurrency,
} from "@/components/vault/vault-program-card";
import { VaultCatalogHero, PROGRAMS_ANCHOR } from "@/components/vault/vault-catalog-hero";
import { VaultTestimonialsSection } from "@/components/vault/vault-testimonials-section";
import { VaultPressSection } from "@/components/vault/vault-press-section";
import { VaultWhyChooseSection } from "@/components/vault/vault-why-choose-section";
import { VaultCoachStorySection } from "@/components/vault/vault-coach-story-section";
import { VaultJourneyCtaSection } from "@/components/vault/vault-journey-cta-section";
import type { PriceCurrency } from "@/lib/vault/format-price";
import type { VaultCatalogFamily, VaultCatalogMarketing } from "@/lib/vault/types";

export function ProgramsCatalogView({
  families,
  marketing,
}: {
  families: VaultCatalogFamily[];
  marketing: VaultCatalogMarketing;
}) {
  const [currency, setCurrency] = useState<PriceCurrency>(() =>
    defaultCatalogCurrency(),
  );

  return (
    <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
      <div className="absolute right-4 top-4 z-10 lg:right-8 lg:top-6">
        <VaultCurrencyToggle currency={currency} onChange={setCurrency} />
      </div>

      <VaultCatalogHero marketing={marketing} />
      <VaultTestimonialsSection testimonials={marketing.testimonials} />
      <VaultPressSection pressFeatures={marketing.pressFeatures} />
      <VaultWhyChooseSection whyChoose={marketing.whyChoose} />

      <section
        id={PROGRAMS_ANCHOR}
        className="scroll-mt-6 mx-auto max-w-5xl px-4 py-10 lg:px-8"
      >
        <h2 className="font-heading text-lg text-white/80">Signature programs</h2>
        <p className="mt-2 text-sm text-white/50">
          Pick a theme and duration — checkout opens soon (join the waitlist today).
        </p>
        {families.length === 0 ? (
          <p className="mt-6 text-white/50">Programs coming soon.</p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {families.map((family) => (
              <VaultProgramCard
                key={family.id}
                family={family}
                currency={currency}
              />
            ))}
          </div>
        )}
      </section>

      <VaultCoachStorySection coachStory={marketing.coachStory} />
      <VaultJourneyCtaSection
        journeySteps={marketing.journeySteps}
        journeyCta={marketing.journeyCta}
      />

      <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-white/40">
        <Link href="/login" className="underline hover:text-white/70">
          Sign in
        </Link>
        {" · "}
        <Link href="/" className="underline hover:text-white/70">
          Coaching site
        </Link>
      </footer>
    </div>
  );
}
