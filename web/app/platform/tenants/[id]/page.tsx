"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import type { TenantBranding } from "@/lib/brand";

type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  calComUrl: string | null;
  aiAutoApproveThreshold: number;
  subdomain: string | null;
  customDomain: string | null;
  publicUrl: string;
  memberCount?: number;
};

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const getHeaders = useAuthHeaders();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [branding, setBranding] = useState<TenantBranding>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await authFetch(`/api/platform/tenants/${id}`, {}, getHeaders);
    if (!res.ok) {
      setError("Tenant not found");
      setLoading(false);
      return;
    }
    const body = await res.json();
    setTenant(body.tenant);
    setBranding(body.branding ?? {});
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, getHeaders]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await authFetch(
        `/api/platform/tenants/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        getHeaders,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setTenant(data.tenant);
      setBranding(data.branding ?? {});
      setMessage("Saved");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-white/50">Loading…</p>;
  if (!tenant) return <p className="text-red-300">{error ?? "Not found"}</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/platform" className="text-xs text-white/50">
          ← Console
        </Link>
        <h1 className="font-display mt-2 text-2xl">{tenant.name}</h1>
        <p className="text-sm text-white/50">
          {tenant.slug} · {tenant.publicUrl}
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm uppercase tracking-wide text-white/40">General</h2>
        <label className="block space-y-1 text-sm">
          <span className="text-white/60">Display name</span>
          <input
            value={tenant.name}
            onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-white/60">Cal.com URL</span>
          <input
            value={tenant.calComUrl ?? ""}
            onChange={(e) => setTenant({ ...tenant, calComUrl: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-white/60">AI auto-approve threshold</span>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={tenant.aiAutoApproveThreshold}
            onChange={(e) =>
              setTenant({
                ...tenant,
                aiAutoApproveThreshold: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            patch({
              name: tenant.name,
              calComUrl: tenant.calComUrl,
              aiAutoApproveThreshold: tenant.aiAutoApproveThreshold,
            })
          }
          className="rounded-lg bg-white/10 px-4 py-2 text-sm"
        >
          Save general
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm uppercase tracking-wide text-white/40">Branding override</h2>
        <p className="text-xs text-white/40">
          Empty fields fall back to platform defaults. Preview shows merged result.
        </p>
        <div
          className="rounded-lg p-4"
          style={{
            background: branding.primary ?? "#1D6468",
            color: "#fff",
          }}
        >
          <p className="font-display text-lg">{branding.name ?? "Coach Platform"}</p>
          <p className="text-sm opacity-80">{branding.tagline ?? ""}</p>
        </div>
        {(
          [
            ["name", "Brand name"],
            ["tagline", "Tagline"],
            ["primary", "Primary"],
            ["accentWorkout", "Workout accent"],
            ["accentDiet", "Diet accent"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block space-y-1 text-sm">
            <span className="text-white/60">{label}</span>
            <input
              value={(branding[key] as string | undefined) ?? ""}
              onChange={(e) => setBranding({ ...branding, [key]: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
            />
          </label>
        ))}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => patch({ branding })}
            className="rounded-lg bg-[var(--brand-workout)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]"
          >
            Save branding
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => patch({ resetBranding: true })}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm"
          >
            Reset to platform default
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <h2 className="text-sm uppercase tracking-wide text-amber-200">Status</h2>
        <p className="text-sm text-white/70">
          Current: <strong>{tenant.status}</strong>
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            patch({
              status: tenant.status === "active" ? "suspended" : "active",
            })
          }
          className="rounded-lg bg-amber-500/30 px-4 py-2 text-sm text-amber-100"
        >
          {tenant.status === "active" ? "Suspend tenant" : "Reactivate tenant"}
        </button>
      </section>

      {message && <p className="text-sm text-emerald-300">{message}</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
