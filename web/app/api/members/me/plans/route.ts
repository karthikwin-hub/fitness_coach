import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import {
  getMemberByUserId,
  getPublishedNutritionPlan,
  getPublishedTrainingPlan,
} from "@/lib/plans/queries";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getMemberByUserId(user.id);
  if (!member) {
    return NextResponse.json({ error: "Member profile not found" }, { status: 404 });
  }

  const [training, nutrition] = await Promise.all([
    getPublishedTrainingPlan(member.id),
    getPublishedNutritionPlan(member.id),
  ]);

  return NextResponse.json({ member, training, nutrition });
}
