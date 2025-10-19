// Import Next.js type definitions (optional but helps with IDE hints)
/** @type {import('next').NextConfig} */

// Define your Next.js configuration
const nextConfig = {
  // Enables the new standalone output mode — great for Docker and production builds
  output: 'standalone',

  // Optional: You can customize other configs here
  reactStrictMode: true,

  // Example: environment variable exposure
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

// Export it as the default ES module export
export default nextConfig;
