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
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // replace this with your actual origin
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-user-id, Authorization" },
        ]
      }
    ]
  }
};

export default nextConfig;
