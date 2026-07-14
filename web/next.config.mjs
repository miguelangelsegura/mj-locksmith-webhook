import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app lives in a subfolder of a larger repo; pin the tracing root here
  // so Next doesn't pick up the repo-root lockfile (sales-deck tooling).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
