const remotePatterns = [];

if (process.env.EVERSHOP_BASE_URL) {
  try {
    const everShopUrl = new URL(process.env.EVERSHOP_BASE_URL);
    remotePatterns.push({
      protocol: everShopUrl.protocol.slice(0, -1),
      hostname: everShopUrl.hostname,
      port: everShopUrl.port,
      pathname: "/**",
    });
  } catch {
    // Runtime validation in the commerce adapter reports an invalid URL clearly.
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker builds are portable; the existing Vercel build remains unchanged.
  ...(process.env.MANGATA_STANDALONE === "1" ? { output: "standalone" } : {}),
  poweredByHeader: false,
  reactCompiler: true,
  redirects() {
    // Retired preview alias: one storefront and one live inventory, on Hostinger.
    return [{ source: "/:path*", has: [{ type: "host", value: "mangata-store.vercel.app" }],
      destination: "https://mangata.com.ar/:path*", permanent: true }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
    minimumCacheTTL: 86400,
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 24, 32, 48, 64, 96, 128, 256],
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
