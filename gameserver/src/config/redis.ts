import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT || 6379);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redis = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    // optional: retry strategy, db, TLS...
});

redis.on('connect', () => {
    console.log('✅ Redis connected at', `${redisHost}:${redisPort}`);
});

redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
});
