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

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
};

module.exports = nextConfig;
