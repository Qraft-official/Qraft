import { CANONICAL_ORIGIN } from "@/lib/constants";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/discover", "/p/", "/terms", "/privacy", "/about", "/contact", "/ads.txt"],
        disallow: [
          "/login",
          "/signup",
          "/settings",
          "/premium",
          "/admin",
          "/notifications",
          "/activity",
          "/profile",
          "/auth/",
          "/welcome-mission",
          "/sprint",
          "/dev/",
          "/series",
          "/u/",
          "/api/",
        ],
      },
    ],
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
    host: CANONICAL_ORIGIN,
  };
}
