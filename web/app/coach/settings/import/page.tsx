import { RequireAuth } from "@/components/auth/require-auth";
import { CoachImportView } from "@/components/coach/coach-import-view";

export default function CoachSettingsImportPage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachImportView />
    </RequireAuth>
  );
}
