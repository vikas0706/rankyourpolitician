/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We keep our own type checking in `npm run typecheck`; do not let a stray
  // lint config block deploys. Types are still enforced at build time.
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Politician photos come from Wikimedia Commons only (freely licensed).
    remotePatterns: [
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'commons.wikimedia.org' },
    ],
  },
  // The local-only data manager must never be bundled into the deployed site.
  outputFileTracingExcludes: {
    '*': ['./tools/**/*', './data/staging/**/*'],
  },
};

export default nextConfig;
