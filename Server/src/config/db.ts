// ✅ db.ts
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const password = process.env.POSTGRES_PASSWORD || 'defaultpassword';
const user = process.env.POSTGRES_USER || 'defaultuser';
const database = process.env.POSTGRES_DB || 'defaultdb';
const host = process.env.POSTGRES_HOST || 'localhost';
const port = process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 5432;

const pool = new Pool({
  // postgres://postgres:A1234@localhost:5432/game';
  // connectionString: `postgres://${user}:${password}@${host}:${port}/${database}`,
  connectionString: `postgres://${user}:${password}@${host}:${port}/${database}`,
});

let isConnected = false;

export const db = {
  pool,
  async connect(): Promise<Pool> {
    if (!isConnected) {
      try {
        const client: PoolClient = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        console.log('✅ PostgreSQL đã kết nối thành công');
        isConnected = true;
      } catch (err) {
        console.error('❌ Lỗi kết nối PostgreSQL:', err);
        throw err;
      }
    }
    return pool;
  },
  async query(text: string, params?: any[]): Promise<any> {
    const client: PoolClient = await pool.connect();
    try {
      const res = await client.query(text, params);
      return res;
    } catch (err) {
      console.error('❌ Lỗi truy vấn PostgreSQL:', err);
      throw err;
    } finally {
      client.release();
    }
  },
};

// ✅ THÊM DÒNG NÀY:
export { pool }; // <-- nếu ở file khác bạn muốn import { pool }
