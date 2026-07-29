import { CoachPlanDeliveryNav } from "@/components/coach/coach-plan-delivery-nav";
import {
  CoachPageShell,
  type CoachPageShellProps,
} from "@/components/coach/coach-page-shell";

type CoachPlanDeliveryShellProps = Omit<CoachPageShellProps, "headerSlot">;

export function CoachPlanDeliveryShell(props: CoachPlanDeliveryShellProps) {
  return (
    <CoachPageShell
      {...props}
      headerSlot={
        <div className={props.backLink ? "mt-4" : undefined}>
          <CoachPlanDeliveryNav />
        </div>
      }
    />
  );
}
