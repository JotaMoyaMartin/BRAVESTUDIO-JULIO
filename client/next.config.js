/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // QA local: permite build con distDir separado SIN tumbar el dev server
  // (los builds de prod en Vercel no definen esta env y usan '.next' normal).
  distDir: process.env.QA_BUILD_DIST_DIR || '.next',
  // Landing V3 (Academia Estilistas de Éxito): deploy estático independiente
  // (proyecto Vercel `landingv3`, sitio en public/landingv3/ y ruta interna
  // /landingv3 → index.html en su vercel.json). El proxy aquí preserva el
  // prefijo completo y NO usa redirects de barra final: la normalización de
  // slashes del edge de Vercel crea loops con este subdirectorio.
  // Actualizar la landing = redeploy solo del proyecto landingv3.
  // /link: página link-in-bio para la bio de Instagram (public/landingv3/link/).
  async rewrites() {
    return [
      { source: '/landingv3', destination: 'https://landingv3-nine.vercel.app/landingv3' },
      { source: '/landingv3/:path*', destination: 'https://landingv3-nine.vercel.app/landingv3/:path*' },
      { source: '/link', destination: 'https://landingv3-nine.vercel.app/landingv3/link' },
      { source: '/link/:path*', destination: 'https://landingv3-nine.vercel.app/landingv3/link/:path*' },
    ]
  },
}

module.exports = nextConfig