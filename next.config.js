/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['tysdqyzxglrdmbgofqaq.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tysdqyzxglrdmbgofqaq.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
  experimental: {
    optimizeCss: true,
  },
  serverExternalPackages: [],
}

module.exports = nextConfig