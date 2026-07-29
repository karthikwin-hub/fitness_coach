import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPlanDeliveryShell } from "@/components/coach/coach-plan-delivery-shell";
import { CoachPlansList } from "./coach-plans-list";

export default function CoachPlansPage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachPlanDeliveryShell
        eyebrow="Clients"
        title="Plan delivery"
        description="Select a client to build or publish plans"
        maxWidth="2xl"
      >
        <CoachPlansList />
      </CoachPlanDeliveryShell>
    </RequireAuth>
  );
}
