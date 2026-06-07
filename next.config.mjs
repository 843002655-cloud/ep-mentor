/** @type {import('next').NextConfig} */
const nextConfig = {
  serverRuntimeConfig: {},
  // Increase body size limit for image uploads (default 1MB → 50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
