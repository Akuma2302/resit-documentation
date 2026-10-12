/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdfkit reads its font metric files from disk, so it must not be bundled
    serverComponentsExternalPackages: ['pdfkit', 'exceljs'],
    // make sure pdfkit's font files ship with the export function when deployed
    outputFileTracingIncludes: {
      '/api/admin/export': ['./node_modules/pdfkit/js/data/**'],
    },
  },
}

export default nextConfig
