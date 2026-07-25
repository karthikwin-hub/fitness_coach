import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    tenantSlug: user.tenantSlug,
    userId: user.id,
  });
}
