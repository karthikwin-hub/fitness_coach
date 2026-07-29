"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/coach/plans",
    label: "Clients",
    match: (p: string) =>
      p === "/coach/plans" || p.startsWith("/coach/plans/"),
  },
  {
    href: "/coach/content-blocks",
    label: "Content blocks",
    match: (p: string) => p.startsWith("/coach/content-blocks"),
  },
  {
    href: "/coach/exercises",
    label: "Exercise catalog",
    match: (p: string) => p.startsWith("/coach/exercises"),
  },
  {
    href: "/coach/plan-templates",
    label: "Plan templates",
    match: (p: string) => p.startsWith("/coach/plan-templates"),
  },
  {
    href: "/coach/vault",
    label: "Vault programs",
    match: (p: string) => p.startsWith("/coach/vault"),
  },
  {
    href: "/coach/pilot",
    label: "Pilot metrics",
    match: (p: string) => p.startsWith("/coach/pilot"),
  },
];

export function CoachPlanDeliveryNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg border px-3 py-2 text-xs ${
              active
                ? "border-[var(--brand-diet)]/50 text-[var(--brand-diet)]"
                : "border-white/15 text-white/70 hover:bg-white/5"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
