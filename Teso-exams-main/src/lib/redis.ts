import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || process.env.KV_URL || process.env.STORAGE_URL || 'redis://localhost:6379';

const globalForRedis = global as unknown as {
  redisClient?: ReturnType<typeof createClient>;
};

export const redis =
  globalForRedis.redisClient ??
  createClient({
    url: redisUrl,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redis;
}

if (!redis.isOpen) {
  redis.connect().catch((err) => {
    console.error('Redis connection error:', err);
  });
}

export default redis;
