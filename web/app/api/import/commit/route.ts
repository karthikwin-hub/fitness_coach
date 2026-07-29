import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { commitCatalogWorkbook } from "@/lib/import/commit-catalog";
import { commitMemberWorkbook } from "@/lib/import/commit-members";
import { parseWorkbookBuffer } from "@/lib/import/parse-workbook";
import type { ImportWorkbookKind } from "@/lib/import/types";
import { validateCatalogWorkbook } from "@/lib/import/validate-catalog";
import { validateMemberWorkbook } from "@/lib/import/validate-members";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const kind = formData.get("kind") as ImportWorkbookKind | null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (kind !== "members" && kind !== "catalog") {
    return NextResponse.json({ error: "kind must be members or catalog" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseWorkbookBuffer(buffer, kind);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse workbook";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const validation =
    parsed.kind === "members"
      ? await validateMemberWorkbook(user.tenantId, parsed)
      : await validateCatalogWorkbook(user.tenantId, parsed);

  if (!validation.valid) {
    return NextResponse.json(
      { error: "Validation failed", ...validation },
      { status: 422 },
    );
  }

  try {
    const result =
      parsed.kind === "members"
        ? await commitMemberWorkbook(user.tenantId, user.id, parsed)
        : await commitCatalogWorkbook(user.tenantId, parsed);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
