import { HomeGate } from "@/components/HomeGate";
import { PublicLanding } from "@/components/PublicLanding";
import { CANONICAL_ORIGIN } from "@/lib/constants";
import { fetchPublicProblemPreviews, PUBLIC_HOME_LIMIT } from "@/lib/public-catalog";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Qraft（クラフト）| ひらめきを競う問題SNS",
  description:
    "Qraftは面白い問題を見つけ、自分で解き、みんなの結果や解法を楽しむ問題SNSです。数学・物理・化学のオリジナル問題、Challenger、Aha!、毎日21時のPULSEがあります。",
  alternates: { canonical: CANONICAL_ORIGIN },
  robots: { index: true, follow: true },
};

export default async function HomePage() {
  const problems = await fetchPublicProblemPreviews(PUBLIC_HOME_LIMIT);
  return (
    <HomeGate>
      <PublicLanding problems={problems} />
    </HomeGate>
  );
}
