import { NextRequest, NextResponse } from "next/server";
import {
  demoTokenForEmail,
  isDemoCoachEmail,
  isServerDemoLoginEnabled,
  mintDemoMemberToken,
  normalizeDemoEmail,
} from "@/lib/auth/demo-login-shared";
import { resolveDemoUserByEmail } from "@/lib/auth/demo-login-server";

export async function POST(request: NextRequest) {
  if (!isServerDemoLoginEnabled()) {
    return NextResponse.json({ error: "Demo login is disabled" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  if (!email.trim()) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const normalized = normalizeDemoEmail(email);
  if (!isDemoCoachEmail(normalized)) {
    // Member path — any member email in the tenant
    const user = await resolveDemoUserByEmail(normalized);
    if (!user || user.role !== "member") {
      return NextResponse.json({ error: "Member account not found" }, { status: 404 });
    }
    const token = mintDemoMemberToken(user.firebaseUid);
    return NextResponse.json({
      token,
      user: {
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        tenantSlug: user.tenantSlug,
      },
    });
  }

  const user = await resolveDemoUserByEmail(normalized);
  if (!user) {
    return NextResponse.json({ error: "Demo account not found" }, { status: 404 });
  }

  const token = demoTokenForEmail(normalized, user.firebaseUid);
  if (!token) {
    return NextResponse.json({ error: "Demo account not found" }, { status: 404 });
  }

  return NextResponse.json({
    token,
    user: {
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tenantSlug: user.tenantSlug,
    },
  });
}
