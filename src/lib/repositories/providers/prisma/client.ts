import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma client instance
 * Uses singleton pattern to prevent multiple connections
 */
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: ['query', 'error', 'warn'],
        errorFormat: 'pretty',
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Disconnect from database on process termination
 */
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});
