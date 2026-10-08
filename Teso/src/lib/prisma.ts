import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

async function checkConnection() {
  try {
    await prisma.$connect();
    console.log('\x1b[32m%s\x1b[0m', '✓ Database connected successfully');
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '✗ Database connection failed');
    console.error(error);
  }
}

checkConnection();
