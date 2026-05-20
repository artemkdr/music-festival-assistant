import createNextIntlPlugin from 'next-intl/plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
    // experimental: {}, // Removed if empty, Next.js 16 handles defaults natively
    
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**', // Works, but narrow this down if possible
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    // Note: Multiple Access-Control-Allow-Origin keys removed.
                    // Handle dynamic origins securely in middleware/proxy file instead.
                    { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
                    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
        ];
    },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);