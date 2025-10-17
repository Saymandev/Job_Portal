/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Skip ESLint during production builds on Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to succeed even if TS is missing or has type errors
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // Ensure TS path alias @/* resolves during Vercel build
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  images: {
    domains: ['localhost', 'res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;

