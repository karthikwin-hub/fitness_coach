"use client";

import { useState } from "react";
import Link from "next/link";
import {
  VaultCurrencyToggle,
  defaultCatalogCurrency,
} from "@/components/vault/vault-program-card";
import {
  formatVaultPrice,
  productSalePrice,
  type PriceCurrency,
} from "@/lib/vault/format-price";
import type { VaultProductDetail } from "@/lib/vault/types";

export function VaultProductDetailView({ family }: { family: VaultProductDetail }) {
  const [currency, setCurrency] = useState<PriceCurrency>(() =>
    defaultCatalogCurrency(),
  );
  const [selectedProductId, setSelectedProductId] = useState(
    family.products.find((p) => p.badge)?.id ?? family.products[0]?.id ?? "",
  );
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const selected = family.products.find((p) => p.id === selectedProductId);
  const isForYou = family.heroJson.isForYou ?? [];
  const testimonials = family.heroJson.testimonials ?? [];

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setStatus("loading");
    setError(null);
    const res = await fetch("/api/vault-waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        location: `${family.slug}/${selected.slug}`,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not submit");
      setStatus("error");
      return;
    }
    setStatus("done");
  }

  return (
    <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
      <header className="border-b border-white/10 px-4 py-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/programs" className="text-xs text-white/40 hover:text-white/70">
              ← All programs
            </Link>
            <h1 className="font-heading mt-2 text-2xl sm:text-3xl">{family.title}</h1>
            {family.subtitle && (
              <p className="mt-2 text-sm text-white/60">{family.subtitle}</p>
            )}
          </div>
          <VaultCurrencyToggle currency={currency} onChange={setCurrency} />
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-8 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-3">
          {family.description && (
            <p className="text-sm text-white/70">{family.description}</p>
          )}

          {isForYou.length > 0 && (
            <section className="mt-8">
              <h2 className="font-heading text-base text-white/80">Is this for you?</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {isForYou.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[var(--brand-diet)]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {selected && selected.includesJson.length > 0 && (
            <section className="mt-8">
              <h2 className="font-heading text-base text-white/80">What&apos;s included</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {selected.includesJson.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[var(--brand-diet)]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {testimonials.length > 0 && (
            <section className="mt-8 space-y-3">
              <h2 className="font-heading text-base text-white/80">What members say</h2>
              {testimonials.map((t) => (
                <blockquote
                  key={t.name}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm"
                >
                  <p className="text-white/80">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-2 text-xs text-white/40">— {t.name}</footer>
                </blockquote>
              ))}
            </section>
          )}
        </div>

        <aside className="lg:col-span-2">
          <div className="sticky top-6 rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-5">
            <h2 className="font-heading text-base">Choose your plan</h2>
            <div className="mt-4 space-y-2">
              {family.products.map((product) => {
                const { sale, list } = productSalePrice(product, currency);
                const active = product.id === selectedProductId;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProductId(product.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      active
                        ? "border-[var(--brand-workout)] bg-[var(--brand-workout)]/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{product.label}</p>
                        <p className="text-[10px] text-white/40">
                          {product.validityDays} days ·{" "}
                          {product.badge ?? "Full access"}
                        </p>
                      </div>
                      <div className="text-right">
                        {list != null && list > sale && (
                          <p className="text-xs text-white/40 line-through">
                            {formatVaultPrice(list, currency)}
                          </p>
                        )}
                        <p className="font-heading text-lg">
                          {formatVaultPrice(sale, currency)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {status === "done" ? (
              <div className="mt-4 rounded-lg border border-[var(--brand-diet)]/30 bg-[var(--brand-diet)]/10 p-3 text-sm text-[var(--brand-diet)]">
                You&apos;re on the list — we&apos;ll email you when checkout opens for{" "}
                {selected?.label}.
              </div>
            ) : (
              <form onSubmit={joinWaitlist} className="mt-4 space-y-3">
                <p className="text-xs text-white/50">
                  Checkout coming in Phase 2. Join the waitlist to get early access.
                </p>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2.5 text-sm"
                />
                {error && <p className="text-xs text-red-300">{error}</p>}
                <button
                  type="submit"
                  disabled={status === "loading" || !selected}
                  className="tap-target w-full rounded-xl bg-[var(--brand-workout)] py-3 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
                >
                  {status === "loading" ? "Submitting…" : "Buy now — join waitlist"}
                </button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
