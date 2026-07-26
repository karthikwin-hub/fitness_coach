"use client";

import Link from "next/link";
import {
  formatVaultPrice,
  pickDisplayCurrency,
  productSalePrice,
  type PriceCurrency,
} from "@/lib/vault/format-price";
import type { VaultCatalogFamily, VaultCatalogProduct } from "@/lib/vault/types";

function ProductPrice({
  product,
  currency,
}: {
  product: VaultCatalogProduct;
  currency: PriceCurrency;
}) {
  const { sale, list } = productSalePrice(product, currency);
  return (
    <div className="mt-2 flex items-baseline gap-2">
      {list != null && list > sale && (
        <span className="text-sm text-white/40 line-through">
          {formatVaultPrice(list, currency)}
        </span>
      )}
      <span className="font-heading text-xl text-white">
        {formatVaultPrice(sale, currency)}
      </span>
    </div>
  );
}

export function VaultProgramCard({
  family,
  currency,
  compact = false,
}: {
  family: VaultCatalogFamily;
  currency: PriceCurrency;
  compact?: boolean;
}) {
  const featured =
    family.products.find((p) => p.badge) ?? family.products[0];

  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-5">
      {featured?.badge && (
        <span className="mb-2 inline-block w-fit rounded-full bg-[var(--brand-workout)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-workout)]">
          {featured.badge.replace(/_/g, " ")}
        </span>
      )}
      <h3 className="font-heading text-lg text-white">{family.title}</h3>
      {family.subtitle && (
        <p className="mt-1 text-sm text-white/60">{family.subtitle}</p>
      )}
      {!compact && family.products[0]?.includesJson?.length > 0 && (
        <ul className="mt-4 flex-1 space-y-1.5 text-xs text-white/70">
          {family.products[0].includesJson.slice(0, 5).map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-[var(--brand-diet)]">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 space-y-2">
        {family.products.map((product) => (
          <div
            key={product.id}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white">{product.label}</p>
                <p className="text-[10px] text-white/40">
                  {product.validityDays} days access
                </p>
              </div>
              <ProductPrice product={product} currency={currency} />
            </div>
          </div>
        ))}
      </div>
      <Link
        href={`/vault/${family.slug}`}
        className="tap-target mt-4 block rounded-xl bg-[var(--brand-workout)] py-3 text-center text-sm font-semibold text-[var(--brand-dark)]"
      >
        View program
      </Link>
    </article>
  );
}

export function VaultCurrencyToggle({
  currency,
  onChange,
}: {
  currency: PriceCurrency;
  onChange: (c: PriceCurrency) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/15 p-0.5 text-xs">
      {(["INR", "USD"] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`rounded-md px-3 py-1.5 ${
            currency === c
              ? "bg-white/15 text-white"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

export function defaultCatalogCurrency(): PriceCurrency {
  if (typeof window === "undefined") return "USD";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return pickDisplayCurrency(tz.includes("Kolkata") || tz.includes("Calcutta"));
}
