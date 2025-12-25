/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT === 'export' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  // This forces a full rebuild when you have runtime errors
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.cache = false; // disables webpack cache in dev
    }

    // Polyfill or ignore modules for client-side react-pdf
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    return config;
  },
  serverExternalPackages: ['puppeteer'],
  transpilePackages: ['@react-pdf/renderer'],
};

export default nextConfig;
