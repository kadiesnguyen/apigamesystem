// src/games/slots/mahjongway/adapter.ts
import type { GameAdapter } from '../../../config/types';

export type MahjongWayRuntime = {
    scatterChance: number;
    goldenChance: number;
    payoutTable: number[][];
    noWinRate: number;
};

export const MahjongWayAdapter: GameAdapter<MahjongWayRuntime> = {
    gameId: 1003,
    name: 'MahjongWay',

    defaults() {
        return {
            scatterChance: 0.03,
            goldenChance: 0.15,
            payoutTable: [
                [12, 60, 100, 0, 0, 0],  // Fa
                [10, 40, 80, 0, 0, 0],   // Zhong
                [8, 20, 60, 0, 0, 0],    // TileBlue
                [6, 15, 40, 0, 0, 0],    // TileWan
                [4, 10, 20, 0, 0, 0],    // Dots4
                [3, 10, 20, 0, 0, 0],    // Bamboo4
                [2, 5, 10, 0, 0, 0],     // Dots1
                [2, 5, 10, 0, 0, 0],     // Bamboo2
            ],
            noWinRate: 0,
        };
    },

    merge(base: any, override?: any) {
        const d = this.defaults();
        // shallow merge từng nhánh cần thiết; nếu có nested sâu, chỉnh theo nhu cầu
        return {
            ...d,
            ...(base || {}),
            ...(override || {}),
            payoutTable: (override?.payoutTable ?? base?.payoutTable) ?? d.payoutTable,
        };
    },

    validate(raw: any) {
        if (!raw) throw new Error('Empty config');
        if (!Array.isArray(raw.payoutTable) || raw.payoutTable.length !== 8) {
            throw new Error('payoutTable must have 8 rows (symbols)');
        }
        if (typeof raw.noWinRate !== 'number' || raw.noWinRate < 0 || raw.noWinRate > 1) {
            throw new Error('noWinRate must be between 0..1');
        }
    },

    toRuntime(raw: any) {
        // có thể cast/đặt phạm vi, clamp
        return {
            scatterChance: Math.max(0, Math.min(1, Number(raw.scatterChance))),
            goldenChance: Math.max(0, Math.min(1, Number(raw.goldenChance))),
            payoutTable: raw.payoutTable,
            noWinRate: Math.max(0, Math.min(1, Number(raw.noWinRate ?? 0)))
        };
    }
};