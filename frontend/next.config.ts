import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "ngrok-skip-browser-warning", value: "true" }
        ]
      }
    ]
  },

  env: {
    AI_AGENT_URL: process.env.AI_AGENT_URL,
  },

  transpilePackages: ["@apollo/client"],

  images: {
    // Cache images for 1 day
    minimumCacheTTL: 60 * 60 * 24,

    // Limit formats to avoid extra processing on dev
    formats: ["image/webp"],

    // Only the domains you actually use
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "ui-avatars.com", pathname: "/api/**" },
    ],
  },
};

export default nextConfig;