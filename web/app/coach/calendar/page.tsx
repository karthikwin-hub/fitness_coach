import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPageShell } from "@/components/coach/coach-page-shell";
import { CoachCalendarView } from "./coach-calendar-view";

export default function CoachCalendarPage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachPageShell eyebrow="Calendar" title="Calendar">
        <CoachCalendarView />
      </CoachPageShell>
    </RequireAuth>
  );
}
