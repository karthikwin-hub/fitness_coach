import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPageShell } from "@/components/coach/coach-page-shell";
import { CoachMembersView } from "./coach-members-view";

export default function CoachMembersPage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachPageShell eyebrow="Members" title="Members" maxWidth="2xl">
        <CoachMembersView />
      </CoachPageShell>
    </RequireAuth>
  );
}
