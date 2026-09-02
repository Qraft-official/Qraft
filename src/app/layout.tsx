import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { AppProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { ADSENSE_CLIENT_ID, adsenseScriptSrc, isAdsenseCrawler } from "@/lib/adsense";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const noto = Noto_Sans_JP({
  variable: "--font-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Qraft",
  description: "STEM creators のためのドパミン SNS",
  ...(ADSENSE_CLIENT_ID
    ? { other: { "google-adsense-account": ADSENSE_CLIENT_ID } }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const ua = (await headers()).get("user-agent");
  const adsensePreview = isAdsenseCrawler(ua);

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${noto.variable} h-full dark`}
      suppressHydrationWarning
    >
      <body
        className="min-h-[100vh] min-h-dvh bg-[#0b1220] text-[#e7e9ea] antialiased"
        style={{ minHeight: "100vh", backgroundColor: "#0b1220" }}
        suppressHydrationWarning
      >
        {ADSENSE_CLIENT_ID ? (
          <Script
            id="google-adsense"
            async
            src={adsenseScriptSrc(ADSENSE_CLIENT_ID)}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        ) : null}
        <noscript>
          <div
            id="qraft-noscript"
            style={{
              minHeight: "100vh",
              padding: "24px",
              backgroundColor: "#0b1220",
              color: "#e7e9ea",
            }}
          >
            <p style={{ fontSize: "1.5rem", fontWeight: 900 }}>Qraft</p>
            <p style={{ marginTop: "8px", fontSize: "0.875rem" }}>
              STEM creators のためのドパミン SNS
            </p>
          </div>
        </noscript>
        <div id="qraft-root" style={{ minHeight: "100vh", backgroundColor: "#0b1220" }}>
          <AppErrorBoundary>
            <AppProvider>
              <AppShell adsensePreview={adsensePreview}>{children}</AppShell>
            </AppProvider>
          </AppErrorBoundary>
        </div>
      </body>
    </html>
  );
}
