import { NextRequest, NextResponse } from "next/server";
import {
  completeGoogleConnection,
  syncExistingCalendarToGoogle,
  verifyGoogleState,
} from "@/lib/appointments/google-calendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const origin = request.nextUrl.origin;
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/coach/settings?calendar=error`);
  }
  const verified = verifyGoogleState(state);
  if (!verified) {
    return NextResponse.redirect(`${origin}/coach/settings?calendar=invalid-state`);
  }
  try {
    await completeGoogleConnection(
      code,
      verified.userId,
      verified.tenantId,
    );
    await syncExistingCalendarToGoogle(verified.userId, verified.tenantId);
    return NextResponse.redirect(`${origin}/coach/settings?calendar=connected`);
  } catch (error) {
    console.error("[calendar] Google connection failed", error);
    return NextResponse.redirect(`${origin}/coach/settings?calendar=error`);
  }
}
