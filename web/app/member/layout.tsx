import { MemberShell } from "@/components/layout/member-shell";
import { RequireAuth } from "@/components/auth/require-auth";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth roles={["member"]}>
      <MemberShell>{children}</MemberShell>
    </RequireAuth>
  );
}
