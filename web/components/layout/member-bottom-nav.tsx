"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Dumbbell, Salad, MessageCircle } from "lucide-react";

const tabs = [
  { href: "/member", label: "Dashboard", icon: LayoutDashboard },
  { href: "/member/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/member/nutrition", label: "Nutrition", icon: Salad },
  { href: "/member/messages", label: "Messages", icon: MessageCircle },
];

export function MemberBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[var(--brand-dark)] pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/member" && pathname.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  active
                    ? "text-[var(--brand-diet)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
