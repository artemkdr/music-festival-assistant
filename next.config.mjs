/** @type {import('next').NextConfig} */
const nextConfig = {
    /*experimental: {
        nodeMiddleware: true,
    },*/
    eslint: {
        dirs: ['src', '.'],
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
                    { key: 'Access-Control-Allow-Origin', value: 'https://festivals.artem.work' },
                    { key: 'Access-Control-Allow-Origin', value: 'https://festival.artem.work' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
                    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
                ],
            },
        ];
    },
};

export default nextConfig;
