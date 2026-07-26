import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_LOGIN_TOKEN,
  isDemoCoachEmail,
  isServerDemoLoginEnabled,
} from "@/lib/auth/demo-login-shared";
import { resolveDemoCoachUser } from "@/lib/auth/demo-login-server";

export async function POST(request: NextRequest) {
  if (!isServerDemoLoginEnabled()) {
    return NextResponse.json({ error: "Demo login is disabled" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  if (!email || !isDemoCoachEmail(email)) {
    return NextResponse.json({ error: "Invalid demo coach email" }, { status: 401 });
  }

  const user = await resolveDemoCoachUser();
  if (!user) {
    return NextResponse.json({ error: "Demo coach account not found" }, { status: 404 });
  }

  return NextResponse.json({
    token: DEMO_LOGIN_TOKEN,
    user: {
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tenantSlug: user.tenantSlug,
    },
  });
}
