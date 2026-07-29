import { NextRequest, NextResponse } from "next/server";
import { purgeAllTenantsRetention } from "@/lib/maintenance/retention-purge";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await purgeAllTenantsRetention();
  return NextResponse.json({ ok: true, tenants: Object.keys(results).length, results });
}
