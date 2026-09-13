import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false, // don't advertise "X-Powered-By: Next.js" on every response
  experimental: {
    serverActions: {
      // Default 1MB cannot carry photos (≤5MB each, ≤6 per submission).
      // Auth-gated actions only; leave headroom for multipart boundary bytes.
      bodySizeLimit: "35mb",
    },
  },
};

export default nextConfig;
