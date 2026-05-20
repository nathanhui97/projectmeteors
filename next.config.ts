import type { NextConfig } from "next";

// Corporate SSL proxy workaround — only for local dev
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const nextConfig: NextConfig = {};

export default nextConfig;
