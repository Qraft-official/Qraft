import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { AppProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { ADSENSE_CLIENT_ID, isAdsenseCrawler } from "@/lib/adsense";
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
  themeColor: "#0b1220",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const ua = (await headers()).get("user-agent");
  const adsensePreview = isAdsenseCrawler(ua);

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${noto.variable} h-full dark`}
      style={{ minHeight: "100vh", backgroundColor: "#0b1220", color: "#e7e9ea" }}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="google-adsense"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3606701928621609"
          strategy="beforeInteractive"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className="min-h-[100vh] min-h-dvh bg-[#0b1220] text-[#e7e9ea] antialiased"
        style={{ minHeight: "100vh", backgroundColor: "#0b1220", color: "#e7e9ea" }}
        suppressHydrationWarning
      >
        <noscript>
          <div
            style={{
              minHeight: "100vh",
              padding: "24px",
              backgroundColor: "#0b1220",
              color: "#e7e9ea",
            }}
          >
            <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "#ffffff" }}>Qraft</p>
            <p style={{ marginTop: "8px", fontSize: "0.875rem", color: "#ccff00" }}>クラフト</p>
            <p style={{ marginTop: "8px", fontSize: "0.875rem", color: "#e7e9ea" }}>
              STEM creators のためのドパミン SNS
            </p>
          </div>
        </noscript>
        <div id="qraft-root" style={{ minHeight: "100vh", backgroundColor: "#0b1220", color: "#e7e9ea" }}>
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
