import jwt from 'jsonwebtoken';

export interface JwtUser { id: number; username: string; role: string }

export const signAccess = (u: JwtUser) =>
    jwt.sign(u, process.env.JWT_ACCESS_SECRET!, { expiresIn: process.env.ACCESS_EXPIRES || '60m' });

export const signRefresh = (u: JwtUser) =>
    jwt.sign({ sub: u.id, sid: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: `${Number(process.env.REFRESH_EXPIRES_DAYS || 7)}d`
    });

export const verifyAccess = (t: string) => jwt.verify(t, process.env.JWT_ACCESS_SECRET!) as JwtUser;
export const verifyRefresh = (t: string) => jwt.verify(t, process.env.JWT_REFRESH_SECRET!) as { sub: number; sid: string; iat: number; exp: number };
