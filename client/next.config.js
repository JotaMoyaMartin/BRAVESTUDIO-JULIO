/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // QA local: permite build con distDir separado SIN tumbar el dev server
  // (los builds de prod en Vercel no definen esta env y usan '.next' normal).
  distDir: process.env.QA_BUILD_DIST_DIR || '.next',
}

module.exports = nextConfig