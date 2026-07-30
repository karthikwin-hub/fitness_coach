"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MemberBottomNav } from "./member-bottom-nav";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";

export function MemberShell({ children }: { children: React.ReactNode }) {
  const { appUser, firebaseConfigured } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--brand-dark)] text-white">
      {appUser && (
        <div className="border-b border-white/10 px-4 py-3">
          <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--brand-diet)]">Abs-Track member</p>
              <p className="font-medium">{appUser.displayName ?? appUser.email}</p>
              {appUser.displayName && (
                <p className="text-xs text-white/40">{appUser.email}</p>
              )}
            </div>
            {firebaseConfigured ? (
              <SignOutButton className="shrink-0 pt-1 text-xs text-white/50 underline-offset-2 hover:text-white/80 hover:underline" />
            ) : (
              <a href="/login?switch=1" className="shrink-0 pt-1 text-xs text-white/50 hover:text-white/80">
                Switch persona
              </a>
            )}
          </div>
        </div>
      )}
      <PwaInstallBanner />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">
        {children}
      </main>
      <MemberBottomNav />
    </div>
  );
}
