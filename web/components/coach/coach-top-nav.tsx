"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { useAuth } from "@/components/auth/auth-provider";
import { isDevAuthEnabled } from "@/lib/auth/dev-auth-enabled";

const links = [
  { href: "/coach", label: "Command center", match: (p: string) => p === "/coach" },
  {
    href: "/coach/members",
    label: "Members",
    match: (p: string) => p.startsWith("/coach/members"),
  },
  {
    href: "/coach/calendar",
    label: "Calendar",
    match: (p: string) => p.startsWith("/coach/calendar"),
  },
  {
    href: "/coach/plans",
    label: "Plan delivery",
    match: (p: string) =>
      p.startsWith("/coach/plans") ||
      p.startsWith("/coach/content-blocks") ||
      p.startsWith("/coach/exercises") ||
      p.startsWith("/coach/pilot"),
  },
  {
    href: "/coach/settings",
    label: "Settings",
    match: (p: string) => p.startsWith("/coach/settings"),
  },
];

export function CoachTopNav() {
  const pathname = usePathname();
  const { firebaseConfigured } = useAuth();
  const showSwitch = !firebaseConfigured && isDevAuthEnabled();

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-[var(--brand-dark)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <Link
          href="/coach"
          className="text-sm font-semibold text-white/90 hover:text-white"
        >
          Abs-Track coach
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
          {links.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "text-[var(--brand-diet)]"
                    : "text-white/70 hover:text-white"
                }
              >
                {link.label}
              </Link>
            );
          })}
          <SignOutButton className="text-white/50 hover:text-white/80" />
          {showSwitch && (
            <Link href="/login?switch=1" className="text-white/50 hover:text-white/80">
              Switch persona
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
