/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing config options...
  
  // Disable static optimization for pages that depend on Supabase data
  // This prevents build-time pre-rendering errors when Supabase credentials are missing
  experimental: {
    // Your existing experimental options...
  },
  
  // Configure which paths should not be statically generated
  unstable_excludeStaticRoutes: [
    '/expenses',
    '/expenses/add',
  ],
  
  // Use server-side rendering for pages that need dynamic data
  // This ensures they're not pre-rendered at build time
  exportPathMap: async function (defaultPathMap) {
    return {
      ...defaultPathMap,
      '/expenses': { page: '/expenses', ssr: true },
      '/expenses/add': { page: '/expenses/add', ssr: true },
    };
  },
}

export default nextConfig;