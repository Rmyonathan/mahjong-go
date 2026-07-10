import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan ngrok / tunnel dev agar HMR & hot reload jalan di ponsel.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.ngrok.app"],
};

export default nextConfig;
