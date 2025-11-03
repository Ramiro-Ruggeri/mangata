/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⚠️ Ignorar ESLint en build (Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ⚠️ Ignorar errores de TypeScript en build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Si usás imágenes remotas, agregá dominios acá
  images: {
    remotePatterns: [
      // { protocol: 'https', hostname: '...'}
    ],
  },
};

export default nextConfig;
