import dotenv from 'dotenv';
dotenv.config();

export const env = {
    port: Number(process.env.PORT) || 3000,
    jwtSecret: process.env.JWT_SECRET || 'dev-secret',
    redisHost: process.env.REDIS_HOST || '127.0.0.1',
    redisPort: Number(process.env.REDIS_PORT) || 6379,
    redisPassword: process.env.REDIS_PASSWORD || undefined,
    postgresHost: process.env.POSTGRES_HOST || '127.0.0.1',
    postgresPort: Number(process.env.POSTGRES_PORT) || 5432,
    postgresUser: process.env.POSTGRES_USER || 'user',
    postgresPassword: process.env.POSTGRES_PASSWORD || 'password',
    postgresDatabase: process.env.POSTGRES_DB || 'database',
    mongoUri: process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017',
    mongoDbName: process.env.MONGO_DB_NAME || 'logs',
};