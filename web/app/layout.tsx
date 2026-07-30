import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { BrandStyles } from "@/components/brand/brand-styles";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { ABSTRACK_BRAND, PLATFORM_DEFAULT_BRANDING, brandingToCssVars } from "@/lib/brand";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: PLATFORM_DEFAULT_BRANDING.name,
  description: PLATFORM_DEFAULT_BRANDING.tagline,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: PLATFORM_DEFAULT_BRANDING.name,
  },
};

export const viewport: Viewport = {
  themeColor: ABSTRACK_BRAND.colors.dark,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full`}>
      <body
        className="min-h-full antialiased"
        style={brandingToCssVars(PLATFORM_DEFAULT_BRANDING)}
      >
        <AuthProvider>
          <RegisterServiceWorker />
          <BrandStyles />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
