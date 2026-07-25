import Link from "next/link";
import { ABSTRACK_BRAND } from "@/lib/brand";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--brand-dark)] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #16B1A9 0%, transparent 55%)",
        }}
      />
      <header className="relative z-10 px-6 pt-12 text-center">
        <p className="text-sm font-semibold tracking-widest text-[var(--brand-workout)]">
          {ABSTRACK_BRAND.name}
        </p>
        <h1 className="font-heading mt-4 text-3xl leading-tight sm:text-4xl">
          {ABSTRACK_BRAND.tagline}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-base text-white/70">
          Hybrid coaching for busy professionals across India, the US, and
          Australia. Nutrition first. Sustainable movement. Data-driven
          accountability.
        </p>
      </header>

      <div className="relative z-10 mt-auto px-6 pb-10 pt-12">
        <div className="mx-auto flex max-w-sm flex-col gap-3">
          <Link
            href="/philosophy"
            className="tap-target flex items-center justify-center rounded-xl bg-[var(--brand-workout)] px-6 py-4 text-center font-semibold text-[var(--brand-dark)] transition-opacity hover:opacity-90"
          >
            Find Your Fitness Path
          </Link>
          <Link
            href="/login"
            className="tap-target flex items-center justify-center rounded-xl border border-white/20 px-6 py-4 text-center font-medium text-white/90"
          >
            Member / Coach Sign In
          </Link>
        </div>
        <p className="mt-6 text-center text-xs text-white/40">
          Powered by Helna · Abs-Track pilot
        </p>
      </div>
    </div>
  );
}
