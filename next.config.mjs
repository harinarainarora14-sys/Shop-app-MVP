/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Add this to help with build issues
    optimizePackageImports: ['lucide-react'],
  },
  // Add output config for static builds
  output: 'standalone',
}

export default nextConfig