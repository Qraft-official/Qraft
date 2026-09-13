import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { AppDialogHost } from "@/components/AppDialogHost";
import { AppProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { ADSENSE_CLIENT_ID } from "@/lib/adsense";
import { CANONICAL_ORIGIN } from "@/lib/constants";
import "./globals.css";
import React from "react";

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
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: {
    default: "Qraft（クラフト）| ひらめきを競う問題SNS",
    template: "%s | Qraft",
  },
  description:
    "Qraftは面白い問題を見つけ、自分で解き、みんなの結果や解法を楽しむ問題SNSです。数学・物理・化学のオリジナル問題に挑戦できます。",
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.png", sizes: "1024x1024", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Qraft",
    statusBarStyle: "black-translucent",
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${noto.variable} dark`}
      style={{ minHeight: "100vh", backgroundColor: "#0b1220", color: "#e7e9ea" }}
      suppressHydrationWarning
    >
      <body
        className="bg-[#0b1220] text-[#e7e9ea] antialiased"
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
              ひらめきを競う問題SNS。面白い問題を見つけ、自分で解き、みんなの結果や解法を楽しめます。
            </p>
          </div>
        </noscript>
        <div id="qraft-root">
          <AppErrorBoundary>
            <AppProvider>
              <AppShell>{children}</AppShell>
              <AppDialogHost />
            </AppProvider>
          </AppErrorBoundary>
        </div>
      </body>
    </html>
  );
}
