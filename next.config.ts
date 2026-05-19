import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uyqysnlqsxdyhujgzrvz.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Allow the /embed page to be loaded inside iframes from any origin.
        source: '/embed',
        headers: [
          { key: 'X-Frame-Options',          value: 'ALLOWALL' },
          { key: 'Content-Security-Policy',   value: "frame-ancestors *" },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
};

export default nextConfig;
