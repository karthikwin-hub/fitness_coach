import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { renderCoachHowtoGuidePdf } from "@/lib/pdf/coach-howto-guide";

/** Coach-only download of the plain-language how-to guide. */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buffer = await renderCoachHowtoGuidePdf();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="abstrack-how-to-guide.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[user-guide] PDF render failed", err);
    return NextResponse.json({ error: "Could not generate guide" }, { status: 500 });
  }
}
