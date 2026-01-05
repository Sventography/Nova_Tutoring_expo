// app/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ProviderThemeId =
  | "theme:neon"
  | "theme:starry"
  | "theme:pink"
  | "theme:dark"
  | "theme:mint"
  | "theme:glitter"
  | "theme:blackgold"
  | "theme:neonpurple"
  | "theme:silver"
  | "theme:emerald"
  | "theme:crimson";

export type Tokens = {
  id: ProviderThemeId;
  name: string;
  isDark: boolean;

  bg: string;
  text: string;

  card: string;
  cardText: string;

  border: string;
  accent: string;

  gradient: [string, string];
  barStyle: "light-content" | "dark-content";

  // ✅ NEW: readability helpers for headers + pills
  titleText: string;

  pillBg: string;
  pillText: string;
  pillBorder: string;

  // optional subtle shadow helper for light themes
  softShadow: string; // e.g. "rgba(0,0,0,0.18)"
};

const THEME_KEY = "@nova/themeId";

/* ------------------------------- Canon IDs -------------------------------- */

const canonMap: Record<string, ProviderThemeId> = {
  "theme:neon": "theme:neon",
  "theme:starry": "theme:starry",
  "theme:starry-night": "theme:starry",
  theme_starry: "theme:starry",
  starry_night: "theme:starry",

  "theme:pink": "theme:pink",
  "theme:dark": "theme:dark",
  "theme:mint": "theme:mint",
  "theme:glitter": "theme:glitter",

  "theme:blackgold": "theme:blackgold",
  "theme:black_gold": "theme:blackgold",

  "theme:neonpurple": "theme:neonpurple",
  "theme:neon_purple": "theme:neonpurple",

  "theme:silver": "theme:silver",
  "theme:silver_frost": "theme:silver",

  "theme:emerald": "theme:emerald",
  "theme:emerald-wave": "theme:emerald",
  "theme:emerald_wave": "theme:emerald",

  "theme:crimson": "theme:crimson",
  "theme:crimson-dream": "theme:crimson",
  "theme:crimson_dream": "theme:crimson",
};

function canonId(id?: string | null): ProviderThemeId {
  const raw = (id ?? "theme:neon").trim().toLowerCase();
  if (canonMap[raw]) return canonMap[raw];
  if (!raw.includes(":")) return canonMap[`theme:${raw}`] ?? "theme:neon";
  return canonMap[raw] ?? "theme:neon";
}

/* -------------------------- Token helper defaults ------------------------- */

function withReadability(t: Omit<Tokens, "titleText" | "pillBg" | "pillText" | "pillBorder" | "softShadow"> & Partial<Pick<Tokens, "titleText" | "pillBg" | "pillText" | "pillBorder" | "softShadow">>): Tokens {
  const isDark = !!t.isDark;

  // Good defaults if caller didn't specify
  const titleText = t.titleText ?? t.text;

  const pillText = t.pillText ?? t.text;

  // If no pill bg given, use a glassy overlay that contrasts with the theme
  const pillBg =
    t.pillBg ??
    (isDark ? "rgba(232,245,255,0.10)" : "rgba(13,27,42,0.08)");

  const pillBorder =
    t.pillBorder ??
    (isDark ? "rgba(232,245,255,0.18)" : "rgba(13,27,42,0.20)");

  const softShadow =
    t.softShadow ?? (isDark ? "rgba(0,0,0,0.0)" : "rgba(0,0,0,0.18)");

  return {
    ...t,
    titleText,
    pillBg,
    pillText,
    pillBorder,
    softShadow,
  } as Tokens;
}

/* --------------------------------- Themes -------------------------------- */

export const THEMES: Record<ProviderThemeId, Tokens> = {
  "theme:neon": withReadability({
    id: "theme:neon",
    name: "Neon Nova",
    isDark: true,
    bg: "#05060A",
    text: "#E8F5FF",
    card: "#0B1020",
    cardText: "#E8F5FF",
    border: "#1EE3FF",
    accent: "#00C8FF",
    gradient: ["#00E5FF", "#00121A"],
    barStyle: "light-content",
    // optional: stronger header readability
    pillBg: "rgba(0,229,255,0.12)",
    pillBorder: "rgba(30,227,255,0.35)",
  }),

  "theme:starry": withReadability({
    id: "theme:starry",
    name: "Starry Night",
    isDark: true,
    bg: "#0A0C18",
    text: "#E6EDFF",
    card: "#11162B",
    cardText: "#E6EDFF",
    border: "#6BA7FF",
    accent: "#3D7EFF",
    gradient: ["#1E3A8A", "#0B1020"],
    barStyle: "light-content",
    pillBg: "rgba(230,237,255,0.10)",
    pillBorder: "rgba(107,167,255,0.28)",
  }),

  // ✅ Light themes need deliberate pill/title contrast
  "theme:pink": withReadability({
    id: "theme:pink",
    name: "Pink Dawn",
    isDark: false,
    bg: "#FFF5F8",
    text: "#2A0F18",
    card: "#FFE6EF",
    cardText: "#2A0F18",
    border: "#FF87B0",
    accent: "#FF4FA0",
    gradient: ["#FFD1E1", "#FFFFFF"],
    barStyle: "dark-content",

    titleText: "#1D0A12",
    pillBg: "rgba(42,15,24,0.10)",
    pillText: "#1D0A12",
    pillBorder: "rgba(42,15,24,0.22)",
    softShadow: "rgba(0,0,0,0.18)",
  }),

  "theme:dark": withReadability({
    id: "theme:dark",
    name: "Dark Nova",
    isDark: true,
    bg: "#000000",
    text: "#EDEDED",
    card: "#101010",
    cardText: "#EDEDED",
    border: "#444444",
    accent: "#888888",
    gradient: ["#0A0A0A", "#000000"],
    barStyle: "light-content",
    pillBg: "rgba(255,255,255,0.08)",
    pillBorder: "rgba(255,255,255,0.16)",
  }),

  "theme:mint": withReadability({
    id: "theme:mint",
    name: "Mint Breeze",
    isDark: false,
    bg: "#F3FFFB",
    text: "#06231B",
    card: "#E3FBF3",
    cardText: "#06231B",
    border: "#9EF6D0",
    accent: "#3ED3A2",
    gradient: ["#C9FFE9", "#FFFFFF"],
    barStyle: "dark-content",

    titleText: "#041A14",
    pillBg: "rgba(6,35,27,0.10)",
    pillText: "#041A14",
    pillBorder: "rgba(6,35,27,0.22)",
    softShadow: "rgba(0,0,0,0.18)",
  }),

  "theme:glitter": withReadability({
    id: "theme:glitter",
    name: "Glitter",
    isDark: true,
    bg: "#0E0A12",
    text: "#FFF6FF",
    card: "#1A1320",
    cardText: "#FFF6FF",
    border: "#FFB7FF",
    accent: "#F06BFF",
    gradient: ["#3B0B45", "#0E0A12"],
    barStyle: "light-content",
    pillBg: "rgba(255,246,255,0.10)",
    pillBorder: "rgba(255,183,255,0.25)",
  }),

  "theme:blackgold": withReadability({
    id: "theme:blackgold",
    name: "Black & Gold",
    isDark: true,
    bg: "#0B0900",
    text: "#FFF9E6",
    card: "#171203",
    cardText: "#FFF9E6",
    border: "#E6B800",
    accent: "#F2C200",
    gradient: ["#2B2100", "#0B0900"],
    barStyle: "light-content",
    pillBg: "rgba(242,194,0,0.10)",
    pillBorder: "rgba(230,184,0,0.30)",
    pillText: "#FFF9E6",
  }),

  "theme:neonpurple": withReadability({
    id: "theme:neonpurple",
    name: "Neon Purple",
    isDark: true,
    bg: "#0A0610",
    text: "#F3E8FF",
    card: "#150A24",
    cardText: "#F3E8FF",
    border: "#C084FC",
    accent: "#A855F7",
    gradient: ["#3B1A6D", "#0A0610"],
    barStyle: "light-content",
    pillBg: "rgba(192,132,252,0.10)",
    pillBorder: "rgba(192,132,252,0.26)",
  }),

  "theme:silver": withReadability({
    id: "theme:silver",
    name: "Silver Frost",
    isDark: false,
    bg: "#F6F8FB",
    text: "#0D1B2A",
    card: "#E9EEF5",
    cardText: "#0D1B2A",
    border: "#A7B7C9",
    accent: "#5C7A99",
    gradient: ["#FFFFFF", "#E9EEF5"],
    barStyle: "dark-content",

    titleText: "#0B1220",
    pillBg: "rgba(13,27,42,0.08)",
    pillText: "#0B1220",
    pillBorder: "rgba(13,27,42,0.20)",
    softShadow: "rgba(0,0,0,0.18)",
  }),

  "theme:emerald": withReadability({
    id: "theme:emerald",
    name: "Emerald Wave",
    isDark: true,
    bg: "#03120E",
    text: "#E8FFF6",
    card: "#0A241E",
    cardText: "#E8FFF6",
    border: "#00E6A8",
    accent: "#00C28A",
    gradient: ["#046C54", "#03120E"],
    barStyle: "light-content",
    pillBg: "rgba(0,230,168,0.10)",
    pillBorder: "rgba(0,230,168,0.28)",
  }),

  "theme:crimson": withReadability({
    id: "theme:crimson",
    name: "Crimson Dream",
    isDark: true,
    bg: "#180607",
    text: "#FFE8EA",
    card: "#2B0B0D",
    cardText: "#FFE8EA",
    border: "#FF848F",
    accent: "#FF5162",
    gradient: ["#7A1320", "#180607"],
    barStyle: "light-content",
    pillBg: "rgba(255,132,143,0.10)",
    pillBorder: "rgba(255,132,143,0.26)",
  }),
};

// runtime snapshot (for non-hook callers)
let __themeTokensSnapshot: Tokens | null = null;
export function getTokensSnapshot(): Tokens {
  return (__themeTokensSnapshot as Tokens) || THEMES["theme:neon"];
}

type ThemeContextValue = {
  themeId: ProviderThemeId;
  tokens: Tokens;
  setThemeById: (id: string | null | undefined) => void;
};

const ThemeCtx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ProviderThemeId>("theme:neon");

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved) setThemeId(canonId(saved));
      } catch {}
    })();
  }, []);

  const setThemeById = (id: string | null | undefined) => {
    const c = canonId(id ?? undefined);
    setThemeId(c);
    AsyncStorage.setItem(THEME_KEY, c).catch(() => {});
  };

  const tokens = useMemo(() => THEMES[themeId] ?? THEMES["theme:neon"], [themeId]);

  useEffect(() => {
    __themeTokensSnapshot = tokens;
  }, [tokens]);

  const value = useMemo(() => ({ themeId, tokens, setThemeById }), [themeId, tokens]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
