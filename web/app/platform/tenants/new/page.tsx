"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthHeaders, authFetch } from "@/lib/api/client";

export default function NewTenantPage() {
  const getHeaders = useAuthHeaders();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onNameChange(value: string) {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(
        "/api/platform/tenants",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug,
            coachEmail: coachEmail || undefined,
          }),
        },
        getHeaders,
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create tenant");
        return;
      }
      router.push(`/platform/tenants/${body.tenantId}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/platform" className="text-xs text-white/50">
          ← Console
        </Link>
        <h1 className="font-display mt-2 text-2xl">Create tenant</h1>
        <p className="mt-1 text-sm text-white/50">
          New tenants inherit platform default branding until overridden.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <label className="block space-y-1 text-sm">
          <span className="text-white/60">Name</span>
          <input
            required
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
            placeholder="Demo Gym"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-white/60">Slug / subdomain</span>
          <input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            pattern="[a-z0-9-]+"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
            placeholder="demo-gym"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-white/60">Initial coach email (optional)</span>
          <input
            type="email"
            value={coachEmail}
            onChange={(e) => setCoachEmail(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
            placeholder="coach@demo-gym.com"
          />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-[var(--brand-workout)] py-3 font-semibold text-[var(--brand-dark)] disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create tenant"}
        </button>
      </form>
    </div>
  );
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
