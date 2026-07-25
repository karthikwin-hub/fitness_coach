import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { lookupBarcode } from "@/lib/nutrition/food-provider";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upc = request.nextUrl.searchParams.get("upc") ?? "";
  if (!upc.trim()) {
    return NextResponse.json({ error: "upc required" }, { status: 400 });
  }

  try {
    const result = await lookupBarcode(upc);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Barcode lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
