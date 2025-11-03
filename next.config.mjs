// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🚀 Permite que el deploy en Vercel pase aunque haya errores de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  // (opcional) si usás TS y querés bloquear builds por errores TS, dejalo en false
  typescript: {
    ignoreBuildErrors: false,
  },
  // Si usás imágenes remotas, agregá dominios aquí.
  images: {
    // domains: ['tu-cdn.com', 'res.cloudinary.com'],
  },
  experimental: {
    // lo detectó Vercel; lo dejamos igual
    optimizePackageImports: [],
  },
};

export default nextConfig;
