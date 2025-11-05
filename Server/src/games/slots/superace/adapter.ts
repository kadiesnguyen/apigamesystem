// src/games/slots/superace/adapter.ts
import { GameAdapter } from '../../../config/types';

export type SuperAceRuntime = {
    scatterChance: number;
    goldenChance: number;
    redWildChance: number;
    payoutTable: number[][];
    noWinRate: number;
};

export const SuperAceAdapter: GameAdapter<SuperAceRuntime> = {
    gameId: 1001,
    name: 'SuperAce',

    defaults() {
        return {
            scatterChance: 0.03,
            goldenChance: 0.15,
            redWildChance: 0.05,
            payoutTable: [
                [0, 0, 0, 0.2, 0.6, 1],
                [0, 0, 0, 0.3, 0.9, 1.5],
                [0, 0, 0, 0.4, 1.2, 2],
                [0, 0, 0, 0.5, 1.5, 2.5],
                [0, 0, 0, 0.1, 0.3, 0.5],
                [0, 0, 0, 0.05, 0.15, 0.25],
                [0, 0, 0, 0.05, 0.15, 0.25],
                [0, 0, 0, 0.1, 0.3, 0.5],
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
            redWildChance: Math.max(0, Math.min(1, Number(raw.redWildChance))),
            payoutTable: raw.payoutTable,
            noWinRate: Math.max(0, Math.min(1, Number(raw.noWinRate ?? 0)))
        };
    }
};
