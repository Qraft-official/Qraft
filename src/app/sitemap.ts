import { CANONICAL_ORIGIN } from "@/lib/constants";
import { fetchPublicProblemIdsForSitemap } from "@/lib/public-catalog";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const problems = await fetchPublicProblemIdsForSitemap(80);
  const lastMod = new Date();
  return [
    {
      url: CANONICAL_ORIGIN,
      lastModified: lastMod,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${CANONICAL_ORIGIN}/discover`,
      lastModified: lastMod,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${CANONICAL_ORIGIN}/about`,
      lastModified: lastMod,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${CANONICAL_ORIGIN}/contact`,
      lastModified: lastMod,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${CANONICAL_ORIGIN}/terms`,
      lastModified: lastMod,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${CANONICAL_ORIGIN}/privacy`,
      lastModified: lastMod,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...problems.map((p) => ({
      url: `${CANONICAL_ORIGIN}/p/${p.id}`,
      lastModified: p.createdAt ? new Date(p.createdAt) : lastMod,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
