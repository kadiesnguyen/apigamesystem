// src/services/auth.ts
import { http } from "@/lib/http";

export type Role = "superadmin" | "partner" | "admin";

export type MeResponse = {
    id: number;
    username: string;
    role: Role;
    partner_id?: number | null;
    partner_name?: string | null;
    timezone?: string | null;  // ví dụ "GMT+7"
    language?: "vi" | "en" | "zh" | null;
};

export async function fetchMe(): Promise<MeResponse> {
    const res = await http("/api/auth/me", { method: "GET" });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
}
