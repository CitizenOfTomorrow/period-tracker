/** @type {import('next').NextConfig} */

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    '192.168.1.186',
    '100.89.71.55',
    'pi5motioneye',
  ],
  async headers() {
    return [
      {
        // Never cache HTML documents / dynamic responses so a redeploy is
        // picked up immediately. Hashed assets under /_next/ are excluded and
        // keep their long-lived immutable caching.
        source: '/((?!_next/).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ]
  },
}

export default nextConfig
