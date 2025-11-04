// src/types/game.ts
export type GameCategory = 'slot' | 'table' | 'lottery';
export type Volatility = 'low' | 'medium' | 'high';
export type GameStatus = 'active' | 'inactive' | 'draft';

export interface GameRow {
    id: number;
    code: string;
    name: string;
    category: GameCategory;
    rtp: number;
    volatility: Volatility;
    status: GameStatus;
    icon_url: string | null;
    desc_short: string | null;
    created_at: string;
    updated_at: string;
    config: any; // JSONB
}

export function deepMerge<T>(base: T, patch: Partial<T>): T {
    if (Array.isArray(base) || Array.isArray(patch)) return (patch as any) ?? (base as any);
    if (typeof base === 'object' && base && typeof patch === 'object' && patch) {
        const out: any = { ...base };
        for (const k of Object.keys(patch)) {
            const v: any = (patch as any)[k];
            out[k] = k in out ? deepMerge((out as any)[k], v) : v;
        }
        return out;
    }
    return (patch as any) ?? (base as any);
}
