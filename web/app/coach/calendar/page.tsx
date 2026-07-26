import { RequireAuth } from "@/components/auth/require-auth";
import { CoachCalendarView } from "./coach-calendar-view";

export default function CoachCalendarPage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
        <header className="border-b border-white/10 px-4 py-4 lg:px-8">
          <h1 className="font-heading text-xl">Calendar</h1>
          <p className="text-sm text-white/60">
            Your week of client appointments. Block non-working hours; the rest
            stays open for bookings.
          </p>
        </header>
        <div className="mx-auto max-w-6xl px-3 py-5 lg:px-6">
          <CoachCalendarView />
        </div>
      </div>
    </RequireAuth>
  );
}
