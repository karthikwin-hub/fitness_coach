"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CoachPlanDeliveryNav } from "@/components/coach/coach-plan-delivery-nav";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import type { VaultCatalogMarketing } from "@/lib/vault/types";
type VaultItem = {
  id: string;
  itemType: string;
  refId: string | null;
  title: string;
  payloadJson: Record<string, unknown>;
  sortOrder: number;
};

type VaultProduct = {
  id: string;
  slug: string;
  label: string;
  validityDays: number;
  listPriceInr: number | null;
  salePriceInr: number;
  listPriceUsd: number | null;
  salePriceUsd: number;
  includesJson: string[];
  badge: string | null;
  sortOrder: number;
  active: boolean;
  items: VaultItem[];
};

type VaultFamily = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  heroJson: Record<string, unknown>;
  sortOrder: number;
  published: boolean;
  products: VaultProduct[];
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm text-white";

export function CoachVaultProgramsView() {
  const getHeaders = useAuthHeaders();
  const [families, setFamilies] = useState<VaultFamily[]>([]);
  const [marketing, setMarketing] = useState<VaultCatalogMarketing | null>(null);
  const [storefrontOpen, setStorefrontOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [familiesRes, marketingRes] = await Promise.all([
      authFetch("/api/coach/vault/families", {}, getHeaders),
      authFetch("/api/coach/vault/catalog-settings", {}, getHeaders),
    ]);
    if (familiesRes.ok) setFamilies(await familiesRes.json());
    if (marketingRes.ok) setMarketing(await marketingRes.json());
  }, [getHeaders]);
  useEffect(() => {
    void load();
  }, [load]);

  async function saveFamily(family: VaultFamily) {
    setSaving(true);
    setMessage(null);
    const res = await authFetch(`/api/coach/vault/families/${family.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: family.slug,
        title: family.title,
        subtitle: family.subtitle,
        description: family.description,
        heroJson: family.heroJson,
        published: family.published,
        sortOrder: family.sortOrder,
      }),
    }, getHeaders);
    setSaving(false);
    if (res.ok) {
      setMessage("Program saved.");
      load();
    } else {
      setMessage("Save failed.");
    }
  }

  async function saveProduct(familyId: string, product: VaultProduct) {    setSaving(true);
    const res = await authFetch(`/api/coach/vault/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: product.slug,
        label: product.label,
        validityDays: product.validityDays,
        listPriceInr: product.listPriceInr,
        salePriceInr: product.salePriceInr,
        listPriceUsd: product.listPriceUsd,
        salePriceUsd: product.salePriceUsd,
        includesJson: product.includesJson,
        badge: product.badge,
        active: product.active,
        sortOrder: product.sortOrder,
      }),
    }, getHeaders);
    setSaving(false);
    if (res.ok) {
      setMessage("Pricing saved.");
      load();
    }
  }

  async function saveStorefront() {
    if (!marketing) return;
    setSaving(true);
    setMessage(null);
    const res = await authFetch("/api/coach/vault/catalog-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heroHeadline: marketing.heroHeadline,
        heroSubhead: marketing.heroSubhead,
        heroCtaLabel: marketing.heroCtaLabel,
        trustStat: marketing.trustStat,
        coachStory: marketing.coachStory,
        journeyCta: marketing.journeyCta,
      }),
    }, getHeaders);
    setSaving(false);
    if (res.ok) {
      setMessage("Storefront copy saved.");
      load();
    } else {
      setMessage("Storefront save failed.");
    }
  }

  function updateMarketing(patch: Partial<VaultCatalogMarketing>) {
    setMarketing((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function updateCoachStory(patch: Partial<VaultCatalogMarketing["coachStory"]>) {
    setMarketing((prev) =>
      prev ? { ...prev, coachStory: { ...prev.coachStory, ...patch } } : prev,
    );
  }

  function updateFamily(id: string, patch: Partial<VaultFamily>) {    setFamilies((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  }

  function updateProduct(
    familyId: string,
    productId: string,
    patch: Partial<VaultProduct>,
  ) {
    setFamilies((prev) =>
      prev.map((f) =>
        f.id !== familyId
          ? f
          : {
              ...f,
              products: f.products.map((p) =>
                p.id === productId ? { ...p, ...patch } : p,
              ),
            },
      ),
    );
  }

  return (
    <div className="coach-atmosphere min-h-dvh px-4 py-6 text-white lg:px-8">
      <div className="mx-auto max-w-4xl">
        <CoachPlanDeliveryNav />
        <p className="mt-6 text-xs text-[var(--brand-workout)]">Vault programs</p>
        <h1 className="font-heading text-xl">Program catalog & pricing</h1>
        <p className="mt-2 text-sm text-white/60">
          Package content and set prices for the public{" "}
          <Link href="/programs" className="text-[var(--brand-diet)] underline">
            /programs
          </Link>{" "}
          storefront. Checkout is Phase 2 — Buy Now uses waitlist for now.
        </p>

        {message && (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
            {message}
          </p>
        )}

        {marketing && (
          <div className="mt-8 rounded-xl border border-white/10 bg-[var(--brand-dark-surface)]">
            <button
              type="button"
              onClick={() => setStorefrontOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="font-medium">Storefront copy</p>
                <p className="text-xs text-white/40">
                  Hero, trust stat, and coach story on /programs
                </p>
              </div>
              <span className="text-white/40">{storefrontOpen ? "−" : "+"}</span>
            </button>
            {storefrontOpen && (
              <div className="space-y-3 border-t border-white/10 px-4 py-4">
                {(
                  [
                    ["heroHeadline", "Hero headline"],
                    ["heroSubhead", "Hero subhead"],
                    ["heroCtaLabel", "Hero CTA label"],
                    ["trustStat", "Trust stat"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-xs text-white/50">
                    {label}
                    <input
                      value={marketing[key]}
                      onChange={(e) => updateMarketing({ [key]: e.target.value })}
                      className={fieldClass}
                    />
                  </label>
                ))}
                <label className="block text-xs text-white/50">
                  Coach story title
                  <input
                    value={marketing.coachStory.title}
                    onChange={(e) => updateCoachStory({ title: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-xs text-white/50">
                  Coach story body
                  <textarea
                    value={marketing.coachStory.body}
                    onChange={(e) => updateCoachStory({ body: e.target.value })}
                    rows={4}
                    className={fieldClass}
                  />
                </label>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveStorefront()}
                  className="rounded-lg bg-[var(--brand-workout)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                >
                  Save storefront
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 space-y-4">          {families.map((family) => {
            const open = expandedId === family.id;
            return (
              <div
                key={family.id}
                className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)]"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : family.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="font-medium">{family.title}</p>
                    <p className="text-xs text-white/40">
                      /vault/{family.slug} · {family.published ? "Published" : "Draft"}
                    </p>
                  </div>
                  <span className="text-white/40">{open ? "−" : "+"}</span>
                </button>

                {open && (
                  <div className="space-y-4 border-t border-white/10 px-4 py-4">
                    <label className="block text-xs text-white/50">
                      Title
                      <input
                        value={family.title}
                        onChange={(e) =>
                          updateFamily(family.id, { title: e.target.value })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className="block text-xs text-white/50">
                      Subtitle
                      <input
                        value={family.subtitle ?? ""}
                        onChange={(e) =>
                          updateFamily(family.id, { subtitle: e.target.value })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className="block text-xs text-white/50">
                      Description
                      <textarea
                        value={family.description ?? ""}
                        onChange={(e) =>
                          updateFamily(family.id, { description: e.target.value })
                        }
                        rows={3}
                        className={fieldClass}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={family.published}
                        onChange={(e) =>
                          updateFamily(family.id, { published: e.target.checked })
                        }
                      />
                      Published on /programs
                    </label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveFamily(family)}
                      className="rounded-lg bg-[var(--brand-workout)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                    >
                      Save program
                    </button>

                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm font-medium text-white/70">SKUs & pricing</h3>
                      {family.products.map((product) => (
                        <div
                          key={product.id}
                          className="rounded-lg border border-white/10 p-3"
                        >
                          <p className="text-sm font-medium">{product.label}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {(
                              [
                                ["validityDays", "Days"],
                                ["listPriceInr", "List ₹"],
                                ["salePriceInr", "Sale ₹"],
                                ["listPriceUsd", "List $"],
                                ["salePriceUsd", "Sale $"],
                              ] as const
                            ).map(([key, label]) => (
                              <label key={key} className="block text-[10px] text-white/40">
                                {label}
                                <input
                                  type="number"
                                  value={
                                    product[key as keyof VaultProduct] as number | null ?? ""
                                  }
                                  onChange={(e) =>
                                    updateProduct(family.id, product.id, {
                                      [key]: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    })
                                  }
                                  className={fieldClass}
                                />
                              </label>
                            ))}
                          </div>
                          <label className="mt-2 block text-[10px] text-white/40">
                            Includes (one per line)
                            <textarea
                              value={product.includesJson.join("\n")}
                              onChange={(e) =>
                                updateProduct(family.id, product.id, {
                                  includesJson: e.target.value
                                    .split("\n")
                                    .map((l) => l.trim())
                                    .filter(Boolean),
                                })
                              }
                              rows={4}
                              className={fieldClass}
                            />
                          </label>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => saveProduct(family.id, product)}
                            className="mt-2 rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/80"
                          >
                            Save pricing
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
