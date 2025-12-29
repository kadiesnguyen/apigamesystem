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
  // Enable SSL for AWS RDS connections
  ssl: process.env.PG_SSL === 'false' ? false : {
    rejectUnauthorized: false, // Required for AWS RDS
  },
};
if (typeof process.env.PG_PASSWORD === 'string' && process.env.PG_PASSWORD !== '') {
  base.password = process.env.PG_PASSWORD;
}
export const pool = new Pool(base);
console.log('✅ DB pool (Postgres) created');

// ---------- MongoDB ----------
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';

// Auto-detect MongoDB Atlas and enable TLS only for Atlas
const isAtlas = mongoUrl.startsWith('mongodb+srv://') || mongoUrl.includes('.mongodb.net');

const mongoOptions = {
  // Connection pool settings
  maxPoolSize: 10,
  minPoolSize: 2,
  // Retry settings
  retryWrites: true,
  retryReads: true,
  // Timeouts
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  // Enable TLS only for MongoDB Atlas with relaxed validation for Bun compatibility
  ...(isAtlas && {
    tls: true,
    tlsAllowInvalidCertificates: true,  // Allow invalid certs for Bun compatibility
    tlsAllowInvalidHostnames: true,     // Allow invalid hostnames for Bun compatibility
  }),
};

export const mongoClient = new MongoClient(mongoUrl, mongoOptions);
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
