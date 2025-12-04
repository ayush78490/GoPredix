/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable static optimization to prevent build errors with client-only hooks
  output: 'standalone',
  experimental: {
    // Disable static generation completely
    isrMemoryCacheSize: 0,
  },
}

export default nextConfig
