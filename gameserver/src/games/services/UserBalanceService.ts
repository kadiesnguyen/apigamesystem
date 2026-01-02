import type { Pool } from 'pg';

export class UserBalanceService {
    constructor(private db: Pool) { }
    // Lấy dữ liệu gameId
    async getGameId (userId: number): Promise<number> {
        const res = await this.db.query(`SELECT game_id FROM player_accounts WHERE player_id = $1`, [userId]);
        return res.rows[0]?.game_id ?? 0;
    }

    async getBalance(userId: number, gameId: number): Promise<number> {
        
        const res = await this.db.query(`SELECT balance FROM player_accounts WHERE player_id = $1 AND game_id = $2`, [userId, gameId]);
        console.log(`datanh: ${JSON.stringify(res.rows)}`);
        
        return res.rows[0]?.balance ?? 0;
    }

    async updateBalance(userId: number, gameId: number, newBalance: number): Promise<void> {
        await this.db.query(
            `UPDATE player_accounts SET balance = $1 WHERE player_id = $2 AND game_id = $3`,
            [newBalance, userId, gameId]
        );
    }

    async increaseBalance(userId: number, gameId: number, amount: number): Promise<void> {
        await this.db.query(
            `UPDATE player_accounts SET balance = balance + $1 WHERE player_id = $2 AND game_id = $3`,
            [amount, userId, gameId]
        );
    }

    async decreaseBalance(userId: number, gameId: number, amount: number): Promise<boolean> {
        // ✅ VALIDATE INPUT
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('Số tiền không hợp lệ');
        }

        const result = await this.db.query(
            `UPDATE player_accounts SET balance = balance - $1 WHERE player_id = $2 AND game_id = $3 AND balance >= $1`,
            [amount, userId, gameId]
        );
        
        // ✅ KIỂM TRA KẾT QUẢ
        if (result.rowCount === 0) {
            return false; // Không đủ tiền
        }
        return true; // Thành công
    }

    // trừ tiền cược
    async deductBet(userId: number, gameId: number, bet: number): Promise<boolean> {
        return await this.decreaseBalance(userId, gameId, bet);
    }
}
