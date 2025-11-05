import { MongoClient, Db } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB || 'partner_system';

const client = new MongoClient(MONGO_URI);

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
