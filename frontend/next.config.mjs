/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output as standalone to improve deployment reliability
  output: 'standalone',
  
  // Allow placement images from any source
  images: {
    domains: ['placeholder-for-build.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Ensure routes are properly recognized by Vercel
  trailingSlash: false,
  
  // Make 404s handled by the app
  async redirects() {
    return [
      // Redirect to home page from common 404 paths
      {
        source: '/index',
        destination: '/',
        permanent: true,
      },
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
}

export default nextConfig;