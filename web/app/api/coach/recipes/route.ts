import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { getCoachRecipes } from "@/lib/coach/check-in-enrichment";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recipes = await getCoachRecipes(user!.tenantId);
  return NextResponse.json(recipes);
}
