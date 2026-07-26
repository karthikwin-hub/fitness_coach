"use client";

import type { VaultCatalogMarketing } from "@/lib/vault/types";
import { scrollToPrograms } from "@/components/vault/vault-catalog-hero";

export function VaultJourneyCtaSection({
  journeySteps,
  journeyCta,
}: {
  journeySteps: VaultCatalogMarketing["journeySteps"];
  journeyCta: VaultCatalogMarketing["journeyCta"];
}) {
  return (
    <section className="px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-lg">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {journeySteps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-xl border border-white/10 p-4 text-sm"
            >
              <span className="text-xs text-[var(--brand-workout)]">
                0{i + 1}
              </span>
              <p className="mt-1 font-medium text-white">{step.title}</p>
              <p className="mt-1 text-white/50">{step.description}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-2xl border border-[var(--brand-workout)]/30 bg-[var(--brand-workout)]/5 p-6 text-center sm:p-8">
          <h3 className="font-heading text-xl">{journeyCta.headline}</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">
            {journeyCta.subhead}
          </p>
          <button
            type="button"
            onClick={scrollToPrograms}
            className="tap-target mt-6 rounded-xl bg-[var(--brand-workout)] px-8 py-3 text-sm font-semibold text-[var(--brand-dark)]"
          >
            {journeyCta.buttonLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
