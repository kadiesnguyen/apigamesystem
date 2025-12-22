import { http } from '@/lib/http';

export type Game = {
    id: number;                            // bạn đã chốt INTEGER id
    code: string;
    name: string;
    category: "slot" | "table" | "lottery";
    rtp: number;
    config: Record<string, any>; // cấu hình trò chơi, có thể là JSON Schema hoặc các field tùy chỉnh
    volatility: "low" | "medium" | "high";
    status: "active" | "inactive" | "draft";
    icon_url?: string | null;
    updated_at: string;
};

export type Paged<T> = { data: T[]; total: number; page: number; pageSize: number };

export async function fetchGames(params: {
    q?: string;
    category?: Game["category"];
    status?: Game["status"];
    page?: number;
    pageSize?: number;
}) {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.category) search.set("category", params.category);
    if (params.status) search.set("status", params.status);
    search.set("page", String(params.page ?? 1));
    search.set("pageSize", String(params.pageSize ?? 10));

    const res = await http(`/api/games?${search.toString()}`);
    if (!res.ok) throw new Error("Fetch games failed");
    return (await res.json()) as Paged<Game>;
}

export async function fetchGame(id: number) {
    const res = await http(`/api/games/${id}`);
    if (!res.ok) throw new Error("Game not found");
    return (await res.json()) as Game;
}

export async function fetchGameConfig(gameId: number) {
    const r = await http(`/api/games/${gameId}/config`);
    console.log("fetchGameConfig", gameId, r);
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<{ id: number; code: string; rtp: number; config: any }>;
}

export async function updateGameConfig(gameId: number, payload: {
    rtp?: number;
    volatility?: "low" | "medium" | "high";
    status?: "active" | "inactive" | "draft";
    config?: any;
}) {
    const r = await http(`/api/games/${gameId}/config`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

/** (optional) effective + override theo partner */
export async function fetchEffectiveConfig(partnerId: number, gameId: number) {
    const r = await http(`/api/partners/${partnerId}/games/${gameId}/config`);
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<{ version: string; config: any; rtp: number }>;
}
export async function updatePartnerOverride(partnerId: number, gameId: number, payload: {
    enabled?: boolean;
    rtp_override?: number;
    config?: any;
}) {
    const r = await http(`/api/partners/${partnerId}/games/${gameId}/config`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}
export async function invalidateEffective(partnerId: number, gameId: number) {
    await http(`/api/partners/${partnerId}/games/${gameId}/config/invalidate`, { method: "POST" });
}

export type CreateGamePayload = {
    id: number;
    code: string;
    name: string;
    category: Game["category"];
    rtp: number;
    volatility: Game["volatility"];
    status: Game["status"];
    iconUrl?: string;
    descShort?: string;
    config?: Record<string, any>;
    partners?: Array<{
        partnerId: number;
        enabled?: boolean;
        rtp_override?: number;
        sort_order?: number;
        config?: Record<string, any>;
    }>;
};

export async function createGame(payload: CreateGamePayload) {
    const res = await http(`/api/games`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res.json() as Promise<{ ok: boolean; game: Game }>;
}