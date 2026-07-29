import Link from "next/link";
import type { ReactNode } from "react";

type MaxWidth = "2xl" | "3xl" | "4xl" | "6xl" | "lg" | "full";

const maxWidthClass: Record<MaxWidth, string> = {
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  full: "max-w-full",
};

export type CoachPageShellProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  maxWidth?: MaxWidth;
  message?: ReactNode;
  backLink?: { href: string; label: string };
  headerSlot?: ReactNode;
  children: ReactNode;
};

export function CoachPageShell({
  eyebrow,
  title,
  description,
  maxWidth = "4xl",
  message,
  backLink,
  headerSlot,
  children,
}: CoachPageShellProps) {
  return (
    <div className="px-4 py-6 lg:px-8">
      <div className={`mx-auto ${maxWidthClass[maxWidth]}`}>
        {backLink && (
          <Link
            href={backLink.href}
            className="text-sm text-white/50 hover:text-white/80"
          >
            {backLink.label}
          </Link>
        )}
        {headerSlot}
        <p className={`text-xs text-[var(--brand-workout)] ${backLink || headerSlot ? "mt-4" : ""}`}>
          {eyebrow}
        </p>
        <h1 className="font-heading text-xl">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-white/60">{description}</p>
        )}
        {message && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
            {message}
          </div>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
