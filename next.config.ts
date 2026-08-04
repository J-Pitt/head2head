import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow large media payloads (50MB video → ~67MB base64 data URL in JSON).
    serverActions: {
      bodySizeLimit: "70mb",
    },
    // Default is 10MB when a proxy is present; raise for video answer sync.
    proxyClientMaxBodySize: "70mb",
  },
};

export default nextConfig;
