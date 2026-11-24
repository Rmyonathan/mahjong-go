import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan ngrok / tunnel dev agar HMR & hot reload jalan di ponsel.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.ngrok.app"],
  images: {
    localPatterns: [
      // Tile faces use ?v= cache-bust — omit `search` to allow any query
      { pathname: "/tiles/**" },
      // Other public assets (jade.png, etc.) — no query string
      { pathname: "/**", search: "" },
    ],
  },
};

export default nextConfig;
