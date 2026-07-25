import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachCommandCenter } from "./coach-command-center";

export default function CoachPage() {
  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-[var(--brand-dark)] text-white/50">
            Loading command center…
          </div>
        }
      >
        <CoachCommandCenter />
      </Suspense>
    </RequireAuth>
  );
}
