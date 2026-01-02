// src/middlewares/authUser.middleware.ts
import { Elysia } from 'elysia';
import { verifyToken } from '../utils/jwt.util';
import { redis } from '../config/redis';

export const authUserMiddleware = (app: Elysia) =>
    app.derive(async ({ request, set }) => {
        console.log('Middleware: Đang xác thực người dùng');
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            set.status = 401;
            throw new Error('Thiếu hoặc sai định dạng token');
        }

        const token = authHeader.replace('Bearer ', '');
        let payload;

        try {
            payload = verifyToken(token);
        } catch {
            set.status = 401;
            throw new Error('Token không hợp lệ');
        }

        const { partnerId } = payload;
        const redisKey = `session:${token}`;
        const session = await redis.get(redisKey);

        if (!session) {
            set.status = 401;
            throw new Error('Session hết hạn hoặc không tồn tại');
        }

        const userData = JSON.parse(session);
        // console.log('Middleware: Thông tin người dùng:', userData);
        return {
            store: {
                user: userData // userId, username, partnerId
            }
        };
    });
