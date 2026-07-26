"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth roles={["platform_admin"]}>
      <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
        <header className="border-b border-white/10 px-4 py-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/40">Platform</p>
              <Link href="/platform" className="font-display text-lg">
                Tenant console
              </Link>
            </div>
            <nav className="flex gap-3 text-sm text-white/70">
              <Link href="/platform/tenants" className="hover:text-white">
                Tenants
              </Link>
              <Link href="/platform/tenants/new" className="hover:text-white">
                New tenant
              </Link>
              <Link href="/login?switch=1" className="hover:text-white">
                Switch user
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </div>
    </RequireAuth>
  );
}
