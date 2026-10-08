import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Import Clients
import { PrismaClient as PrismaClientConsolidated } from '@prisma/client-new';

const connectionString = `${process.env.NEW_DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);

const globalForPrisma = global as unknown as { 
  prisma?: PrismaClientConsolidated
};

// Export the Main Client for the Project (Now using the new database)
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClientConsolidated({
    adapter: adapter,
    log: ['error'],
  });

// Export as prismaNew for compatibility with recent changes
export const prismaNew = prisma;

// Export the client for the main Teso database (DATABASE_URL_LOCAL or DATABASE_URL)
const connectionStringTeso = process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL;
let prismaTesoClient: PrismaClientConsolidated | null = null;

if (connectionStringTeso) {
  const poolTeso = new Pool({ 
    connectionString: connectionStringTeso,
    connectionTimeoutMillis: 2000 // 2 seconds timeout for connection attempts
  });
  const adapterTeso = new PrismaPg(poolTeso as any);
  prismaTesoClient = new PrismaClientConsolidated({
    adapter: adapterTeso,
    log: ['error'],
  });
}

export const prismaTeso = prismaTesoClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
