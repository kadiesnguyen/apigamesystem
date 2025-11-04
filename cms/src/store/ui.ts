// src/store/ui.ts
import { create } from "zustand";

type UIState = {
    language: "vi" | "en" | "zh";
    timezone: string; // "GMT+7", "GMT+8", ...
    setLanguage: (lang: UIState["language"]) => void;
    setTimezone: (tz: string) => void;
};

const LS_LANG = "ui.language";
const LS_TZ = "ui.timezone";

const initLang = (localStorage.getItem(LS_LANG) as UIState["language"]) || "vi";
const initTz = localStorage.getItem(LS_TZ) || "GMT+7";

export const useUI = create<UIState>((set) => ({
    language: initLang,
    timezone: initTz,
    setLanguage: (language) => {
        localStorage.setItem(LS_LANG, language);
        set({ language });
    },
    setTimezone: (timezone) => {
        localStorage.setItem(LS_TZ, timezone);
        set({ timezone });
    },
}));
