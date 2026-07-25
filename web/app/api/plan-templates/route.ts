import { NextResponse } from "next/server";
import { GYM_W1_TEMPLATE, HOME_W21_TEMPLATE } from "@/lib/plans/templates";

export async function GET() {
  return NextResponse.json([
    { key: "training_gym", name: GYM_W1_TEMPLATE.name, stepGoal: GYM_W1_TEMPLATE.stepGoal },
    { key: "training_home", name: HOME_W21_TEMPLATE.name, stepGoal: HOME_W21_TEMPLATE.stepGoal },
  ]);
}
