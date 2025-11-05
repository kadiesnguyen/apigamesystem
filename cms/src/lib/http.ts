// src/lib/http.ts
const API = import.meta.env.VITE_API_URL || 'http://localhost:3300';

let accessToken: string | null = null;

export function setAccessToken(token: string) {
    accessToken = token;
    console.log('Set access token:', token);
    localStorage.setItem('access', token);
}
export function loadAccessToken() {
    accessToken = localStorage.getItem('access');
}

export async function http(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const headers = new Headers(init.headers || {});
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('Content-Type', 'application/json');

    const res = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });
    if (res.status !== 401) return res;

    // 401 -> thử refresh
    if (!retry) return res;
    const rf = await fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (rf.ok) {
        const { accessToken: at } = await rf.json();
        setAccessToken(at);
        return http(path, init, false);
    }
    return res;
}
