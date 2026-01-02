import { successResponse, errorResponse } from '../utils/response.util';
import { createToken } from '../utils/jwt.util';
import bcrypt from 'bcrypt';
import { postgres } from 'bun';
import { verifyOneTimeToken } from '../utils/token.util';
// import { db } from '../config/db';

type Ctx = {
    postgres: any;
    mongo: any;
    redis: any;
    store: { partnerId?: number };
    body: any;
    request: any;
    userId?: number;
    gameId?: number;
};

function parsePgError(e: any) {
    // gom lỗi hay gặp: unique_violation, raise exception từ SP
    const msg = e?.detail || e?.message || String(e);
    if (e?.code === '23505') return { status: 409, message: 'Username đã tồn tại' };
    // các RAISE EXCEPTION trong SP không có code chuẩn => trả nguyên văn
    return { status: 400, message: msg };
}

export const userController = {
    // POST /auth/register
    async register({ postgres, mongo, redis, store, body, request }: Ctx) {
        const { partnerId: partnerFromStore } = store || {};
        // console.log("Current Partner ID:", partnerFromStore);
        if (!partnerFromStore) return errorResponse('Partner ID không hợp lệ', 400);

        const {
            username,
            password,
            initGameId,
            gameUsername
        }: {
            username: string;
            password: string;
            initGameId?: number;
            gameUsername?: string;
        } = body || {};
        // console.log(body);
        if (!username?.trim()) return errorResponse('Thiếu username', 400);
        if (!password?.trim()) return errorResponse('Thiếu password', 400);
        // console.log("Current Game ID:", initGameId);
        // console.log("Current Game Username:", gameUsername);
        // console.log("Current Username:", username.trim());
        // console.log("Current Password:", password.trim());
        // console.log("Current Partner ID:", partnerFromStore);
        const client = await postgres.connect();
        try {
            // Hash ở APP
            const passwordHash = await bcrypt.hash(password, 10);

            await client.query('BEGIN');

            // 1) Đăng ký player toàn hệ
            const reg = await client.query(
                `SELECT * FROM sp_register_player($1,$2,$3)`,
                [partnerFromStore, username.trim(), passwordHash]
            );
            // console.log('[REG] rowCount=', reg.rowCount, 'rows=', reg.rows);

            let playerId: number | null = reg.rows[0]?.player_id ?? null;

            if (!playerId) {
                // fallback: nếu SP insert nhưng không return
                const q2 = await client.query(
                    `SELECT id FROM players WHERE partner_id=$1 AND username=$2`,
                    [partnerFromStore, username.trim()]
                );
                // console.log('[REG] fallback rows=', q2.rows);
                if (q2.rowCount > 0) {
                    playerId = q2.rows[0].id;          // ✅ gán playerId rồi TIẾP TỤC
                } else {
                    throw new Error('Không tạo được player');
                }
            }

            // 2) (Optional) Tạo ví game ban đầu
            let accountId: number | null = null;
            if (initGameId) {
                const acc = await client.query(
                    `SELECT * FROM sp_ensure_game_account($1,$2,$3,$4)`,
                    [playerId, initGameId, (username).trim(), 'VND']
                );
                // console.log('[ENSURE_ACC] rc=', acc.rowCount, 'rows=', acc.rows, acc.rows[0]);
                // accountId = acc.rows[0]?.account_id ?? null;

                if (!accountId) {
                    // fallback: kiểm tra trực tiếp trong bảng
                    const chk = await client.query(
                        `SELECT id FROM player_accounts WHERE player_id=$1 AND game_id=$2`,
                        [playerId, initGameId]
                    );
                    console.log('[ENSURE_ACC] fallback=', chk.rows);
                    if (chk.rowCount > 0) accountId = chk.rows[0].id;
                }
            }
            console.log('[ENSURE_ACC] final accountId=', accountId);
            await client.query('COMMIT');           // ✅ luôn COMMIT trước khi trả về

            return successResponse({
                message: 'Đăng ký thành công',
                playerId,
                username: username.trim(),
                partnerFromStore,
                accountId
            });

        } catch (error: any) {
            await client.query('ROLLBACK').catch(() => { });
            const { status, message } = parsePgError(error);
            return errorResponse(message || 'Đăng ký thất bại', status);
        } finally {
            client.release();
        }
    },

    // POST /auth/login  — Cách 1: verify ở APP (bcrypt)
    async login({ postgres, mongo, redis, store, body, request }: Ctx) {
        const { partnerId } = store || {};
        if (!partnerId) return errorResponse('Partner ID không hợp lệ', 400);

        const { username, password } = (body || {}) as { username: string; password: string };
        if (!username?.trim()) return errorResponse('Thiếu username', 400);
        if (!password?.trim()) return errorResponse('Thiếu password', 400);

        try {
            // lấy từ players thay vì partner_users (đây là player đăng nhập toàn hệ)
            const q = await postgres.query(
                `SELECT id, password_hash, active
         FROM players
         WHERE partner_id = $1 AND username = $2`,
                [partnerId, username.trim()]
            );

            if (q.rowCount === 0) return errorResponse('Tài khoản không tồn tại', 404);

            const row = q.rows[0];
            if (row.active !== true) return errorResponse('Tài khoản bị khóa', 403);

            const ok = await bcrypt.compare(password, row.password_hash);
            if (!ok) return errorResponse('Mật khẩu không đúng', 401);

            const payload = {
                userId: row.id,          // playerId
                username: username.trim(),
                partnerId
            };

            const token = createToken(payload);
            const redisKey = `session:${token}`;
            await redis.set(
                redisKey,
                JSON.stringify({ ...payload, used: false }),
                'EX',
                3600 * 2
            );

            // Ghi log
            try {
                const logs = mongo.collection('logs.login');
                await logs.insertOne({
                    playerId: row.id,
                    partnerId,
                    username: username.trim(),
                    action: 'login',
                    ip: request.headers.get('x-forwarded-for') || request.ip,
                    userAgent: request.headers.get('user-agent'),
                    createdAt: new Date()
                });
            } catch (_) { }

            return successResponse({
                message: 'Đăng nhập thành công',
                token,
                user: {
                    userId: row.id,
                    username: username.trim()
                }
            });
        } catch (err: any) {
            return errorResponse(err?.message || 'Đăng nhập thất bại', 500);
        }
    },

    async consumeToken({ body, redis, postgres }: Ctx) {
        const { token } = body || {};
        console.log('Consuming token:', token);
        if (!token) return errorResponse('Thiếu token', 400);

        try {
            const session = await verifyOneTimeToken(token, redis, postgres);
            // session trả về: { userId, username, partnerId, used:true }

            // tạo sessionToken dùng trong game (2h)
            const sessionToken = createToken({
                userId: session.userId,
                username: session.username,
                partnerId: session.partnerId
            });

            await redis.set(
                `session:${sessionToken}`,
                JSON.stringify({
                    userId: session.userId,
                    username: session.username,
                    partnerId: session.partnerId
                }),
                'EX',
                3600 * 2
            );

            // Trả format thống nhất (giống login)
            return successResponse({
                sessionToken
            });
        } catch (err: any) {
            return errorResponse(err?.message || 'Xác thực token thất bại', 401);
        }
    },

    /* 
    // Nếu muốn verify ở DB: bật route này thay cho login ở trên
    async loginDb({ postgres, mongo, redis, store, body, request }: Ctx) {
      const { partnerId } = store || {};
      if (!partnerId) return errorResponse('Partner ID không hợp lệ', 400);
  
      const { username, password } = (body || {}) as { username: string; password: string };
      if (!username?.trim()) return errorResponse('Thiếu username', 400);
      if (!password?.trim()) return errorResponse('Thiếu password', 400);
  
      try {
        const q = await postgres.query(
          `SELECT * FROM sp_login_player($1,$2,$3)`,
          [partnerId, username.trim(), password]
        );
        if (q.rowCount === 0) return errorResponse('Sai thông tin đăng nhập', 401);
  
        const playerId = q.rows[0].player_id as number;
  
        const payload = { userId: playerId, username: username.trim(), partnerId };
        const token = createToken(payload);
        const redisKey = `session:${partnerId}:${token}`;
        await redis.set(redisKey, JSON.stringify(payload), 'EX', 3600 * 2);
  
        try {
          const logs = mongo.collection('logs.login');
          await logs.insertOne({
            playerId,
            partnerId,
            username: username.trim(),
            action: 'login',
            ip: request.headers.get('x-forwarded-for') || request.ip,
            userAgent: request.headers.get('user-agent'),
            createdAt: new Date()
          });
        } catch (_) {}
  
        return successResponse({
          message: 'Đăng nhập thành công',
          token,
          user: { userId: playerId, username: username.trim() }
        });
      } catch (err: any) {
        const { status, message } = parsePgError(err);
        return errorResponse(message || 'Đăng nhập thất bại', status);
      }
    },
    */

    async getGameId(userId: number, postgres: any) {
        if (!userId) return null;
        const result = await postgres.query(
            `SELECT game_id FROM player_accounts WHERE player_id = $1`,
            [userId]
        );
        return result.rowCount > 0 ? result.rows[0].game_id : null;
    },

    // GET /auth/profile  — lấy thông tin từ bảng players
    async getProfile({ postgres, store, userId, gameId }: Ctx) {
        if (!userId) return errorResponse('User ID không hợp lệ', 400);
        let targetGameId = typeof gameId === 'number' && Number.isFinite(gameId) && gameId > 0
            ? gameId
            : null;

        if (!targetGameId) {
            targetGameId = await this.getGameId(userId, postgres);
        }

        if (!targetGameId) return errorResponse('Game ID không hợp lệ', 400);
        // console.log(`Lấy thông tin profile cho userId=${userId}, gameId=${targetGameId}`);

        const user = await postgres.query(
            `SELECT id, username, partner_id, active
         FROM players
         WHERE id = $1`,
            [userId],
        );
        if (user.rowCount === 0) return errorResponse('Tài khoản không tồn tại', 404);
        // console.log('User:', user.rows[0]);

        const wallets = await postgres.query(
            `SELECT id as account_id, game_id, currency, balance, locked_balance, active, free_spins
         FROM player_accounts
         WHERE player_id = $1 AND game_id = $2
         ORDER BY game_id`,
            [userId, targetGameId]
        );

        return successResponse({
            message: 'Lấy thông tin người dùng thành công',
            user: user.rows[0],
            wallets: wallets.rows
        });
    }
};
