// src/services/logs.ts
import { http } from '@/lib/http';

// ===== Types =====
export type GameLogRow = {
    _id: string;
    t: string;           // ISO date string
    gid: number;         // game ID
    pid: number;         // partner ID
    uid: number;         // user ID
    bet: number;
    username: string;
    win: number;
    free: boolean;       // isFreeSpin
    fsl?: number;        // freeSpinsLeft
    cfgv?: number;       // config version
    bal_b: number;       // balance before
    bal_a: number;       // balance after
};

export type GameLogQuery = {
    page?: number;
    pageSize?: number;
    q?: string;          // search username
    partnerId?: number;
    gameId?: number;
    dateFrom?: string;   // ISO string
    dateTo?: string;     // ISO string
    sort?: 't.desc' | 't.asc' | 'win.desc' | 'win.asc' | 'bet.desc' | 'bet.asc';
};

export type PagedResult<T> = {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
};

// ===== FETCH GAME LOGS =====
export async function fetchGameLogs(params: GameLogQuery = {}): Promise<PagedResult<GameLogRow>> {
    const url = new URL(`/api/logs/game`, window.location.origin);
    
    Object.entries({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        q: params.q ?? '',
        partnerId: params.partnerId ?? '',
        gameId: params.gameId ?? '',
        dateFrom: params.dateFrom ?? '',
        dateTo: params.dateTo ?? '',
        sort: params.sort ?? 't.desc',
    }).forEach(([k, v]) => {
        if (v !== '' && v !== undefined && v !== null) {
            url.searchParams.set(k, String(v));
        }
    });

    const res = await http(url.pathname + url.search);
    if (!res.ok) throw new Error(`fetchGameLogs failed: ${res.status}`);
    
    const data = await res.json();
    return data;
}

