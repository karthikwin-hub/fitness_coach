"use client";

import type { VaultCatalogMarketing } from "@/lib/vault/types";

const PROGRAMS_ANCHOR = "signature-programs";

export function scrollToPrograms() {
  document.getElementById(PROGRAMS_ANCHOR)?.scrollIntoView({ behavior: "smooth" });
}

export function VaultCatalogHero({
  marketing,
}: {
  marketing: VaultCatalogMarketing;
}) {
  return (
    <header className="relative overflow-hidden border-b border-white/10 px-4 py-12 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, var(--brand-workout) 0%, transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-widest text-[var(--brand-workout)]">
          Abs-Track Programs
        </p>
        <h1 className="font-heading mt-3 max-w-3xl text-3xl leading-tight sm:text-4xl">
          {marketing.heroHeadline}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-white/70">{marketing.heroSubhead}</p>
        <p className="mt-4 text-sm font-medium text-[var(--brand-diet)]">
          {marketing.trustStat}
        </p>
        <button
          type="button"
          onClick={scrollToPrograms}
          className="tap-target mt-8 rounded-xl bg-[var(--brand-workout)] px-8 py-4 text-sm font-semibold text-[var(--brand-dark)] transition-opacity hover:opacity-90"
        >
          {marketing.heroCtaLabel}
        </button>
      </div>
    </header>
  );
}

export { PROGRAMS_ANCHOR };
