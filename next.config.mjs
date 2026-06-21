/** @type {import('next').NextConfig} */

function supabaseHostname() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "kqoigeigwucvlpzbvboy.supabase.co";
  try {
    return new URL(url).hostname;
  } catch {
    return "kqoigeigwucvlpzbvboy.supabase.co";
  }
}

const supabaseHost = supabaseHostname();

const nextConfig = {
  poweredByHeader: false,
  generateEtags: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost }],
  },
  serverRuntimeConfig: {},
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },

  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://${supabaseHost}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              `connect-src 'self' https://${supabaseHost} https://api.deepseek.com https://dashscope.aliyuncs.com`,
              "font-src 'self' data:",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, must-revalidate",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
