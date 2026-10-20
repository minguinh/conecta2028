import type { NextConfig } from 'next';
const config: NextConfig = { output: 'standalone', distDir: process.env.NEXT_DIST_DIR||'.next', images: { unoptimized: true }, poweredByHeader: false };
export default config;
