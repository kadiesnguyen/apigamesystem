// helpers/wallet.ts
import { Pool } from 'pg';

export async function resolveAccountId(
    pool: Pool,
    params: { accountId?: number | null; gameId?: number; usernameGame?: string; partnerId?: number | null }
): Promise<{ accountId: number; gameId: number; usernameGame: string }> {
    const { accountId, gameId, usernameGame, partnerId } = params;

    // 1) Nếu đã có accountId → xác nhận lại (optional)
    if (Number.isFinite(accountId as number) && (accountId as number) > 0) {
        const q = await pool.query(
            `SELECT id, game_id, username
         FROM player_accounts
        WHERE id = $1`,
            [accountId]
        );
        if (!q.rowCount) throw new Error('Account not found');
        const row = q.rows[0];
        // Nếu client có kèm game/username → kiểm tra khớp
        if (gameId && row.game_id !== gameId) throw new Error('Account does not belong to gameId');
        if (usernameGame && row.username !== usernameGame) throw new Error('Account username mismatch');
        return { accountId: row.id, gameId: row.game_id, usernameGame: row.username };
    }

    // 2) Không có accountId → tra theo gameId + usernameGame (+ partnerId nếu cần)
    if (!gameId || !usernameGame) throw new Error('Missing gameId or usernameGame');

    const sql = `
    SELECT pa.id, pa.game_id, pa.username
      FROM player_accounts pa
     WHERE pa.game_id = $1
       AND pa.username = $2
       ${partnerId ? 'AND pa.partner_id = $3' : ''}
     LIMIT 1`;
    const args = partnerId ? [gameId, usernameGame, partnerId] : [gameId, usernameGame];
    const r = await pool.query(sql, args);
    if (!r.rowCount) throw new Error('Account not found for gameId + usernameGame');
    const row = r.rows[0];
    return { accountId: row.id, gameId: row.game_id, usernameGame: row.username };
}

// ex