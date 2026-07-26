import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/coach/user-guide": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/plan-deliveries/**": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/members/me/plan-pdf": ["./node_modules/pdfkit/js/data/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
