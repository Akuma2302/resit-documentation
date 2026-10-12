/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdfkit reads its font metric files from disk, so it must not be bundled
    serverComponentsExternalPackages: ['pdfkit', 'exceljs'],
  },
}

export default nextConfig
