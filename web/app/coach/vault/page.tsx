import { RequireAuth } from "@/components/auth/require-auth";
import { CoachVaultProgramsView } from "./coach-vault-programs-view";

export default function CoachVaultPage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachVaultProgramsView />
    </RequireAuth>
  );
}
