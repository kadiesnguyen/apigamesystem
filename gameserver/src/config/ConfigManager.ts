// src/config/ConfigManager.ts
import Redis from 'ioredis';
import type { Pool } from 'pg';
import { GameIdNum, GameRegistry, toNumGameId } from './types';

// Pub/Sub & Keys
const CH = { invalidate: 'cfg.invalidate', warmed: 'cfg.warmed' };
const KEYS = {
    eff: (gid: number, pid: number) => `game:${gid}:config:eff:${pid}`, // lưu RUNTIME
    ver: (gid: number, pid: number) => `game:${gid}:config:ver:${pid}`,
};
const memKey = (gid: number, pid: number) => `${gid}:${pid}`;

const DEFAULT_PARTNER = 0;

// Redis config
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT || 6379);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export class ConfigManager {
    private static _i: ConfigManager;
    static get I() { return (this._i ??= new ConfigManager()); }

    private r = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
    });
    private sub = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
    });
    private cache = new Map<string, { ver: number; runtime: any }>();
    private pg?: Pool; // <-- PG pool

    // gắn Pool ngay khi boot
    attachPg(pg: Pool) { this.pg = pg; return this; }

    private constructor() { this.init().catch(console.error); }

    private async init() {
        await this.sub.subscribe(CH.invalidate);
        this.sub.on('message', async (ch, raw) => {
            if (ch !== CH.invalidate) return;
            try {
                const { gameId, partnerId } = JSON.parse(raw);
                await this.refresh(toNumGameId(gameId), Number(partnerId ?? DEFAULT_PARTNER));
            } catch (e) { console.error('[CFG] invalid pubsub', raw, e); }
        });
        console.log('[CFG] listening', CH.invalidate);
    }

    // ĐỌC TỪ DB: bảng games(id, config jsonb)
    private async fetchRawFromDB(gameId: GameIdNum, _partnerId: number) {
        if (!this.pg) return { base: {}, override: {} };
        const sql = `SELECT config FROM games WHERE id = $1 LIMIT 1`;
        const r = await this.pg.query<{ config: any }>(sql, [gameId]);
        const base = r.rowCount ? (r.rows[0].config ?? {}) : {};
        return { base, override: {} }; // chưa dùng override theo partner
    }

    // build runtime + GHI Redis + RAM
    async refresh(gameId: GameIdNum, partnerId: number = DEFAULT_PARTNER) {
        const adapter = GameRegistry.get(gameId);
        const { base, override } = await this.fetchRawFromDB(gameId, partnerId);

        const merged = adapter.merge(base, override);
        adapter.validate(merged);
        const runtime = adapter.toRuntime(merged);

        const ver = Date.now();
        await this.r.multi()
            .set(KEYS.eff(gameId, partnerId), JSON.stringify(runtime)) // LƯU RUNTIME
            .set(KEYS.ver(gameId, partnerId), String(ver))
            .exec();

        this.cache.set(memKey(gameId, partnerId), { ver, runtime });
        await this.r.publish(CH.warmed, JSON.stringify({ gameId, partnerId, ver }));
        console.log(`[CFG] warmed g=${gameId} p=${partnerId} v=${ver}`);
    }

    async getConfigWithVer<T = any>(gameId: number | string, partnerId: number = DEFAULT_PARTNER)
        : Promise<{ ver: number; cfg: T }> {
        const gid = toNumGameId(gameId);
        const k = memKey(gid, partnerId);
        const cached = this.cache.get(k);
        const verStr = await this.r.get(KEYS.ver(gid, partnerId));
        const remoteVer = verStr ? Number(verStr) : 0;

        if (!cached || cached.ver < remoteVer) {
            const adapter = GameRegistry.get(gid);
            const txt = await this.r.get(KEYS.eff(gid, partnerId));
            let runtime: any;

            if (txt) {
                runtime = JSON.parse(txt); // eff đang là runtime
            } else {
                // Redis trống → đọc DB, merge, validate, seed Redis
                const { base, override } = await this.fetchRawFromDB(gid, partnerId);
                const merged = adapter.merge(base, override);
                adapter.validate(merged);
                runtime = adapter.toRuntime(merged);

                const firstVer = Date.now();
                await this.r.multi()
                    .set(KEYS.eff(gid, partnerId), JSON.stringify(runtime))
                    .set(KEYS.ver(gid, partnerId), String(firstVer))
                    .exec();
                await this.r.publish(CH.warmed, JSON.stringify({ gameId: gid, partnerId, ver: firstVer }));
                this.cache.set(k, { ver: firstVer, runtime });
                return { ver: firstVer, cfg: runtime };
            }

            const ver = remoteVer || Date.now();
            this.cache.set(k, { ver, runtime });
            return { ver, cfg: runtime };
        }
        return { ver: cached.ver, cfg: cached.runtime };
    }

    async getConfig<T = any>(gameId: number | string, partnerId: number = DEFAULT_PARTNER): Promise<T> {
        const { cfg } = await this.getConfigWithVer<T>(gameId, partnerId);
        return cfg;
    }

    // Seed theo GAME khi khởi động (partner mặc định 0)
    async bootstrapGameOnly(gameIds: Array<number | string>, partnerId: number = DEFAULT_PARTNER) {
        for (const gameId of gameIds) {
            try {
                const gid = toNumGameId(gameId);
                const has = await this.r.get(KEYS.ver(gid, partnerId));
                if (!has) await this.refresh(gid, partnerId);
            } catch (e) {
                console.error('[CFG] bootstrap failed', { gameId, partnerId }, e);
            }
        }
    }
}
