import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPlanDeliveryNav } from "@/components/coach/coach-plan-delivery-nav";
import { CoachPlansList } from "./coach-plans-list";

export default function CoachPlansPage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
        <header className="border-b border-white/10 px-4 py-4">
          <h1 className="font-heading text-xl">Plan delivery</h1>
          <p className="text-sm text-white/60">Select a client to build or publish plans</p>
          <div className="mt-4">
            <CoachPlanDeliveryNav />
          </div>
        </header>
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
          <CoachPlansList />
        </div>
      </div>
    </RequireAuth>
  );
}
