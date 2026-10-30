import type { NextConfig } from "next";
import { readFileSync, readdirSync } from "node:fs";
const activeRelease = JSON.parse(readFileSync("data/active.json", "utf8"))
  .version as string;
if (!/^[a-zA-Z0-9-]+$/.test(activeRelease))
  throw Error("Invalid active release");
const historicalReleases = readdirSync("data/releases").filter(
  (v) => v !== activeRelease && /^[a-zA-Z0-9-]+$/.test(v),
);
const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/*": ["./data/active.json", `./data/releases/${activeRelease}/**/*`],
  },
  outputFileTracingExcludes: {
    "/*": historicalReleases.map((v) => `./data/releases/${v}/**/*`),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/data/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};
export default config;
