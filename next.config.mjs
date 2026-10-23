/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd39ru7awumhhs2.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'd1l4mzebo786pw.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api-v2.dropi.co',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
