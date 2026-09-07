import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppProviders from "@/components/AppProviders";
import AppChrome from "@/components/navigation/AppChrome";

export const metadata: Metadata = {
  title: {
    default: "ドパニュース | Dopa News",
    template: "%s | ドパニュース",
  },
  description:
    "今なにが起きていて、なぜ話題なのか。3ステップでサクッと分かる次世代ニュースアプリ。街のリアルタイム情報が集まるドパマップも。",
  applicationName: "ドパニュース",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ドパニュース",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "ドパニュース | Dopa News",
    description: "何が起きた? なんで話題? このあとどうなる? を30秒で。",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#080c14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <AppProviders>
          <AppChrome>{children}</AppChrome>
        </AppProviders>
      </body>
    </html>
  );
}
