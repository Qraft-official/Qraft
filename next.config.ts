import type { NextConfig } from "next";

/**
 * Allow AdSense site preview iframes.
 * Do not send X-Frame-Options: DENY/SAMEORIGIN — it cannot allow google.com frames.
 */
const ADSENSE_FRAME_ANCESTORS_CSP =
  "frame-ancestors 'self' https://google.com https://www.google.com https://*.google.com https://adsense.google.com https://*.google.co.jp https://googleads.g.doubleclick.net https://*.doubleclick.net https://*.googlesyndication.com https://tpc.googlesyndication.com https://*.googleadservices.com https://partner.googleadservices.com";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: ADSENSE_FRAME_ANCESTORS_CSP,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
