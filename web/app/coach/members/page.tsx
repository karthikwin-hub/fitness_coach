import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachMembersView } from "./coach-members-view";

export default function CoachMembersPage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
        <header className="border-b border-white/10 px-4 py-4">
          <Link href="/coach" className="text-xs text-white/50">
            ← Command center
          </Link>
          <h1 className="font-heading text-xl">Members</h1>
          <p className="text-sm text-white/60">
            Active clients, paused accounts, and new quiz enquiries
          </p>
        </header>
        <CoachMembersView />
      </div>
    </RequireAuth>
  );
}
