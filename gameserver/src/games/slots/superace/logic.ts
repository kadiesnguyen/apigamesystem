// src/games/slots/superace/SuperAceLogic.ts
import type { Pool } from 'pg';
import type { Db, Collection } from 'mongodb';
import { GridModel, type StepRoundPayload, type CopyEvent } from './gridmodel';
import { SuperAceConfig } from './config';
import { UserBalanceService } from '../../services/UserBalanceService';
import { ConfigManager } from '../../../config/ConfigManager';
import type { SuperAceRuntime } from './adapter';
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

export class SuperAceLogic {
    private spinsCol: Collection;
    private gameLogService: GameLogService;

    constructor(private db: Pool, private mongoDb: Db) {
        this.spinsCol = this.mongoDb.collection('logs.game');
        this.gameLogService = new GameLogService(this.mongoDb);
    }

    /** Thực hiện 1 lượt spin cho user */
    async spin(userId: number, bet: number): Promise<any> {
        const balanceService = new UserBalanceService(this.db);
        // console.log(`🌀 User ${userId} spins with bet=${bet}`);
        // console.log(userId, SuperAceConfig.GameId)
        const res = await this.db.query<{ free_spins: number }>(
            `SELECT free_spins FROM player_accounts WHERE player_id = $1 AND game_id = $2`, [userId, SuperAceConfig.GameId]
        );

        // ✅ VALIDATE INPUT
        if (!Number.isFinite(bet) || bet <= 0 || bet > 10000) {
            return {
                success: false,
                error: 'Số tiền cược không hợp lệ'
            };
        }

        let freeSpins = res.rows[0]?.free_spins ?? 0;
        // ✅ VALIDATE FREE SPINS
        if (freeSpins < 0) freeSpins = 0; // Không cho phép âm
        
        const isFreeSpin = freeSpins > 0;
        // console.log(`🌀 User ${userId} spins with bet=${bet}, freeSpinsLeft=${freeSpins}`);

        // ✅ LẤY BALANCE TRƯỚC KHI SPIN (phục vụ hiển thị log)
        let balanceBefore = await balanceService.getBalance(userId, Number(SuperAceConfig.GameId));
        if (!isFreeSpin) {
            // ✅ KIỂM TRA VÀ TRỪ TIỀN AN TOÀN
            if (balanceBefore < bet) {
                return {
                    success: false,
                    error: '01' // không đủ tiền
                };
            }

            // ✅ TRỪ TIỀN VÀ KIỂM TRA KẾT QUẢ
            const deductSuccess = await balanceService.decreaseBalance(userId, Number(SuperAceConfig.GameId), bet);
            if (!deductSuccess) {
                return {
                    success: false,
                    error: '01' // không đủ tiền
                };
            }
        } else {
            // ✅ TRỪ FREE SPINS VỚI TRANSACTION ĐỂ TRÁNH RACE CONDITION
            const client = await this.db.connect();
            try {
                await client.query('BEGIN');
                
                // Đọc giá trị hiện tại trong transaction
                const currentRes = await client.query<{ free_spins: number }>(
                    `SELECT free_spins FROM player_accounts WHERE player_id = $1 AND game_id = $2 FOR UPDATE`,
                    [userId, Number(SuperAceConfig.GameId)]
                );
                
                const currentFreeSpins = currentRes.rows[0]?.free_spins ?? 0;
                if (currentFreeSpins < 1) {
                    await client.query('ROLLBACK');
                    return {
                        success: false,
                        error: 'Không có free spins'
                    };
                }
                
                // Trừ 1 và cập nhật
                const updateResult = await client.query<{ free_spins: number }>(
                    `UPDATE player_accounts SET free_spins = free_spins - 1 
                     WHERE player_id = $1 AND game_id = $2 
                     RETURNING free_spins`,
                    [userId, Number(SuperAceConfig.GameId)]
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

        // --- LẤY RUNTIME CFG TỪ REDIS (partnerId mặc định 0) ---
        const gameId = Number(SuperAceConfig.GameId);
        const prof = await this.getProfile(userId, gameId);           // để lấy partnerId
        const partnerId = prof.partner_id ?? 0;
        const { cfg, ver } = await ConfigManager.I.getConfigWithVer<SuperAceRuntime>(gameId, 0);
        
        console.log(`\n🔧 CONFIG LOADED FROM REDIS:`);
        console.log(`Game ID: ${gameId}`);
        console.log(`Config Version: ${ver}`);
        console.log(`Payout Table:`, cfg.payoutTable);
        console.log(`Scatter Chance: ${cfg.scatterChance}`);
        console.log(`Golden Chance: ${cfg.goldenChance}`);
        console.log(`Red Wild Chance: ${cfg.redWildChance}`);
        console.log(`No Win Rate: ${cfg.noWinRate}`);
        
        const model = new GridModel(
            SuperAceConfig.Cols,
            SuperAceConfig.Rows,
            cfg.payoutTable,
            cfg.scatterChance,
            cfg.goldenChance,
            cfg.redWildChance,
            cfg.noWinRate
        );

        // Luôn dùng bet người chơi đã chọn để tính thưởng (free spin không trừ tiền)
        const spinBet = bet;
        
        console.log(`\n🎰 SPIN PARAMETERS:`);
        console.log(`User ID: ${userId}`);
        console.log(`Bet: ${bet}`);
        console.log(`Spin Bet: ${spinBet}`);
        console.log(`Is Free Spin: ${isFreeSpin}`);
        console.log(`Free Spins Left: ${freeSpins}`);
        
        // const { rounds, totalWin } = model.spinWithCascade(spinBet, isFreeSpin);
        const { rounds, totalWin } = model.spinWithCascadeAuthoritative(spinBet, isFreeSpin);

        // Tính scatter bonus - đếm từ grid cuối cùng vì scatter không bị triệt tiêu và có thể xuất hiện mới trong cascade
        const firstGrid = rounds.at(0)?.grid || model.data;
        const lastGrid = rounds.at(-1)?.grid || model.data;
        const scatters = lastGrid.flat().filter(c => c.isScatter).length;
        const initialScatters = firstGrid.flat().filter(c => c.isScatter).length;
        console.log(`User ${userId} spun: ${initialScatters} initial scatters → ${scatters} final scatters (after cascade)`);
        // TÍNH FREE: CHỈ THƯỞNG LƯỢT, KHÔNG CHẠY BATCH
        let freeMeta: { triggered: boolean; awarded: number } = { triggered: false, awarded: 0 };
        if (scatters >= 3) {
            const award = isFreeSpin ? 5 : 10;
            freeMeta = { triggered: true, awarded: award };
            console.log(`🎯 Scatter bonus triggered! Awarding ${award} free spins to user ${userId}`);
            
            // Cập nhật DB với transaction để tránh race condition
            const client = await this.db.connect();
            try {
                await client.query('BEGIN');
                
                const upd = await client.query<{ free_spins: number }>(
                    `UPDATE player_accounts SET free_spins = free_spins + $1 
                     WHERE player_id = $2 AND game_id = $3 
                     RETURNING free_spins`,
                    [award, userId, Number(SuperAceConfig.GameId)]
                );
                
                await client.query('COMMIT');
                
                freeSpins = upd.rows[0]?.free_spins ?? freeSpins + award;
                console.log(`✅ Free spins updated: ${freeSpins} total for user ${userId}`);
                
            } catch (error) {
                await client.query('ROLLBACK');
                console.error('Scatter bonus transaction failed:', error);
                // Fallback: cộng vào biến local
                freeSpins += award;
                console.log(`⚠️ Fallback: Free spins updated locally: ${freeSpins}`);
            } finally {
                client.release();
            }
        } else {
            console.log(`❌ Not enough scatters for bonus: ${scatters}/3`);
        }

        // nếu totalWin > 0 thì cộng tiền vào tài khoản
        if (totalWin > 0) {
            await balanceService.increaseBalance(userId, Number(SuperAceConfig.GameId), totalWin);
            console.log(`🎉 User ${userId} won ${totalWin} coins!`)
        }

        // Nếu đây là lượt free (đã trừ 1 đầu vòng), đồng bộ lại freeSpinsLeft qua DB (đã làm bằng RETURNING ở trên khi thưởng)

        const balanceAfter = await balanceService.getBalance(userId, Number(SuperAceConfig.GameId));

        // --- GHI LOG TỐI GIẢN ---
        // console.log(mongoDb);
        try {
            await this.spinsCol.insertOne({
                t: new Date(),
                gid: Number(SuperAceConfig.GameId),
                pid: partnerId,
                uid: userId,
                bet,
                username: prof.username,
                win: totalWin,
                free: isFreeSpin,
                fsl: freeSpins,
                cfgv: ver,             // từ ConfigManager.I.getConfigWithVer(...)
                bal_b: balanceBefore,  // trước khi trừ bet (kể cả free spin)
                bal_a: balanceAfter    // sau khi cộng win (nếu có)
            });
            // (tùy chọn) log id để confirm
            // console.log('[spin-log] inserted', ins.insertedId);
        } catch (e) {
            console.error('[spin-log] insert failed:', e);
        }
        // console.log(`📝 Ghi log spin cho user ${userId}: bet=${bet}, win=${totalWin}, freeSpinsLeft=${freeSpins}`);
        // ---- Transform rounds to lightweight client schema ----
        type PackedCell = { i: number; t: 'n' | 'g' | 'w' | 's'; wt?: 'blue' | 'red' };
        const packCell = (cell: any): PackedCell => {
            if (!cell) return { i: -1, t: 'n' } as PackedCell;
            const t: 'n' | 'g' | 'w' | 's' = cell.isWild ? 'w' : (cell.isScatter ? 's' : (cell.isGolden ? 'g' : 'n'));
            const out: PackedCell = { i: cell.idx, t };
            if (t === 'w') out.wt = cell.wildType ?? 'blue';
            return out;
        };
        const packGrid = (grid: any[][]): PackedCell[][] => grid.map(col => col.map(packCell));

        const transformedRounds = (rounds.length > 0 ? rounds : [{
            index: 0,
            grid: model.data,
            winCells: [],
            stepWin: 0,
            multiplier: isFreeSpin ? 2 : 1,
            flipEvents: [],
            copyEvents: [],
            nextGrid: model.data,
            hasNext: false,
        }]).map((r) => {
            // tách win thường vs wild dựa trên grid tại đầu step
            const winNormal: { c: number; r: number }[] = [];
            const winWild: { c: number; r: number; wildType: 'blue' | 'red' }[] = [];
            for (const p of r.winCells || []) {
                // Kiểm tra wild trong nextGrid (sau khi xử lý) thay vì grid (trước khi xử lý)
                const cell = r.nextGrid?.[p.r]?.[p.c];
                if (cell?.isWild) {
                    winWild.push({ c: p.c, r: p.r, wildType: (cell.wildType ?? 'blue') as 'blue' | 'red' });
                } else {
                    winNormal.push({ c: p.c, r: p.r });
                }
            }
            const flips = (r.flipEvents || []).map(ev => ({ c: ev.c, r: ev.r, wildType: ev.wildType }));
            const copies = (r.copyEvents || []).map((ev: CopyEvent) => ({ 
                c: ev.c, 
                r: ev.r, 
                sourcePos: ev.sourcePos, 
                wildType: ev.wildType 
            }));
            
            // Debug: In copy events data
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
                grid: packGrid(r.grid),
                win: { normal: winNormal, wild: winWild },
                flips,
                copies,
                stepWin: r.stepWin,
                multiplier: r.multiplier,
                nextGrid: packGrid(r.nextGrid),
                hasNext: r.hasNext,
                ...(lastRound ? { lastRound } : {}),
            };
        });

        // Debug: Chỉ hiển thị thông tin cơ bản
        console.log(`\n📊 SPIN RESULT: Total Win: ${totalWin}, Rounds: ${transformedRounds.length}`);

        return {
            success: true,
            usingFreeSpin: isFreeSpin,
            freeSpinsLeft: freeSpins,
            totalWin,
            free: freeMeta, // { triggered, awarded, total }
            rounds: transformedRounds,
        };
    }
    async getUserLogs(
        userId: number,
        options?: Pick<GameLogQuery, 'limit' | 'skip' | 'sort' | 'dateFrom' | 'dateTo' | 'partnerId'>
    ): Promise<SpinLogView[]> {
        return this.gameLogService.fetchLogs({
            userId,
            gameId: Number(SuperAceConfig.GameId),
            ...options,
        });
    }
    /** Lấy thông tin profile của user */
    async getProfile(userId: number, gameId: number): Promise<any> {
        const res = await this.db.query(
            `SELECT player_id, username, partner_id, created_at FROM player_accounts WHERE player_id = $1 AND game_id = $2`,
            [userId, gameId]
        );
        // console.log(`datanh: ${JSON.stringify(res.rows)}`);
        if (res.rowCount === 0) {
            throw new Error('Tài khoản không tồn tại');
        }
        return res.rows[0];
    }
}
