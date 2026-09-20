import { HomeGate } from "@/components/HomeGate";
import { PublicLanding } from "@/components/PublicLanding";
import { CANONICAL_ORIGIN, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/constants";
import { fetchPublicProblemPreviews, PUBLIC_HOME_LIMIT } from "@/lib/public-catalog";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: CANONICAL_ORIGIN },
  robots: { index: true, follow: true },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "Qraft",
    type: "website",
    locale: "ja_JP",
    url: CANONICAL_ORIGIN,
  },
};

export default async function HomePage() {
  const problems = await fetchPublicProblemPreviews(PUBLIC_HOME_LIMIT);
  return (
    <HomeGate>
      <PublicLanding problems={problems} />
    </HomeGate>
  );
}
