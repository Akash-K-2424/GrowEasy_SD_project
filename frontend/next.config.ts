import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the tracing root to this app so `standalone/server.js` lands in the
  // same place locally and in Docker, regardless of the repo-root lockfile.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
