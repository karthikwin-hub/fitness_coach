import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { buildMembersWorkbook } from "@/lib/export/members-workbook";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const includePlans = request.nextUrl.searchParams.get("includePlans") !== "false";
  const buffer = await buildMembersWorkbook(user.tenantId, includePlans);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="members-export.xlsx"',
    },
  });
}
