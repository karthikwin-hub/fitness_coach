"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthHeaders, authFetch } from "@/lib/api/client";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  memberCount: number;
  publicUrl: string;
  createdAt: string;
};

export default function PlatformHomePage() {
  const getHeaders = useAuthHeaders();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/platform/tenants", {}, getHeaders)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load tenants");
        return r.json();
      })
      .then((body) => setTenants(body.tenants ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [getHeaders]);

  const active = tenants.filter((t) => t.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Projects console</h1>
          <p className="mt-1 text-sm text-white/50">
            Manage white-label tenants. Helna (abstrack) is tenant #1.
          </p>
        </div>
        <Link
          href="/platform/tenants/new"
          className="rounded-xl bg-[var(--brand-workout)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]"
        >
          Create tenant
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Tenants" value={String(tenants.length)} />
        <Stat label="Active" value={String(active)} />
        <Stat
          label="Members (all)"
          value={String(tenants.reduce((n, t) => n + t.memberCount, 0))}
        />
      </div>

      {loading && <p className="text-white/50">Loading…</p>}
      {error && <p className="text-red-300">{error}</p>}

      {!loading && !error && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-wide text-white/40">Tenants</h2>
          <ul className="space-y-2">
            {tenants.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/platform/tenants/${t.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:border-white/25"
                >
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-white/50">
                      {t.slug} · {t.memberCount} members · {t.publicUrl}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs uppercase ${
                      t.status === "active"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-amber-500/20 text-amber-200"
                    }`}
                  >
                    {t.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
