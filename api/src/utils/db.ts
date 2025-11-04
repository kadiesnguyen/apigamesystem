// api/utils/db.ts
import '../load-env';
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';

// ---------- PostgreSQL ----------
const base: any = {
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER,
  database: process.env.PG_DATABASE,
  max: 10,
};
if (typeof process.env.PG_PASSWORD === 'string' && process.env.PG_PASSWORD !== '') {
  base.password = process.env.PG_PASSWORD;
}
export const pool = new Pool(base);
console.log('✅ DB pool (Postgres) created');

// ---------- MongoDB ----------
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
export const mongoClient = new MongoClient(mongoUrl);
export let mongoDb: ReturnType<MongoClient['db']>;

// Hàm connect Mongo, gọi khi app khởi động
export async function connectMongo() {
  if (!mongoClient.topology?.isConnected()) {
    await mongoClient.connect();
    console.log('✅ MongoDB connected');
  }
  const dbName = process.env.MONGO_DB || 'logs'; // mặc định 'logs'
  mongoDb = mongoClient.db(dbName);
  return mongoDb;
}
