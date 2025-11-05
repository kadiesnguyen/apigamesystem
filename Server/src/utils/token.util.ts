// src/utils/token.util.ts
export async function verifyOneTimeToken(token: string, redis: any, db?: any) {
    const key = `session:${token}`;
    const raw = await redis.get(key);
    if (!raw) throw new Error("Token hết hạn hoặc không tồn tại");

    const session = JSON.parse(raw);

    if (session.used) throw new Error("Token đã được sử dụng");

    session.used = true;
    await redis.set(key, JSON.stringify(session), 'EX', 60); // giữ lại trace 1 phút
    // Nếu muốn xoá hẳn thì: await redis.del(key);

    // Optional: update Postgres để trace lịch sử
    if (db) {
        await db.query("UPDATE partner_sessions SET used = TRUE WHERE token = $1", [token]);
    }

    return session;
}
