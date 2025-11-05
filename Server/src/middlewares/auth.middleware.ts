import { Elysia } from 'elysia';
import { db } from '../config/db';
import { generateSignature } from '../utils/crypto.util';

export const authMiddleware = (app: Elysia) =>
  app.derive(async (ctx) => {
    const { request, set, body } = ctx;
    const pathname = new URL(request.url).pathname;

    // ==== BYPASS CÁC ROUTE PUBLIC ====
    // Giữ login có chữ ký (nếu bạn muốn), chỉ bypass /api/user/token
    const isPublic = pathname === '/api/user/token';
    if (isPublic) {
      // Không làm gì thêm, không đòi header, không query DB
      return { store: {} };
    }

    // ==== CÁC ROUTE CÒN LẠI PHẢI KÝ ====
    const apiKey = request.headers.get('x-api-key') || '';
    const timestamp = request.headers.get('x-timestamp') || '';
    const signature = request.headers.get('x-signature') || '';

    if (!apiKey || !timestamp || !signature) {
      set.status = 401;
      throw new Error('Thiếu header bắt buộc');
    }

    const tsNum = Number(timestamp);
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
      set.status = 401;
      throw new Error('Request hết hạn');
    }

    // Xác thực partner theo apiKey
    const result = await db.query(
      `SELECT id, secret_key FROM partners WHERE api_key = $1`,
      [apiKey]
    );
    if (result.rowCount === 0) {
      set.status = 403;
      throw new Error('API Key không hợp lệ');
    }
    const { id: partnerId, secret_key } = result.rows[0];

    // Verify chữ ký
    const method = request.method;
    const rawBody = JSON.stringify(body ?? {});
    const payload = `${method}|${pathname}|${timestamp}|${rawBody}`;
    const expectedSignature = generateSignature(secret_key, payload);
    if (signature !== expectedSignature) {
      set.status = 403;
      throw new Error('Chữ ký không hợp lệ');
    }

    // (Tùy chọn) Tìm userId chỉ khi body có đủ trường
    let userId: number | undefined = undefined;
    if (body?.username && body?.gameId) {
      const userID = await db.query(
        `SELECT player_id FROM player_accounts WHERE username = $1 AND game_id = $2`,
        [body.username, body.gameId]
      );
      userId = userID.rows[0]?.player_id;
    }

    return {
      store: {
        partnerId,
        userId
      }
    };
  });
