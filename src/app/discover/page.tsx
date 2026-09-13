import { DiscoverGate } from "@/components/DiscoverGate";
import { CANONICAL_ORIGIN } from "@/lib/constants";
import { fetchPublicProblemPreviews } from "@/lib/public-catalog";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover | Qraft",
  description: "Qraftで公開中の問題を探す。未ログインでも問題文、教科、難易度、モードを閲覧できます。",
  alternates: { canonical: `${CANONICAL_ORIGIN}/discover` },
  robots: { index: true, follow: true },
};

export default async function DiscoverPage() {
  const problems = await fetchPublicProblemPreviews(20);
  return <DiscoverGate problems={problems} />;
}
