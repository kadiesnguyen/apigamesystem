import { db } from '../config/db';
import { redis } from '../config/redis';
import { mongo } from '../config/mongo';
import { createToken, verifyToken } from '../utils/jwt.util';
import { successResponse, errorResponse } from '../utils/response.util';

export const authController = {
    async getToken({ body }: { body: { apiKey: string; secretKey: string } }) {
        const { apiKey, secretKey } = body;

        // 1. Tìm đối tác trong PostgreSQL
        const result = await db.pool.query(
            'SELECT * FROM partners WHERE api_key = $1 AND secret_key = $2 LIMIT 1',
            [apiKey, secretKey]
        );

        if (result.rows.length === 0) {
            return errorResponse('Thông tin đối tác không hợp lệ', 401);
        }

        const partner = result.rows[0];
        const token = createToken({ partnerId: partner.id });
        console.log('✅ Đã tạo token cho đối tác:', partner.id);
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 giờ


        // 2. Ghi session vào PostgreSQL
        await db.pool.query(
            'INSERT INTO partner_sessions (partner_id, token, expires_at) VALUES ($1, $2, $3)',
            [partner.id, token, expiresAt]
        );

        await redis.set(
            `session:${token}`,
            JSON.stringify({
                partnerId: partner.id,
                token,
                expiresAt: expiresAt.toISOString()
            }),
            'EX',
            60 * 60 * 2
        );

        return successResponse({ token });
    },

    // async register({ body, store, set, request }: any) {
    //     const { username } = body;
    //     console.log('Controller: Đang xử lý đăng ký người dùng');
    //     console.log(store);
    //     const partnerId = store.partnerId;
    //     console.log('✅ Đối tác đăng ký người dùng mới:', partnerId, username);
    //     if (!username) {
    //         set.status = 400;
    //         return errorResponse('Thiếu username');
    //     }

    //     const check = await db.pool.query(
    //         'SELECT id FROM partner_users WHERE partner_id = $1 AND username = $2',
    //         [partnerId, username]
    //     );

    //     if (check.rowCount > 0) {
    //         set.status = 409;
    //         return errorResponse('Người dùng đã tồn tại');
    //     }

    //     const insert = await db.pool.query(
    //         'INSERT INTO partner_users (partner_id, username) VALUES ($1, $2) RETURNING id',
    //         [partnerId, username]
    //     );

    //     // Ghi log vào MongoDB
    //     const logs = mongo.collection('logs.registration');
    //     await logs.insertOne({
    //         partnerId,
    //         userId: insert.rows[0].id,
    //         username,
    //         action: 'register',
    //         ip: request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown',
    //         userAgent: request.headers.get('user-agent') || 'unknown',
    //         createdAt: new Date()
    //     });

    //     return successResponse({ userId: insert.rows[0].id });
    // },


};
