const path = require('path');
const os = require('os');

// On LongsMac, use custom build directory outside Google Drive
const isLongsMac = os.hostname() === 'LongsMac';
const distDir = isLongsMac 
  ? path.resolve(os.homedir(), 'local_code/scholarMap/.next')
  : '.next';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable trailing slash for better SEO consistency
  trailingSlash: false,

  // Optimize images
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression
  compress: true,

  // Enable SWC minification
  swcMinify: true,

  // Headers for better SEO and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
};

module.exports = nextConfig;
