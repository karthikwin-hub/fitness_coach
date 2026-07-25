"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { isDevAuthEnabled } from "@/lib/auth/dev-auth-enabled";

export function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Array<"coach" | "member" | "platform_admin">;
}) {
  const { appUser, loading, firebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!appUser) {
      router.replace("/login");
      return;
    }
    if (roles && !roles.includes(appUser.role)) {
      router.replace(appUser.role === "coach" ? "/coach" : "/member");
    }
  }, [appUser, loading, roles, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--brand-dark)] text-white/70">
        Loading…
      </div>
    );
  }

  if (!appUser) return null;
  if (roles && !roles.includes(appUser.role)) return null;

  if (!firebaseConfigured && isDevAuthEnabled()) {
    return (
      <>
        <div className="bg-amber-500/20 px-4 py-2 text-center text-xs text-amber-200">
          Dev mode — signed in as {appUser.displayName ?? appUser.email} ({appUser.role})
          {" · "}
          <a href="/login?switch=1" className="underline">
            Switch persona
          </a>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
