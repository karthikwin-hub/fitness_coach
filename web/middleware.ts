import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { subdomainFromHost } from "@/lib/tenant/resolver";

const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 16_384;
const PUBLIC_TOKEN_RATE_LIMIT = 30;

type RateEntry = { count: number; resetAt: number };

const rateLimitMap = new Map<string, RateEntry>();
const tokenRateLimitMap = new Map<string, RateEntry>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(
  map: Map<string, RateEntry>,
  key: string,
  limit: number,
): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count += 1;
  return false;
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const sub = subdomainFromHost(request.headers.get("host"));
  if (sub) {
    requestHeaders.set("x-tenant-slug", sub);
  }

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/p/")) {
    const ip = getClientIp(request);
    if (isRateLimited(tokenRateLimitMap, `p:${ip}`, PUBLIC_TOKEN_RATE_LIMIT)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  if (
    request.method === "POST" &&
    (pathname === "/api/leads" || pathname === "/api/vault-waitlist")
  ) {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(rateLimitMap, ip, RATE_LIMIT)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
