const path = require('path');
const { withSentryConfig } = require('@sentry/nextjs/config');
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // SEO pages are prerendered from the backend API; keep build-time load on the
  // small backend instance low and retry transient failures.
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 2,
    staticGenerationRetryCount: 3,
  },

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

  // SWC minification is enabled by default in Next.js 15+
  // swcMinify: true, // Removed - deprecated in Next.js 15

  // Old Render domain → permanent redirect to the new site (keeps SEO equity)
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'scholarmap-frontend.onrender.com' }],
        destination: 'https://labscout.io/:path*',
        permanent: true,
      },
    ];
  },

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

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source maps upload only when the token is set (Vercel); local builds skip it
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Route browser events through our domain so ad blockers don't drop them
  tunnelRoute: '/monitoring',
  // Keep tracing (sampled in instrumentation-client.ts); drop replay code from the client bundle
  webpack: {
    treeshake: {
      removeDebugLogging: true,
      excludeReplayIframe: true,
      excludeReplayShadowDOM: true,
      excludeReplayCompressionWorker: true,
    },
  },
});
