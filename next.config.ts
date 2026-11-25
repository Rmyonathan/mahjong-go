import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // EDIT HERE — allowlisted tunnel hosts for mobile HMR in local/dev only.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.ngrok.app"],
  images: {
    localPatterns: [
      // Tile faces use ?v= cache-bust — omit `search` to allow any query
      { pathname: "/tiles/**" },
      { pathname: "/icons/**", search: "" },
      // Other public assets (jade.png, etc.) — no query string
      { pathname: "/**", search: "" },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600",
          },
        ],
      },
      {
        source: "/tiles/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
}

export default nextConfig
