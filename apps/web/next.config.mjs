/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@taskin/ui',
    '@taskin/i18n',
    '@taskin/domain',
    '@taskin/application',
    '@taskin/infrastructure',
  ],
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
