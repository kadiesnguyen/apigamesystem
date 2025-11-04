// api/load-env.ts
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env ở project root (cùng level với /api và /src)
config({ path: path.resolve(__dirname, '../.env') });

// (tuỳ chọn) log nhanh để kiểm tra
console.log('ENV OK:', process.env.PG_HOST, process.env.PG_USER);
