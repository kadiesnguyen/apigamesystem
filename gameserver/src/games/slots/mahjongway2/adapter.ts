// src/games/slots/mahjongway2/adapter.ts
import type { GameAdapter } from '../../../config/types';

export type MahjongWay2Runtime = {
    scatterChance: number;
    goldenChance: number;
    payoutTable: number[][];
    noWinRate: number;
};

export const MahjongWay2Adapter: GameAdapter<MahjongWay2Runtime> = {
    gameId: 1002,
    name: 'MahjongWay2',

    defaults() {
        return {
            scatterChance: 0.03,
            goldenChance: 0.15,
            payoutTable: [
                [12, 60, 100, 0, 0, 0],
                [10, 40, 80, 0, 0, 0],
                [8, 20, 60, 0, 0, 0],
                [6, 15, 40, 0, 0, 0],
                [4, 10, 20, 0, 0, 0],
                [3, 10, 20, 0, 0, 0],
                [2, 5, 10, 0, 0, 0],
                [2, 5, 10, 0, 0, 0],
            ],
            noWinRate: 0,
        };
    },

    merge(base: any, override?: any) {
        const d = this.defaults();
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
        return {
            scatterChance: Math.max(0, Math.min(1, Number(raw.scatterChance))),
            goldenChance: Math.max(0, Math.min(1, Number(raw.goldenChance))),
            payoutTable: raw.payoutTable,
            noWinRate: Math.max(0, Math.min(1, Number(raw.noWinRate ?? 0)))
        };
    }
};

