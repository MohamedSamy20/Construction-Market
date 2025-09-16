/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      'images.unsplash.com',
      'unsplash.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
      },
    ],
  },
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/:locale/icon.svg', destination: '/icon.svg' },
    ];
  },
}

module.exports = nextConfig