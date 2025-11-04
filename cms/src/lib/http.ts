// src/lib/http.ts
const API_BASE: string = import.meta.env.VITE_API_URL;
if (!API_BASE) console.warn("⚠️ VITE_API_URL is empty at build time!");

let accessToken: string | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
  localStorage.setItem("access", token);
}
export function loadAccessToken() {
  accessToken = localStorage.getItem("access");
}

function absolutize(path: string): string {
  // path có thể là "/api/..." hoặc "api/..."
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_BASE.endsWith("/") ? API_BASE : API_BASE + "/";
  const p = path.replace(/^\/+/, "");
  return new URL(p, base).toString();
}

export async function http(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Content-Type", "application/json");

  const url = absolutize(path);

  const res = await fetch(url, { ...init, headers, credentials: "include" });
  if (res.status !== 401) return res;

  if (!retry) return res;

  const rf = await fetch(absolutize("/api/auth/refresh"), {
    method: "POST",
    credentials: "include",
  });
  if (rf.ok) {
    const { accessToken: at } = await rf.json();
    setAccessToken(at);
    return http(path, init, false);
  }
  // Refresh thất bại -> xóa token và điều hướng về trang đăng nhập
  try {
    accessToken = null;
    localStorage.removeItem("access");
  } catch {}
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
  return res;
}
