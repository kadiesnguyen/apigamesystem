// src/services/players.ts
import { http } from '@/lib/http';

// ===== Types cho list =====
export type PlayerRow = {
    id: number;
    partner_id: number;
    username: string;
    balance: number;     // Tổng số dư tất cả các ví
    created_at: string;  // ISO
};

export type PlayerQuery = {
    page?: number;
    pageSize?: number;
    q?: string;
    partnerId?: number;
    sort?: 'id.asc' | 'id.desc' | 'created_at.asc' | 'created_at.desc' | string;
};

export type PagedResult<T> = {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
};

// ===== Types cho detail =====
export type Player = {
    id: number;
    partner_id: number;
    username: string;
    active: boolean;
    created_at: string;
};

export type WalletRow = {
    account_id: number;
    game_id: number;
    username: string;
    currency: string;
    balance: number | string;
    locked_balance: number | string;
    free_spins: number | string;
    active: boolean;
    created_at: string;
};

export type PlayerResp = {
    player: Player;
    wallets: WalletRow[];
};

export type LedgerRow = {
    id: number;
    ref_type: string;
    ref_id: string | null;
    amount: number | string;
    balance_after: number | string;
    meta: any;
    created_at: string;
};

export type LedgerResp = {
    data: LedgerRow[];
    total: number;
    page: number;
    pageSize: number;
};

// ===== LIST PLAYERS =====
export async function fetchPlayers(params: PlayerQuery = {}): Promise<PagedResult<PlayerRow>> {
    const url = new URL(`/api/players`, window.location.origin);
    Object.entries({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        q: params.q ?? '',
        partnerId: params.partnerId ?? '',
        sort: params.sort ?? 'id.asc',
    }).forEach(([k, v]) => v !== '' && url.searchParams.set(k, String(v)));
    // console.log("Fetching players:", url.toString());
    const res = await http(url.pathname + url.search);
    // console.log("Fetching players response:", res);
    if (!res.ok) throw new Error(`fetchPlayers failed: ${res.status}`);
    const data = await res.json();
    console.log("Fetched players data:", data);
    // giả sử mỗi row có mảng wallets: { balance, locked_balance }
    data.data = data.data.map((row: any) => {
        const wallets = row.wallets ?? [];
        const totalBalance = wallets.reduce((s: number, w: any) => s + Number(w.balance || 0), 0);
        const totalLocked = wallets.reduce((s: number, w: any) => s + Number(w.locked_balance || 0), 0);
        return { ...row, totalBalance, totalLocked };
    });

    return data;
}

// ===== PLAYER DETAIL =====
export async function fetchPlayer(playerId: number): Promise<PlayerResp> {
    const res = await http(`/api/players/${playerId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function setPlayerActive(playerId: number, active: boolean): Promise<void> {
    const res = await http(`/api/players/${playerId}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
    });
    if (!res.ok) throw new Error(await res.text());
}

// ===== WALLETS =====
export async function ensureGameWallet(
    playerId: number,
    payload: { gameId: number; gameUsername?: string; currency?: string }
): Promise<{ ok: true; accountId: number | null }> {
    const res = await http(`/api/players/${playerId}/wallets/ensure`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function deposit(aid: number, body: any) {
    return await http(`/api/wallets/${aid}/deposit`, {
        method: "POST",
        body: JSON.stringify(body),
    });
}
export async function withdraw(aid: number, body: any) {
    return await http(`/api/wallets/${aid}/withdraw`, {
        method: "POST",
        body: JSON.stringify(body),
    });
}
// ===== LEDGER =====
export async function fetchLedger(
    accountId: number,
    params: { page?: number; pageSize?: number; refType?: string; refId?: string; from?: string; to?: string } = {}
): Promise<LedgerResp> {
    const url = new URL(`/api/wallets/${accountId}/ledger`, window.location.origin);
    Object.entries({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        refType: params.refType ?? '',
        refId: params.refId ?? '',
        from: params.from ?? '',
        to: params.to ?? '',
    }).forEach(([k, v]) => v !== '' && url.searchParams.set(k, String(v)));

    const res = await http(url.pathname + url.search);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// ===== FREESPIN MANAGEMENT =====
export async function resetFreeSpin(playerId: number, gameId: number): Promise<{ ok: boolean; message: string }> {
    const res = await http(`/api/players/${playerId}/resetspin`, {
        method: 'POST',
        body: JSON.stringify({ gameId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function setFreeSpin(playerId: number, gameId: number, freeSpins: number): Promise<{ ok: boolean; message: string }> {
    const res = await http(`/api/players/${playerId}/setspin`, {
        method: 'POST',
        body: JSON.stringify({ gameId, freeSpins }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}