/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Enable static exports for Netlify
  images: {
    unoptimized: true, // Required for static export
  },
  env: {
    // You can set environment variables here or use .env.local file
  },
}

module.exports = nextConfig