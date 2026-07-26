import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { buildGoogleAuthUrl } from "@/lib/appointments/google-calendar";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    return NextResponse.json({ url: buildGoogleAuthUrl(user) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Google Calendar unavailable" },
      { status: 503 },
    );
  }
}
