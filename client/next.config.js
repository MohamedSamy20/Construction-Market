/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      'images.unsplash.com',
      'unsplash.com',
      // Production image/CDN hosts
      'res.cloudinary.com',
      'construction-market.onrender.com',
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
      // Allow Cloudinary hosted media
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      // Allow API-served absolute image URLs (production)
      {
        protocol: 'https',
        hostname: 'construction-market.onrender.com',
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