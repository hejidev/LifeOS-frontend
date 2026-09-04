import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://lifeos-backend-cnfx.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;