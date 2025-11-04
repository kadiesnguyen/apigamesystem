import { fileURLToPath } from 'url';
import path from 'path';
import Elysia, { t } from 'elysia';
import cors from '@elysiajs/cors';
import bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import deepMerge from './utils/deepMerge';
import { connectMongo, mongoDb } from './utils/db';
import { pool } from './utils/db';
import { signAccess, signRefresh, verifyAccess, verifyRefresh, JwtUser } from './utils/jwt';

// (đã load .env trong db.ts, nên KHÔNG cần 'dotenv/config' ở đây nữa)
// nếu vẫn muốn chủ động:
import './load-env';

// Redis config
const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD,
});
const Key = {
    ver: (gid: number, pid = 0) => `game:${gid}:config:ver:${pid}`,      // value = string timestamp
    eff: (gid: number, pid = 0) => `game:${gid}:config:eff:${pid}`,      // value = JSON { v, config, rtp }
};

async function rebuildEffAndBump(gid: number, pid = 0) {
    const client = await pool.connect();
    try {
        const base = (await client.query(
            `SELECT id, config, rtp FROM games WHERE id=$1`, [gid]
        )).rows[0];
        if (!base) return;

        // nếu chưa dùng partner, pid=0 sẽ không có override
        const ov = (await client.query(
            `SELECT rtp_override, config AS config_override
       FROM partner_games WHERE partner_id=$1 AND game_id=$2`,
            [pid, gid]
        )).rows[0];

        const effective = deepMerge(base.config ?? {}, ov?.config_override ?? {});
        const effRtp = ov?.rtp_override ?? base.rtp;

        const ver = Date.now().toString();
        await redis
            .multi()
            .set(Key.ver(gid, pid), ver)
            .set(Key.eff(gid, pid), JSON.stringify(effective))
            .exec();
    } finally {
        client.release();
    }
}

const app = new Elysia()
    .use(cors({
        origin: true,
        credentials: true
    }))
    .state('pg', pool)
    .decorate('sendAuth', (ctx: any, access: string, refresh: string, remember: boolean) => {
        const secure = process.env.NODE_ENV === 'production';
        const maxAge = 60 * 60 * 24 * (remember ? Number(process.env.REFRESH_EXPIRES_DAYS_REM || 30) : Number(process.env.REFRESH_EXPIRES_DAYS || 7));
        ctx.set.headers['Set-Cookie'] = [
            `rt=${refresh}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}; ${secure ? 'Secure; ' : ''}Domain=${process.env.COOKIE_DOMAIN}`
        ];
        return ctx.json({ accessToken: access });
    });

/** Auth guard */
const authGuard = (handler: any) => (ctx: any) => {
    const hdr = ctx.request.headers.get('authorization') || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    // console.log('Auth token:', token);
    if (!token) return new Response('Unauthorized', { status: 401 });
    try {
        // console.log('Verifying token...');
        const user = verifyAccess(token);
        // console.log('Authenticated user:', user);
        (ctx as any).user = user;
        return handler(ctx);
    } catch {
        return new Response('Unauthorized', { status: 401 });
    }
};

app.post('/api/auth/login',
    async ({ body, set, store }) => {
        const { username, password, remember } = body as { username: string; password: string; remember?: boolean };
        // console.log(body);
        const { rows } = await pool.query(`
      SELECT id, username, password_hash, email, role, is_active FROM admin_users WHERE username = $1 LIMIT 1
    `, [username]);
        console.log('rows:', rows[0].is_active, rows[0]);
        if (!rows[0] || !rows[0].is_active) return new Response('Sai tài khoản hoặc tài khoản bị khóa', { status: 401 });

        const ok = await bcrypt.compare(password, rows[0].password_hash);
        console.log('Password match:', ok);
        if (!ok) return new Response('Sai mật khẩu', { status: 401 });

        const user: JwtUser = { id: rows[0].id, username: rows[0].username, role: rows[0].role };

        // refresh exp theo remember
        const refreshRaw = signRefresh(user);

        // Lưu refresh (hash) vào admin_sessions
        const refreshHash = await sha256(refreshRaw);
        const days = remember ? Number(process.env.REFRESH_EXPIRES_DAYS_REM || 30) : Number(process.env.REFRESH_EXPIRES_DAYS || 7);
        await pool.query(
            `INSERT INTO admin_sessions (user_id, refresh_hash, user_agent, ip, expires_at)
       VALUES ($1, $2, $3, $4, now() + ($5 || ' days')::interval)`,
            [user.id, refreshHash, body?.ua || '', (body?.ip || null), days]
        );

        const access = signAccess(user);

        // cập nhật last_login_at
        await pool.query(`UPDATE admin_users SET last_login_at = now() WHERE id = $1`, [user.id]);

        const secure = process.env.NODE_ENV === 'production';
        const maxAge = 60 * 60 * 24 * (remember ? Number(process.env.REFRESH_EXPIRES_DAYS_REM || 30) : Number(process.env.REFRESH_EXPIRES_DAYS || 7));

        set.headers['Set-Cookie'] = `rt=${refreshRaw}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}; Domain=${process.env.COOKIE_DOMAIN}${secure ? '; Secure' : ''}`;
        set.headers['Content-Type'] = 'application/json';

        return new Response(JSON.stringify({ accessToken: access }), { status: 200 });
    },
    {
        body: t.Object({
            username: t.String({ minLength: 1 }),
            password: t.String({ minLength: 1 }),
            remember: t.Optional(t.Boolean()),
            ua: t.Optional(t.String()),
            ip: t.Optional(t.String())
        })
    }
);
async function resolveAccountId(
    pool: Pool,
    params: { accountId?: number | null; gameId?: number; partnerId?: number | null }
): Promise<{ accountId: number; gameId: number; partnerId: string }> {
    const { accountId, gameId, partnerId } = params;

    // 1) Nếu đã có accountId → xác nhận lại (optional)
    if (Number.isFinite(accountId as number) && (accountId as number) > 0) {
        const q = await pool.query(
            `SELECT id, game_id, username
         FROM player_accounts
        WHERE id = $1`,
            [accountId]
        );
        if (!q.rowCount) throw new Error('Account not found');
        const row = q.rows[0];
        // Nếu client có kèm game/username → kiểm tra khớp
        if (gameId && row.game_id !== gameId) throw new Error('Account does not belong to gameId');
        if (partnerId && row.username !== partnerId) throw new Error('Account username mismatch');
        return { accountId: row.id, gameId: row.game_id, partnerId: row.username };
    }

    // 2) Không có accountId → tra theo gameId + usernameGame (+ partnerId nếu cần)
    if (!gameId || !partnerId) throw new Error('Missing gameId or partnerId');

    const sql = `
    SELECT pa.id, pa.game_id, pa.username
      FROM player_accounts pa
     WHERE pa.game_id = $1
       AND pa.username = $2
       ${partnerId ? 'AND pa.partner_id = $3' : ''}
     LIMIT 1`;
    const args = partnerId ? [gameId, partnerId] : [gameId, null];
    const r = await pool.query(sql, args);
    if (!r.rowCount) throw new Error('Account not found for gameId + partnerId');
    const row = r.rows[0];
    return { accountId: row.id, gameId: row.game_id, partnerId: row.partner_id };
}
app.post('/api/auth/refresh', async ({ request, set }) => {
    const cookie = request.headers.get('cookie') || '';
    const rt = parseCookie(cookie)['rt'];
    if (!rt) return new Response('Missing refresh', { status: 401 });

    let payload: any;
    try { payload = verifyRefresh(rt); } catch { return new Response('Invalid refresh', { status: 401 }); }

    // check DB session exists and not revoked
    const refreshHash = await sha256(rt);
    const { rows } = await pool.query(`
    SELECT s.id, u.id as user_id, u.username, u.role, s.expires_at, s.revoked_at
    FROM admin_sessions s
    JOIN admin_users u ON u.id = s.user_id
    WHERE s.refresh_hash = $1 AND s.revoked_at IS NULL
    LIMIT 1
  `, [refreshHash]);

    const sess = rows[0];
    if (!sess) return new Response('Refresh not found', { status: 401 });
    if (new Date(sess.expires_at).getTime() < Date.now()) return new Response('Refresh expired', { status: 401 });

    const user: JwtUser = { id: sess.user_id, username: sess.username, role: sess.role };

    // rotate refresh
    await pool.query(`UPDATE admin_sessions SET revoked_at = now() WHERE id = $1`, [sess.id]);
    const newRefresh = signRefresh(user);
    const newHash = await sha256(newRefresh);
    await pool.query(
        `INSERT INTO admin_sessions (user_id, refresh_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, now() + interval '7 days')`,
        [user.id, newHash, request.headers.get('user-agent') || '', null]
    );

    const access = signAccess(user);
    return (app as any).sendAuth({ set, json: (d: any) => new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json' } }) }, access, newRefresh, true);
});

app.post('/api/auth/logout', async ({ request }) => {
    const cookie = request.headers.get('cookie') || '';
    const rt = parseCookie(cookie)['rt'];
    if (rt) {
        const hash = await sha256(rt);
        await pool.query(`UPDATE admin_sessions SET revoked_at = now() WHERE refresh_hash = $1`, [hash]);
    }
    return new Response(null, {
        status: 204,
        headers: {
            'Set-Cookie': `rt=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict; Domain=${process.env.COOKIE_DOMAIN}`
        }
    });
});

// LẤY THÔNG TIN ĐĂNG NHẬP HIỆN TẠI
app.get(
    '/api/auth/me',
    authGuard(async ({ user }) => {
        // user lấy từ access token: { id, username, role }
        const { rows } = await pool.query(
            `
      SELECT 
        u.id,
        u.username,
        u.role,
        u.partner_id,
        p.name AS partner_name,
        u.timezone,
        u.language,
        u.last_login_at
      FROM admin_users u
      LEFT JOIN partners p ON p.id = u.partner_id
      WHERE u.id = $1
      LIMIT 1
      `,
            [user.id]
        );
        console.log('Current user:', rows[0]);
        if (!rows[0]) return new Response('Not found', { status: 404 });

        const me = rows[0];
        return new Response(
            JSON.stringify({
                id: me.id,
                username: me.username,
                role: me.role,
                partner_id: me.partner_id,
                partner_name: me.partner_name,
                timezone: me.timezone ?? 'GMT+7',
                language: me.language ?? 'vi',
                last_login_at: me.last_login_at,
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    })
);

// -------------------- GAMES ROUTES --------------------
app.get('/api/games',
    authGuard(async ({ query }) => {
        const q = (query as any).q?.toString().trim() ?? '';
        const category = (query as any).category as string | undefined;
        const status = (query as any).status as string | undefined;
        const page = Number((query as any).page ?? 1);
        const pageSize = Number((query as any).pageSize ?? 10);
        const offset = (page - 1) * pageSize;

        const wh: string[] = [];
        const p: any[] = [];

        if (q) { p.push(`%${q.toLowerCase()}%`); wh.push(`(LOWER(code) LIKE $${p.length} OR LOWER(name) LIKE $${p.length})`); }
        if (category) { p.push(category); wh.push(`category = $${p.length}`); }
        if (status) { p.push(status); wh.push(`status = $${p.length}`); }

        const where = wh.length ? `WHERE ${wh.join(' AND ')}` : '';
        const totalSql = `SELECT COUNT(*)::int AS total FROM games ${where}`;
        const listSql = `SELECT id, code, name, category, rtp, volatility, status, icon_url, updated_at
                      FROM games ${where}
                      ORDER BY updated_at DESC
                      LIMIT $${p.length + 1} OFFSET $${p.length + 2}`;

        const client = await pool.connect();
        try {
            const total = (await client.query(totalSql, p)).rows[0].total as number;
            const data = (await client.query(listSql, [...p, pageSize, offset])).rows;
            return new Response(JSON.stringify({ data, total, page, pageSize }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }         finally { client.release(); }
    }),
    {
        query: t.Object({
            q: t.Optional(t.String()),
            category: t.Optional(t.Union([t.Literal('slot'), t.Literal('table'), t.Literal('lottery')])),
            status: t.Optional(t.Union([t.Literal('active'), t.Literal('inactive'), t.Literal('draft')])),
            page: t.Optional(t.Numeric()),
            pageSize: t.Optional(t.Numeric())
        })
    }
);

app.get('/api/games/:id', 
    authGuard(async ({ params }) => {
        const r = await pool.query(
            `SELECT id, code, name, category, rtp, volatility, status, icon_url, desc_short, updated_at
         FROM games WHERE id = $1`, [params.id]);
        // console.log('GET /api/games/:id', params.id, r);
        if (!r.rowCount) return new Response('Not found', { status: 404 });
        return new Response(JSON.stringify(r.rows[0]), { headers: { 'Content-Type': 'application/json' } });
    })
);

// Config gốc của game (base)
app.patch('/api/games/:id/config',
    authGuard(async ({ params, body }) => {
        const id = Number(params.id);
        if (!Number.isFinite(id)) return new Response('Bad game id', { status: 400 });

        const { config: patchConfig, rtp, volatility, status } = body as any;

        // 1) Lấy & merge config hiện tại
        const cur = await pool.query('SELECT config FROM games WHERE id=$1', [id]);
        if (!cur.rowCount) return new Response('Not found', { status: 404 });

        const nextCfg = patchConfig
            ? deepMerge(cur.rows[0].config ?? {}, patchConfig)
            : cur.rows[0].config ?? {};

        // 2) Update DB
        await pool.query(
            `UPDATE games SET
         config = $1,
         rtp = COALESCE($2, rtp),
         volatility = COALESCE($3, volatility),
         status = COALESCE($4, status),
         updated_at = now()
       WHERE id = $5`,
            [nextCfg, rtp ?? null, volatility ?? null, status ?? null, id]
        );

        // 3) Bump ver + ghi lại effective cho pid=0 (client đang dùng)
        await rebuildEffAndBump(id, 0);

        // (tuỳ chọn) vẫn publish nếu bạn có worker/subscriber
        await redis.publish('cfg:changed', JSON.stringify({ gameId: id, partnerId: 0 }));

        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }),
    {
        body: t.Partial(t.Object({
            config: t.Record(t.String(), t.Any()),
            rtp: t.Number(),
            volatility: t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')]),
            status: t.Union([t.Literal('active'), t.Literal('inactive'), t.Literal('draft')]),
        }))
    }
);

app.get('/api/games/:id/config', 
    authGuard(async ({ params }) => {
        const id = Number(params.id);
        if (!Number.isFinite(id)) return new Response('Bad game id', { status: 400 });
        const r = await pool.query('SELECT id, code, config, rtp FROM games WHERE id=$1', [id]);
        if (!r.rowCount) return new Response('Not found', { status: 404 });
        return new Response(JSON.stringify(r.rows[0]), { headers: { 'Content-Type': 'application/json' } });
    })
);
// Config hiệu lực theo partner (merge + Redis cache + version)
app.get('/api/partners/:pid/games/:gid/config', 
    authGuard(async ({ params }) => {
        const partnerId = Number(params.pid);
        const gameId = Number(params.gid);

        const verKey = `games:cfg:ver:${partnerId}:${gameId}`;
        let ver = await redis.get(verKey);

        // nếu chưa có version trong cache -> build từ PG
        async function buildAndCache() {
            const client = await pool.connect();
            try {
                const base = (await client.query(`SELECT id, code, config, rtp FROM games WHERE id = $1`, [gameId])).rows[0];
                if (!base) return null;
                const ov = (await client.query(
                    `SELECT enabled, rtp_override, config AS config_override
             FROM partner_games WHERE partner_id = $1 AND game_id = $2`,
                    [partnerId, gameId]
                )).rows[0];

                const effective = deepMerge(base.config ?? {}, ov?.config_override ?? {});
                const effRtp = ov?.rtp_override ?? base.rtp;
                const nextVer = Date.now().toString();

                await redis
                    .multi()
                    .set(`games:cfg:${gameId}:v${nextVer}`, JSON.stringify(base.config ?? {}))
                    .set(`games:cfg:eff:${partnerId}:${gameId}:v${nextVer}`, JSON.stringify({ config: effective, rtp: effRtp }))
                    .set(verKey, nextVer)
                    .exec();

                return { version: nextVer, config: effective, rtp: effRtp };
            } finally { client.release(); }
        }

        if (!ver) {
            const built = await buildAndCache();
            if (!built) return new Response('Not found', { status: 404 });
            return new Response(JSON.stringify(built), { headers: { 'Content-Type': 'application/json' } });
        }

        // có version rồi, lấy từ cache
        const effStr = await redis.get(`games:cfg:eff:${partnerId}:${gameId}:v${ver}`);
        if (effStr) {
            const eff = JSON.parse(effStr);
            return new Response(JSON.stringify({ version: ver, ...eff }), { headers: { 'Content-Type': 'application/json' } });
        }

        // mất key body -> rebuild
        const rebuilt = await buildAndCache();
        if (!rebuilt) return new Response('Not found', { status: 404 });
        return new Response(JSON.stringify(rebuilt), { headers: { 'Content-Type': 'application/json' } });
    })
);

// Invalidate cache khi bạn cập nhật config từ CMS (gọi endpoint này)
app.post('/api/partners/:pid/games/:gid/config/invalidate', authGuard(async ({ params }) => {
    const verKey = `games:cfg:ver:${params.pid}:${params.gid}`;
    await redis.del(verKey);
    return new Response(null, { status: 204 });
}));
// -------------------- PLAYERS ROUTES --------------------

app.get(
    '/api/players',
    authGuard(async ({ query, error }) => {
        const q = (query as any).q?.toString().trim() ?? '';
        const partnerIdRaw = (query as any).partnerId;
        const partnerId =
            partnerIdRaw !== undefined && partnerIdRaw !== '' ? Number(partnerIdRaw) : null;

        const page = Math.max(1, Number((query as any).page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Number((query as any).pageSize ?? 10)));
        const offset = (page - 1) * pageSize;

        const sort = (query as any).sort?.toString() ?? 'id.asc';
        const orderBy =
            sort === 'id.desc' ? 'p.id DESC' :
                sort === 'created_at.desc' ? 'p.created_at DESC' :
                    sort === 'created_at.asc' ? 'p.created_at ASC' :
                        'p.id ASC';

        // console.log('[players] params:', { q, partnerId, page, pageSize, sort, orderBy });

        const wh: string[] = [];
        const p: any[] = [];

        if (q) {
            p.push(`%${q.toLowerCase()}%`);
            wh.push(`LOWER(p.username) LIKE $${p.length}`);
        }
        if (partnerId !== null && Number.isFinite(partnerId)) {
            p.push(partnerId);
            wh.push(`p.partner_id = $${p.length}`);
        }
        const where = wh.length ? `WHERE ${wh.join(' AND ')}` : '';

        const totalSql = `SELECT COUNT(*)::int AS total FROM players p ${where}`;
        const listSql = `
        WITH wsum AS (
            SELECT
            pa.player_id,
            SUM(pa.balance)::numeric         AS total_balance,
            SUM(pa.locked_balance)::numeric  AS total_locked
            FROM player_accounts pa
            GROUP BY pa.player_id
        )
        SELECT
            p.id,
            p.partner_id,
            p.username,
            p.active,
            p.created_at,
            COALESCE(wsum.total_balance, 0)  AS total_balance,
            COALESCE(wsum.total_locked,  0)  AS total_locked
        FROM players p
        LEFT JOIN wsum ON wsum.player_id = p.id
        ${where}
        ORDER BY ${orderBy}
        LIMIT $${p.length + 1} OFFSET $${p.length + 2}
        `;
        try {
            // console.log('[players] total query start');
            const totalRes = await withTimeout(pool.query(totalSql, p), 6000, 'players.total');
            const total: number = totalRes.rows?.[0]?.total ?? 0;
            // console.log('[players] total query done:', total);

            // console.log('[players] list query start');
            //
            const listRes = await withTimeout(
                pool.query(listSql, [...p, pageSize, offset]),
                6000,
                'players.list'
            );
            const data = listRes.rows ?? [];
            // console.log('[players] list query done, rows:', data.length);
            // console.log('[players] response:', { total, page, pageSize, data });
            return new Response(JSON.stringify({ data, total, page, pageSize }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e: any) {
            console.error('[players] error:', e);
            return new Response(JSON.stringify({ error: e.message ?? 'Internal error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }),
    {
        query: t.Object({
            q: t.Optional(t.String()),
            partnerId: t.Optional(t.String()),
            page: t.Optional(t.Numeric()),
            pageSize: t.Optional(t.Numeric()),
            sort: t.Optional(
                t.Union([
                    t.Literal('id.asc'),
                    t.Literal('id.desc'),
                    t.Literal('created_at.asc'),
                    t.Literal('created_at.desc'),
                ])
            ),
        }),
    }
);

function withTimeout<T>(p: Promise<T>, ms = 6000, label = 'Query') {
    return Promise.race<T>([
        p,
        new Promise<T>((_, rej) => {
            const id = setTimeout(() => rej(new Error(`${label} timeout after ${ms}ms`)), ms);
            // tránh leak timer nếu promise resolve
            p.finally(() => clearTimeout(id));
        })
    ]);
}

// Player detail
app.get('/api/players/:playerId', authGuard(async ({ params }) => {
    const playerId = Number(params.playerId);
    // console.log('Fetching player details for ID:', playerId);
    if (!Number.isFinite(playerId)) return new Response('Bad id', { status: 400 });

    const client = await pool.connect();
    try {
        const p = await client.query(
            `SELECT id, partner_id, username, active, created_at
       FROM players WHERE id=$1 LIMIT 1`, [playerId]);
        if (!p.rowCount) return new Response('Not found', { status: 404 });

        const wallets = await client.query(
            `SELECT id AS account_id, game_id, username, currency, balance, locked_balance, active, free_spins, created_at
       FROM player_accounts WHERE player_id=$1 ORDER BY game_id`, [playerId]);

        return new Response(JSON.stringify({ player: p.rows[0], wallets: wallets.rows }),
            { headers: { 'Content-Type': 'application/json' } });
    } finally { client.release(); }
}));

app.post('/api/players/:playerId/wallets/ensure',
    authGuard(async ({ params, body }) => {
        const playerId = Number(params.playerId);
        const { gameId, gameUsername, currency } = body as { gameId: number; gameUsername?: string; currency?: string };
        if (!Number.isFinite(playerId) || !Number.isFinite(gameId)) return new Response('Bad request', { status: 400 });

        const r = await pool.query(
            `SELECT * FROM sp_ensure_game_account($1,$2,$3,$4)`,
            [playerId, gameId, gameUsername ?? '', currency ?? 'VND']
        );
        const accountId = r.rows[0]?.account_id ?? null;
        return new Response(JSON.stringify({ ok: true, accountId }),
            { headers: { 'Content-Type': 'application/json' } });
    }),
    { body: t.Object({ gameId: t.Number(), gameUsername: t.Optional(t.String()), currency: t.Optional(t.String()) }) }
);

app.post('/api/wallets/:accountId?/deposit',
    authGuard(async ({ params, body, user, request }) => {
        const accountIdParam = Number(params.accountId);
        const {
            amount,
            refId,
            reason,
            gameId,
            partnerId
        } = body as {
            amount: number;
            refId?: string;
            reason: string;
            gameId?: number;
            partnerId?: number;
        };

        if (!(amount > 0)) return new Response('Bad request', { status: 400 });

        const meta = { source: 'cms', adminId: user.id, reason, ua: request.headers.get('user-agent') };

        // → Xác định đúng accountId
        const { accountId, gameId: gid, partnerId: pid } = await resolveAccountId(pool, {
            accountId: Number.isFinite(accountIdParam) ? accountIdParam : null,
            gameId: gameId ?? null,
            partnerId: partnerId ?? null
        });

        // Gọi SP (SP có thể không trả row)
        await pool.query(`SELECT sp_deposit($1,$2,$3,$4)`, [accountId, amount, refId ?? null, meta]);
        // console.log('Deposit called for accountId:', accountId, 'amount:', amount, 'refId:', refId);
        // Refetch số dư theo ví từng game
        const r2 = await pool.query(
            `SELECT balance AS balance_after
         FROM player_accounts
        WHERE player_id = $1 AND game_id = $2`,
            [accountId, gid]
        );
        // console.log('Deposit balance_after:', r2.rows?.[0]?.balance_after);
        return new Response(JSON.stringify({
            ok: true,
            accountId,
            gameId: gid,
            usernameGame: ug,
            balance_after: r2.rows?.[0]?.balance_after ?? null
        }), { headers: { 'Content-Type': 'application/json' } });
    }),
    {
        body: t.Object({
            amount: t.Number(),
            refId: t.Optional(t.String()),
            reason: t.String(),
            gameId: t.Optional(t.Number()),
            usernameGame: t.Optional(t.String()),
            partnerId: t.Optional(t.Number())
        })
    }
);

app.post('/api/wallets/:accountId?/withdraw',
    authGuard(async ({ params, body, user, request }) => {
        const accountIdParam = Number(params.accountId);
        const {
            amount,
            refId,
            reason,
            gameId,
            partnerId
        } = body as {
            amount: number;
            refId?: string;
            reason: string;
            gameId?: number;
            partnerId?: number;
        };

        if (!(amount > 0)) return new Response('Bad request', { status: 400 });

        const meta = { source: 'cms', adminId: user.id, reason, ua: request.headers.get('user-agent') };

        const { accountId, gameId: gid, partnerId: pid } = await resolveAccountId(pool, {
            accountId: Number.isFinite(accountIdParam) ? accountIdParam : null,
            gameId,
            partnerId: partnerId ?? null
        });

        // Nếu SP withdraw cũng không trả row → gọi kiểu nhẹ và refetch
        await pool.query(`SELECT sp_withdraw($1,$2,$3,$4)`, [accountId, amount, refId ?? null, meta]);

        const r2 = await pool.query(
            `SELECT balance AS balance_after
         FROM player_accounts
        WHERE player_id = $1 AND game_id = $2`,
            [accountId, gid]
        );

        return new Response(JSON.stringify({
            ok: true,
            accountId,
            gameId: gid,
            balance_after: r2.rows?.[0]?.balance_after ?? null
        }), { headers: { 'Content-Type': 'application/json' } });
    }),
    {
        body: t.Object({
            amount: t.Number(),
            refId: t.Optional(t.String()),
            reason: t.String(),
            gameId: t.Optional(t.Number()),
            usernameGame: t.Optional(t.String()),
            partnerId: t.Optional(t.Number())
        })
    }
);

app.get('/api/wallets/:accountId/ledger', authGuard(async ({ params, query }) => {
    const accountId = Number(params.accountId);
    const page = Math.max(1, Number((query as any).page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number((query as any).pageSize ?? 20)));
    const offset = (page - 1) * pageSize;

    const refType = (query as any).refType?.toString(); // deposit|withdraw|bet|win|hold|release|bonus...
    const refId = (query as any).refId?.toString();
    const from = (query as any).from?.toString();
    const to = (query as any).to?.toString();

    const wh: string[] = ['account_id = $1']; const p: any[] = [accountId];
    if (refType) { p.push(refType); wh.push(`ref_type = $${p.length}`); }
    if (refId) { p.push(refId); wh.push(`ref_id = $${p.length}`); }
    if (from) { p.push(new Date(from)); wh.push(`created_at >= $${p.length}`); }
    if (to) { p.push(new Date(to)); wh.push(`created_at <= $${p.length}`); }
    const where = 'WHERE ' + wh.join(' AND ');

    const total = (await pool.query(`SELECT COUNT(*)::int AS total FROM account_ledger ${where}`, p)).rows[0].total;
    const rows = (await pool.query(
        `SELECT id, ref_type, ref_id, amount, balance_after, meta, created_at
     FROM account_ledger ${where}
     ORDER BY created_at DESC
     LIMIT $${p.length + 1} OFFSET $${p.length + 2}`, [...p, pageSize, offset]
    )).rows;

    return new Response(JSON.stringify({ data: rows, total, page, pageSize }),
        { headers: { 'Content-Type': 'application/json' } });
}));

app.patch('/api/players/:playerId/active',
    authGuard(async ({ params, body, user }) => {
        const playerId = Number(params.playerId);
        const { active } = body as { active: boolean };
        if (!Number.isFinite(playerId)) return new Response('Bad id', { status: 400 });

        await pool.query(`UPDATE players SET active=$1 WHERE id=$2`, [!!active, playerId]);
        // (tùy chọn) ghi audit Mongo
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }),
    { body: t.Object({ active: t.Boolean() }) }
);

// Reset freespin cho player
app.post('/api/players/:playerId/resetspin',
    authGuard(async ({ params, body, user }) => {
        const playerId = Number(params.playerId);
        const { gameId } = body as { gameId: number };
        
        if (!Number.isFinite(playerId)) return new Response('Bad player id', { status: 400 });
        if (!Number.isFinite(gameId)) return new Response('Bad game id', { status: 400 });

        // Kiểm tra player có tồn tại không
        const playerCheck = await pool.query(`SELECT id FROM players WHERE id=$1`, [playerId]);
        if (!playerCheck.rowCount) return new Response('Player not found', { status: 404 });

        // Reset freespin về 0 cho game cụ thể
        await pool.query(
            `UPDATE player_accounts SET free_spins = 0 WHERE player_id = $1 AND game_id = $2`,
            [playerId, gameId]
        );

        // Ghi log audit
        console.log(`Admin ${user.username} reset freespin for player ${playerId}, game ${gameId}`);

        return new Response(JSON.stringify({ 
            ok: true, 
            message: `Reset freespin thành công cho player ${playerId}, game ${gameId}` 
        }), { headers: { 'Content-Type': 'application/json' } });
    }),
    { body: t.Object({ gameId: t.Number() }) }
);

// Set freespin cho player
app.post('/api/players/:playerId/setspin',
    authGuard(async ({ params, body, user }) => {
        const playerId = Number(params.playerId);
        const { gameId, freeSpins } = body as { gameId: number; freeSpins: number };
        
        if (!Number.isFinite(playerId)) return new Response('Bad player id', { status: 400 });
        if (!Number.isFinite(gameId)) return new Response('Bad game id', { status: 400 });
        if (!Number.isFinite(freeSpins) || freeSpins < 0) return new Response('Invalid freeSpins value', { status: 400 });

        // Kiểm tra player có tồn tại không
        const playerCheck = await pool.query(`SELECT id FROM players WHERE id=$1`, [playerId]);
        if (!playerCheck.rowCount) return new Response('Player not found', { status: 404 });

        // Đảm bảo player_accounts tồn tại cho game này
        const accountCheck = await pool.query(
            `SELECT id FROM player_accounts WHERE player_id = $1 AND game_id = $2`,
            [playerId, gameId]
        );

        if (!accountCheck.rowCount) {
            // Tạo account nếu chưa có
            await pool.query(
                `INSERT INTO player_accounts (player_id, game_id, username, currency, balance, locked_balance, active, free_spins)
                 VALUES ($1, $2, '', 'VND', 0, 0, true, $3)`,
                [playerId, gameId, freeSpins]
            );
        } else {
            // Cập nhật freespin
            await pool.query(
                `UPDATE player_accounts SET free_spins = $1 WHERE player_id = $2 AND game_id = $3`,
                [freeSpins, playerId, gameId]
            );
        }

        // Ghi log audit
        console.log(`Admin ${user.username} set freespin to ${freeSpins} for player ${playerId}, game ${gameId}`);

        return new Response(JSON.stringify({ 
            ok: true, 
            message: `Set freespin thành công: ${freeSpins} cho player ${playerId}, game ${gameId}` 
        }), { headers: { 'Content-Type': 'application/json' } });
    }),
    { body: t.Object({ gameId: t.Number(), freeSpins: t.Number() }) }
);



// (Tùy chọn) Update balance nhanh khi demo
app.patch(
    '/api/players/partner-users/:id/balance',
    authGuard(async ({ params, body }) => {
        const id = Number(params.id);
        const { balance } = body as { balance: number };
        if (!Number.isFinite(id) || typeof balance !== 'number')
            return new Response('Bad request', { status: 400 });

        const r = await pool.query(
            `UPDATE partner_users SET balance = $1 WHERE id = $2 RETURNING id, partner_id, username, balance, created_at`,
            [balance, id]
        );
        if (!r.rowCount) return new Response('Not found', { status: 404 });

        return new Response(JSON.stringify(r.rows[0]), {
            headers: { 'Content-Type': 'application/json' }
        });
    }),
    { body: t.Object({ balance: t.Number() }) }
);

// ------------ LOG Router--------

// -------------------- LOGS ROUTES --------------------
app.get(
    '/api/logs/game',
    authGuard(async ({ query }) => {
        // đảm bảo kết nối (an toàn khi chạy ở dev/hot-reload)
        // await connectMongo();
        console.log('✅ Mongo ready');
        const col = mongoDb.collection('logs.game');

        // pagination
        const page = Math.max(1, Number((query as any).page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Number((query as any).pageSize ?? 20)));
        const skip = (page - 1) * pageSize;

        // filters
        const q = (query as any).q?.toString().trim() ?? '';            // search username
        const partnerId = (query as any).partnerId ? Number((query as any).partnerId) : null;
        const gameId = (query as any).gameId ? Number((query as any).gameId) : null;

        // date range (ISO hoặc millis). Ví dụ: ?dateFrom=2025-08-15T00:00:00Z&dateTo=2025-08-16T00:00:00Z
        const dateFromRaw = (query as any).dateFrom?.toString();
        const dateToRaw = (query as any).dateTo?.toString();

        const filter: any = {};
        if (q) filter.username = { $regex: q, $options: 'i' };
        if (Number.isFinite(partnerId)) filter.pid = partnerId;
        if (Number.isFinite(gameId)) filter.gid = gameId;

        if (dateFromRaw || dateToRaw) {
            filter.t = {};
            if (dateFromRaw) filter.t.$gte = new Date(dateFromRaw);
            if (dateToRaw) filter.t.$lte = new Date(dateToRaw);
        }

        // sort
        const sort = (query as any).sort?.toString() ?? 't.desc';
        const sortSpec =
            sort === 't.asc' ? { t: 1 } :
                sort === 'win.desc' ? { win: -1 } :
                    sort === 'win.asc' ? { win: 1 } :
                        sort === 'bet.desc' ? { bet: -1 } :
                            sort === 'bet.asc' ? { bet: 1 } :
                                { t: -1 }; // default: mới nhất trước

        const [total, docs] = await Promise.all([
            col.countDocuments(filter),
            col.find(filter).sort(sortSpec).skip(skip).limit(pageSize).toArray()
        ]);

        // log mẫu bản ghi mới nhất để kiểm tra cấu trúc
        if (docs && docs.length > 0) {
            console.log('[logs.game] sample doc:', docs[0]);
        } else {
            console.log('[logs.game] no docs matched filter', filter);
        }

        // map _id -> string để FE làm rowKey
        const data = docs.map(d => ({ ...d, _id: d._id.toString() }));

        return new Response(JSON.stringify({ data, total, page, pageSize }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }),
    {
        query: t.Object({
            q: t.Optional(t.String()),
            partnerId: t.Optional(t.Numeric()),
            gameId: t.Optional(t.Numeric()),
            page: t.Optional(t.Numeric()),
            pageSize: t.Optional(t.Numeric()),
            sort: t.Optional(
                t.Union([
                    t.Literal('t.desc'),
                    t.Literal('t.asc'),
                    t.Literal('win.desc'),
                    t.Literal('win.asc'),
                    t.Literal('bet.desc'),
                    t.Literal('bet.asc')
                ])
            ),
            dateFrom: t.Optional(t.String()),
            dateTo: t.Optional(t.String())
        })
    }
);

await connectMongo(); // đảm bảo Mongo sẵn sàng trước khi nhận request
console.log('✅ Mongo ready');

app.listen({ port: 3300, hostname: '0.0.0.0' })

console.log(`✅ API running at http://localhost:${process.env.PORT || 3300}`);

function parseCookie(c: string) {
    return Object.fromEntries(
        c.split(/; */).filter(Boolean).map(v => {
            const i = v.indexOf('=');
            return [decodeURIComponent(v.slice(0, i)), decodeURIComponent(v.slice(i + 1))];
        })
    );
}

async function sha256(input: string) {
    const enc = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
