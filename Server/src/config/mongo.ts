import { MongoClient, Db } from 'mongodb';
import { env } from './env';

const MONGO_URI = env.mongoUri || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB || env.mongoDbName || 'logs';

// Auto-detect MongoDB Atlas and enable TLS only for Atlas
const isAtlas = MONGO_URI.startsWith('mongodb+srv://') || MONGO_URI.includes('.mongodb.net');

const mongoOptions = {
    // Connection pool settings
    maxPoolSize: 10,
    minPoolSize: 2,
    // Retry settings
    retryWrites: true,
    retryReads: true,
    // Timeouts
    serverSelectionTimeoutMS: 5000,  // Reduced timeout for faster failure
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000,
    // Enable TLS only for MongoDB Atlas with relaxed validation for Bun compatibility
    ...(isAtlas && {
        tls: true,
        tlsAllowInvalidCertificates: true,  // Allow invalid certs for Bun compatibility
        tlsAllowInvalidHostnames: true,     // Allow invalid hostnames for Bun compatibility
    }),
};

const client = new MongoClient(MONGO_URI, mongoOptions);

let cachedDb: Db | null = null;

export const mongo = {
    /**
     * Kết nối MongoDB và trả về DB instance
     */
    async connect(): Promise<Db> {
        if (cachedDb) return cachedDb;

        try {
            await client.connect();
            const db = client.db(DB_NAME);
            cachedDb = db;
            console.log(`[MongoDB] Đã kết nối tới "${DB_NAME}"`);
            return db;
        } catch (error) {
            console.error('[MongoDB] Kết nối thất bại:', error);
            throw error;
        }
    },
};
