// src/games/slots/mahjongway2/MahjongWay2Logic.ts
import type { Pool } from 'pg';
import type { Db, Collection } from 'mongodb';
import { GridModel, type StepRoundPayload, type CopyEvent } from './gridmodel';
import { MahjongWay2Config } from './config';
import { UserBalanceService } from '../../services/UserBalanceService';d
import { ConfigManager } from '../../../config/ConfigManager';
import type { MahjongWay2Runtime } from './adapter';
import {
    GameLogService,
    type GameLogQuery,
    type SpinLogView,
} from '../../../services/GameLogService';

export interface SpinResult {
    grid: any[][];
    rounds: StepRoundPayload[];
    winLines: { c: number; r: number }[];
    totalWin: number;
    freeSpinsLeft: number;
    usingFreeSpin: boolean;
}

export class MahjongWay2Logic {
    private spinsCol: Collection;
    private gameLogService: GameLogService;
d
    constructor(private db: Pool, private mongoDb: Db) {
        this.spinsCol = this.mongoDb.collection('logs.game');
        this.gameLogService = new GameLogService(this.mongoDb);
    }

    async spin(userId: number, bet: number): Promise<any> {
        const balanceService = new UserBalanceService(this.db);
        const res = await this.db.query<{ free_spins: number }>(
            `SELECT free_spins FROM player_accounts WHERE player_id = $1 AND game_id = $2`, [userId, MahjongWay2Config.GameId]
        );

        if (!Number.isFinite(bet) || bet <= 0 || bet > 10000) {
            return {
                success: false,
                error: 'Số tiền cược không hợp lệ'
            };
        }

        let freeSpins = res.rows[0]?.free_spins ?? 0;
        if (freeSpins < 0) freeSpins = 0;

        const isFreeSpin = freeSpins > 0;

        let balanceBefore = await balanceService.getBalance(userId, Number(MahjongWay2Config.GameId));
        if (!isFreeSpin) {
            if (balanceBefore < bet) {
                return {
                    success: false,
                    error: '01'
                };
            }

            const deductSuccess = await balanceService.decreaseBalance(userId, Number(MahjongWay2Config.GameId), bet);
            if (!deductSuccess) {
                return {
                    success: false,
                    error: '01'
                };
            }
        } else {
            const client = await this.db.connect();
            try {
                await client.query('BEGIN');

                const currentRes = await client.query<{ free_spins: number }>(
                    `SELECT free_spins FROM player_accounts WHERE player_id = $1 AND game_id = $2 FOR UPDATE`,
                    [userId, Number(MahjongWay2Config.GameId)]
                );

                const currentFreeSpins = currentRes.rows[0]?.free_spins ?? 0;
                if (currentFreeSpins < 1) {
                    await client.query('ROLLBACK');
                    return {
                        success: false,
                        error: 'Không có free spins'
                    };
                }

                const updateResult = await client.query<{ free_spins: number }>(
                    `UPDATE player_accounts SET free_spins = free_spins - 1 
                     WHERE player_id = $1 AND game_id = $2 
                     RETURNING free_spins`,
                    [userId, Number(MahjongWay2Config.GameId)]
                );

                await client.query('COMMIT');

                freeSpins = updateResult.rows[0].free_spins;
                console.log(`🌀 Using FREE spin for user ${userId}: ${currentFreeSpins} -> ${freeSpins}`);

            } catch (error) {
                await client.query('ROLLBACK');
                console.error('Free spin transaction failed:', error);
                return {
                    success: false,
                    error: 'Lỗi khi trừ free spin'
                };
            } finally {
                client.release();
            }
        }

        const gameId = Number(MahjongWay2Config.GameId);
        const prof = await this.getProfile(userId, gameId);
        const partnerId = prof.partner_id ?? 0;
        const { cfg, ver } = await ConfigManager.I.getConfigWithVer<MahjongWay2Runtime>(gameId, 0);

        console.log(`\n🔧 CONFIG LOADED FROM REDIS:`);
        console.log(`Game ID: ${gameId}`);
        console.log(`Config Version: ${ver}`);
        console.log(`Payout Table:`, cfg.payoutTable);
        console.log(`Scatter Chance: ${cfg.scatterChance}`);
        console.log(`Golden Chance: ${cfg.goldenChance}`);
        console.log(`No Win Rate: ${cfg.noWinRate}`);

        const model = new GridModel(
            MahjongWay2Config.Cols,
            MahjongWay2Config.RowsPerColumn,
            cfg.payoutTable,
            cfg.scatterChance,
            cfg.goldenChance,
            cfg.noWinRate
        );

        const spinBet = bet;

        console.log(`\n🎰 SPIN PARAMETERS:`);
        console.log(`User ID: ${userId}`);
        console.log(`Bet: ${bet}`);
        console.log(`Spin Bet: ${spinBet}`);
        console.log(`Is Free Spin: ${isFreeSpin}`);
        console.log(`Free Spins Left: ${freeSpins}`);

        const { rounds, totalWin } = model.spinWithCascadeAuthoritative(spinBet, isFreeSpin);

        const firstGrid = rounds.at(0)?.grid || model.data;
        const lastGrid = rounds.at(-1)?.grid || model.data;
        const scatters = lastGrid.flat().filter(c => c.isScatter).length;
        const initialScatters = firstGrid.flat().filter(c => c.isScatter).length;
        console.log(`User ${userId} spun: ${initialScatters} initial scatters → ${scatters} final scatters (after cascade)`);

        let freeMeta: { triggered: boolean; awarded: number } = { triggered: false, awarded: 0 };
        if (scatters >= 3) {
            const baseAward = MahjongWay2Config.FreeSpinAward ?? 0;
            const extraAwardPerScatter = MahjongWay2Config.ExtraFreeSpinsPerScatter ?? 0;
            const extraScatters = Math.max(0, scatters - 3);
            const award = baseAward + extraScatters * extraAwardPerScatter;
            freeMeta = { triggered: true, awarded: award };
            console.log(`🎯 Scatter bonus triggered! Awarding ${award} free spins (scatters=${scatters}) to user ${userId}`);

            const client = await this.db.connect();
            try {
                await client.query('BEGIN');

                const upd = await client.query<{ free_spins: number }>(
                    `UPDATE player_accounts SET free_spins = free_spins + $1 
                     WHERE player_id = $2 AND game_id = $3 
                     RETURNING free_spins`,
                    [award, userId, Number(MahjongWay2Config.GameId)]
                );

                await client.query('COMMIT');

                freeSpins = upd.rows[0]?.free_spins ?? freeSpins + award;
                console.log(`✅ Free spins updated: ${freeSpins} total for user ${userId}`);

            } catch (error) {
                await client.query('ROLLBACK');
                console.error('Scatter bonus transaction failed:', error);
                freeSpins += award;
                console.log(`⚠️ Fallback: Free spins updated locally: ${freeSpins}`);
            } finally {
                client.release();
            }
        } else {
            console.log(`❌ Not enough scatters for bonus: ${scatters}/3`);
        }

        if (totalWin > 0) {
            await balanceService.increaseBalance(userId, Number(MahjongWay2Config.GameId), totalWin);
            console.log(`🎉 User ${userId} won ${totalWin} coins!`)
        }

        const balanceAfter = await balanceService.getBalance(userId, Number(MahjongWay2Config.GameId));

        try {
            await this.spinsCol.insertOne({
                t: new Date(),
                gid: Number(MahjongWay2Config.GameId),
                pid: partnerId,
                uid: userId,
                bet,
                username: prof.username,
                win: totalWin,
                free: isFreeSpin,
                fsl: freeSpins,
                cfgv: ver,
                bal_b: balanceBefore,
                bal_a: balanceAfter
            });
        } catch (e) {
            console.error('[spin-log] insert failed:', e);
        }

        type PackedCell = { i: number; t: 'n' | 'g' | 'w' | 's'; wt?: 'blue' };
        const packCell = (cell: any): PackedCell => {
            if (!cell) return { i: -1, t: 'n' } as PackedCell;
            const t: 'n' | 'g' | 'w' | 's' = cell.isWild ? 'w' : (cell.isScatter ? 's' : (cell.isGolden ? 'g' : 'n'));
            let iconId: number;
            if (cell.isWild) {
                iconId = 0;
            } else if (cell.isScatter) {
                iconId = 1;
            } else if (typeof cell.idx === 'number' && cell.idx >= 0) {
                iconId = cell.idx + 2;
            } else {
                iconId = -1;
            }
            const out: PackedCell = { i: iconId, t };
            if (t === 'w') out.wt = cell.wildType ?? 'blue';
            return out;
        };
        const rowsPerColumn = MahjongWay2Config.RowsPerColumn ?? [4, 5, 5, 5, 4];
        const maxRows = Math.max(...rowsPerColumn);
        const rowsAbove = MahjongWay2Config.RowsAbove ?? 0;
        
        // Giữ nguyên row position từ engine - client sẽ render row 0 ở dưới cùng
        // Không cần transform vì grid không được reverse
        const toClientRow = (engineRow: number, _colIndex?: number): number => {
            return engineRow;
        };
        
        // Pack grid với số hàng khác nhau cho mỗi cột
        // KHÔNG reverse - giữ nguyên thứ tự từ engine (row 0 = bottom)
        // Client sẽ render row 0 ở dưới cùng
        const packVisibleGrid = (grid: any[][]): PackedCell[][] =>
            (grid ?? []).map((col, colIndex) => {
                const safeCol = col ?? [];
                const rowCount = rowsPerColumn[colIndex] ?? maxRows;
                // Chỉ lấy số hàng tương ứng với cột đó
                const limitedCol = safeCol.slice(0, rowCount);
                // Giữ nguyên thứ tự từ engine (row 0 = bottom)
                return limitedCol.map(packCell);
            });
        const packAboveGrid = (grid: any[][]): PackedCell[][] =>
            (grid ?? []).map((col, colIndex) => {
                const safeCol = col ?? [];
                const limit = Math.max(0, rowsAbove);
                const effective = limit > 0 ? safeCol.slice(0, limit) : [];
                return effective.map(packCell);
            });

        const fallbackGrid = model.getVisibleGridSnapshot();
        const fallbackAbove = model.getAboveBufferSnapshot();
        const transformedRounds = (rounds.length > 0 ? rounds : [{
            index: 0,
            grid: fallbackGrid,
            aboveGrid: fallbackAbove,
            winCells: [],
            clearedCells: [],
            stepWin: 0,
            multiplier: isFreeSpin ? 2 : 1,
            flipEvents: [],
            copyEvents: [],
            nextGrid: fallbackGrid,
            nextAboveGrid: fallbackAbove,
            hasNext: false,
        }]).map((r) => {
            const flipMap = new Map<string, { wildType: 'blue' }>();
            for (const ev of r.flipEvents || []) {
                flipMap.set(`${ev.c},${ev.r}`, { wildType: ev.wildType });
            }

            const classifyPositions = (positions: { c: number; r: number }[]) => {
                const normal: { c: number; r: number }[] = [];
                const wild: { c: number; r: number; wildType: 'blue' }[] = [];
                for (const { c, r: row } of positions) {
                    const key = `${c},${row}`;
                    const startCell = r.grid?.[c]?.[row];
                    const flipped = flipMap.get(key);
                    const alreadyWild = Boolean(startCell?.isWild);
                    const clientRow = toClientRow(row);
                    if (alreadyWild || flipped) {
                        wild.push({
                            c,
                            r: clientRow,
                            wildType: (flipped?.wildType ?? startCell?.wildType ?? 'blue') as 'blue'
                        });
                    } else {
                        normal.push({ c, r: clientRow });
                    }
                }
                return { normal, wild };
            };

            const winData = classifyPositions(r.winCells || []);
            const clearData = classifyPositions(r.clearedCells || []);
            const flips = (r.flipEvents || []).map(ev => ({
                c: ev.c,
                r: toClientRow(ev.r),
                wildType: ev.wildType
            }));
            const copies = (r.copyEvents || []).map((ev: CopyEvent) => ({
                c: ev.c,
                r: toClientRow(ev.r),
                sourcePos: {
                    c: ev.sourcePos.c,
                    r: toClientRow(ev.sourcePos.r)
                },
                wildType: ev.wildType
            }));

            if (copies.length > 0) {
                console.log(`🎭 Round ${r.index} - Copy Events Data:`);
                console.log(`   Count: ${copies.length}`);
                copies.forEach((copy, i) => {
                    console.log(`   Copy ${i + 1}: from (${copy.sourcePos.c},${copy.sourcePos.r}) to (${copy.c},${copy.r})`);
                });
            }
            const lastRound = r.hasNext ? undefined : { keepWild: true, clearOnlyNormals: true, dropNextGridThenEnd: true };
            return {
                index: r.index,
                grid: packVisibleGrid(r.grid),
                above: packAboveGrid(r.aboveGrid ?? []),
                win: winData,
                clear: clearData,
                flips,
                copies,
                stepWin: r.stepWin,
                multiplier: r.multiplier,
                nextGrid: packVisibleGrid(r.nextGrid),
                nextAbove: packAboveGrid(r.nextAboveGrid ?? []),
                hasNext: r.hasNext,
                ...(lastRound ? { lastRound } : {}),
            };
        });

        console.log(`\n📊 SPIN RESULT: Total Win: ${totalWin}, Rounds: ${transformedRounds.length}`);

        return {
            success: true,
            usingFreeSpin: isFreeSpin,
            freeSpinsLeft: freeSpins,
            totalWin,
            free: freeMeta,
            rounds: transformedRounds,
            // Thông tin cấu trúc grid cho client biết số hàng mỗi cột
            gridConfig: {
                cols: MahjongWay2Config.Cols,
                rowsPerColumn: rowsPerColumn,
                maxRows: maxRows,
            },
        };
    }

    async getUserLogs(
        userId: number,
        options?: Pick<GameLogQuery, 'limit' | 'skip' | 'sort' | 'dateFrom' | 'dateTo' | 'partnerId'>
    ): Promise<SpinLogView[]> {
        return this.gameLogService.fetchLogs({
            userId,
            gameId: Number(MahjongWay2Config.GameId),
            ...options,
        });
    }

    async getProfile(userId: number, gameId: number): Promise<any> {
        const res = await this.db.query(
            `SELECT player_id, username, partner_id, created_at FROM player_accounts WHERE player_id = $1 AND game_id = $2`,
            [userId, gameId]
        );
        if (res.rowCount === 0) {
            throw new Error('Tài khoản không tồn tại');
        }
        return res.rows[0];
    }
}

