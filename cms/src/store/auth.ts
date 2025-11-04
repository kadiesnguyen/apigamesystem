import { create } from "zustand";

type Role = "superadmin" | "partner" | "admin";

type AuthState = {
    isAuthed: boolean;
    role?: Role;
    partnerId?: number | null;
    setAuth: (p: { token: string; role?: Role; partner_id?: number | null }) => void;
    logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
    // Đọc đúng key mà http.ts đang dùng
    isAuthed: !!localStorage.getItem("access"),
    role: undefined,
    partnerId: null,
    setAuth: ({ token, role, partner_id }) => {
        localStorage.setItem("access", token);
        set({ isAuthed: true, role, partnerId: partner_id ?? null });
    },
    logout: () => {
        localStorage.removeItem("access"); // <-- đổi từ 'atk' thành 'access'
        set({ isAuthed: false, role: undefined, partnerId: undefined });
        location.href = "/login";
    },
}));
