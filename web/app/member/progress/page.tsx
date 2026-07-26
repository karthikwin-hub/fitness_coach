import { RequireAuth } from "@/components/auth/require-auth";
import { ProgramJourneyView } from "@/components/coach/program-journey-view";

export default function MemberProgressPage() {
  return (
    <RequireAuth roles={["member"]}>
      <div className="min-h-dvh bg-[var(--brand-dark)] pb-24 text-white">
        <ProgramJourneyView mode="member" />
      </div>
    </RequireAuth>
  );
}
