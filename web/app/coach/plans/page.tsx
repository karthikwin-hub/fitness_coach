import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPlansList } from "./coach-plans-list";

export default function CoachPlansPage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
        <header className="border-b border-white/10 px-4 py-4">
          <Link href="/coach" className="text-xs text-white/50">
            ← Command center
          </Link>
          <h1 className="font-heading text-xl">Plan delivery</h1>
          <p className="text-sm text-white/60">Select a client to build or publish plans</p>
        </header>
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/coach/members"
              className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70"
            >
              Members
            </Link>
            <Link
              href="/coach/content-blocks"
              className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70"
            >
              Content blocks
            </Link>
            <Link
              href="/coach/exercises"
              className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70"
            >
              Exercise catalog
            </Link>
            <Link
              href="/coach/pilot"
              className="rounded-lg border border-[var(--brand-diet)]/40 px-3 py-2 text-xs text-[var(--brand-diet)]"
            >
              Pilot metrics
            </Link>
          </div>
          <CoachPlansList />
        </div>
      </div>
    </RequireAuth>
  );
}
