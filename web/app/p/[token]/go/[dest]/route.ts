import { NextRequest, NextResponse } from "next/server";
import { resolveDeliveryToken } from "@/lib/plans/delivery-tokens";

type Params = { params: Promise<{ token: string; dest: string }> };

const DEST_MAP: Record<string, string> = {
  workouts: "/member/workouts",
  nutrition: "/member/nutrition",
  member: "/member",
  checkin: "/member/check-in",
};

/**
 * Bounce route: if the visitor has a member session they go straight to the
 * destination; otherwise they land on login with a next= redirect.
 * Token validity is checked so revoked/expired PDFs stop working.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { token, dest } = await params;
  const resolved = await resolveDeliveryToken(token);

  if (!resolved.ok) {
    const status = resolved.reason === "not_found" ? 404 : 403;
    return NextResponse.json(
      { error: resolved.reason.replace("_", " ") },
      { status },
    );
  }

  const path = DEST_MAP[dest] ?? "/member";
  // Auth is Bearer-token based (Firebase), not cookies — so we always send
  // through login with next=. If already signed in, RequireAuth will redirect.
  const login = new URL("/login", request.nextUrl.origin);
  login.searchParams.set("next", path);
  return NextResponse.redirect(login);
}
