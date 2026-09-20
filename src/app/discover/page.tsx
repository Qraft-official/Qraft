import { DiscoverGate } from "@/components/DiscoverGate";
import { PublicDiscover } from "@/components/PublicDiscover";
import { CANONICAL_ORIGIN } from "@/lib/constants";
import { fetchPublicProblemPreviews, PUBLIC_DISCOVER_LIMIT } from "@/lib/public-catalog";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover",
  description:
    "Qraftの公開問題フィード。未ログインでも数学・物理・化学の問題文、教科、難易度、モードを閲覧できます。",
  alternates: { canonical: `${CANONICAL_ORIGIN}/discover` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Discover | Qraft",
    description:
      "Qraftの公開問題フィード。未ログインでも数学・物理・化学の問題文、教科、難易度、モードを閲覧できます。",
    siteName: "Qraft",
    type: "website",
    locale: "ja_JP",
    url: `${CANONICAL_ORIGIN}/discover`,
  },
};

export default async function DiscoverPage() {
  const problems = await fetchPublicProblemPreviews(PUBLIC_DISCOVER_LIMIT);
  return (
    <DiscoverGate>
      <PublicDiscover problems={problems} />
    </DiscoverGate>
  );
}
