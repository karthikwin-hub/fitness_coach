/**
 * Resolve the public base URL for delivery links (PDF, WhatsApp, email).
 */
export function getAppBaseUrl(requestOrigin?: string | null): string {
  const fromEnv =
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_BASE_URL ??
    process.env.GUIDE_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (requestOrigin) return requestOrigin.replace(/\/$/, "");
  return "http://localhost:3010";
}

export function deliveryUrls(baseUrl: string, token: string) {
  const base = baseUrl.replace(/\/$/, "");
  return {
    baseUrl: base,
    viewerUrl: `${base}/p/${token}`,
    pdfUrl: `${base}/p/${token}/plan.pdf`,
  };
}
