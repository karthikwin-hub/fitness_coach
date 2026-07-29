import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { buildCatalogWorkbook } from "@/lib/export/catalog-workbook";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = await buildCatalogWorkbook(user.tenantId);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="catalog-export.xlsx"',
    },
  });
}
