import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { BrandStyles } from "@/components/brand/brand-styles";
import { ABSTRACK_BRAND, brandingToCssVars } from "@/lib/brand";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: `${ABSTRACK_BRAND.name} by Helna`,
  description: ABSTRACK_BRAND.tagline,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: ABSTRACK_BRAND.name,
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
        style={brandingToCssVars()}
      >
        <AuthProvider>
          <BrandStyles />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
