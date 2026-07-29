import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import {
  buildTemplateWorkbook,
  type TemplateName,
} from "@/lib/export/catalog-workbook";

const TEMPLATE_FILES: Record<TemplateName, string> = {
  "member-migration": "member-migration.xlsx",
  "catalog-migration": "catalog-migration.xlsx",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const user = await getAuthUser(_request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = await context.params;
  if (name !== "member-migration" && name !== "catalog-migration") {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  const buffer = await buildTemplateWorkbook(name);
  const filename = TEMPLATE_FILES[name];

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
