import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ProviderThemeId =
  | "theme:neon"
  | "theme:starry"
  | "theme:pink"
  | "theme:dark"
  | "theme:mint"
  | "theme:glitter"
  | "theme:blackgold"
  | "theme:crimson"
  | "theme:emerald"
  | "theme:neonpurple"
  | "theme:silver";

type Tokens = {
  id: ProviderThemeId;
  name: string;
  // base colors
  bg: string;          // solid background fallback
  text: string;        // primary text
  subtext: string;     // secondary text
  card: string;        // card/bg surface
  border: string;      // borders/dividers
  accent: string;      // accent (buttons/links)
  // gradient background (global)
  gradFrom: string;
  gradTo: string;
  // effects
  glow: string;        // shadow/glow color
  tint: string;        // icon tint
};

type ThemeContextValue = {
  themeId: ProviderThemeId;
  tokens: Tokens;
  setThemeById: (id: ProviderThemeId | null | undefined) => void;
};

const STORAGE_KEY = "@nova/themeId";

function canonId(id?: string | null): ProviderThemeId {
  const m = (id || "theme:neon").toLowerCase().replace(/_/g, "-");
  const map: Record<string, ProviderThemeId> = {
    "theme:neon": "theme:neon",
    "theme:starry-night": "theme:starry",
    "theme:starry": "theme:starry",
    "theme:pink-dawn": "theme:pink",
    "theme:pink": "theme:pink",
    "theme:dark-nova": "theme:dark",
    "theme:dark": "theme:dark",
    "theme:mint-breeze": "theme:mint",
    "theme:mint": "theme:mint",
    "theme:glitter": "theme:glitter",
    "theme:black-gold": "theme:blackgold",
    "theme:blackgold": "theme:blackgold",
    "theme:crimson-dream": "theme:crimson",
    "theme:crimson": "theme:crimson",
    "theme:emerald-wave": "theme:emerald",
    "theme:emerald": "theme:emerald",
    "theme:neon-purple": "theme:neonpurple",
    "theme:neonpurple": "theme:neonpurple",
    "theme:silver-frost": "theme:silver",
    "theme:silver": "theme:silver",
  };
  return map[m] || "theme:neon";
}

const THEMES: Record<ProviderThemeId, Tokens> = {
  "theme:neon": {
    id: "theme:neon",
    name: "Neon Nova",
    bg: "#05070B",
    text: "#EAF6FF",
    subtext: "#B9D5FF",
    card: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    accent: "#00C6FF",
    gradFrom: "#000000",
    gradTo: "#011B2D",
    glow: "rgba(0,198,255,0.65)",
    tint: "#6CE1FF",
  },
  "theme:starry": {
    id: "theme:starry",
    name: "Starry Night",
    bg: "#070814",
    text: "#F4F5FF",
    subtext: "#C8CBFF",
    card: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
    accent: "#7A7CFF",
    gradFrom: "#05071C",
    gradTo: "#0B1034",
    glow: "rgba(122,124,255,0.55)",
    tint: "#9EA1FF",
  },
  "theme:pink": {
    id: "theme:pink",
    name: "Pink Dawn",
    bg: "#120914",
    text: "#FFF3FA",
    subtext: "#F9CFE6",
    card: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
    accent: "#FF6FB1",
    gradFrom: "#1A0B1F",
    gradTo: "#290B24",
    glow: "rgba(255,111,177,0.55)",
    tint: "#FFC1E0",
  },
  "theme:dark": {
    id: "theme:dark",
    name: "Dark Nova",
    bg: "#0A0A0A",
    text: "#F4F4F4",
    subtext: "#BDBDBD",
    card: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.08)",
    accent: "#8E8E8E",
    gradFrom: "#000000",
    gradTo: "#111111",
    glow: "rgba(200,200,200,0.3)",
    tint: "#D8D8D8",
  },
  "theme:mint": {
    id: "theme:mint",
    name: "Mint Breeze",
    bg: "#07120F",
    text: "#E9FFF7",
    subtext: "#C6FFE9",
    card: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
    accent: "#23F1A6",
    gradFrom: "#031A14",
    gradTo: "#062F23",
    glow: "rgba(35,241,166,0.55)",
    tint: "#6AF3C7",
  },
  "theme:glitter": {
    id: "theme:glitter",
    name: "Glitter",
    bg: "#0B0812",
    text: "#F9F3FF",
    subtext: "#E1D6FF",
    card: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
    accent: "#C07CFF",
    gradFrom: "#0C0820",
    gradTo: "#1A1030",
    glow: "rgba(192,124,255,0.55)",
    tint: "#D8B6FF",
  },
  "theme:blackgold": {
    id: "theme:blackgold",
    name: "Black & Gold",
    bg: "#0D0B06",
    text: "#FFF9E6",
    subtext: "#E6D9AE",
    card: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.09)",
    accent: "#F5C443",
    gradFrom: "#0B0904",
    gradTo: "#221A0A",
    glow: "rgba(245,196,67,0.55)",
    tint: "#FFD565",
  },
  "theme:crimson": {
    id: "theme:crimson",
    name: "Crimson Dream",
    bg: "#160507",
    text: "#FFECEF",
    subtext: "#FFC6CE",
    card: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
    accent: "#FF4E6E",
    gradFrom: "#1C060A",
    gradTo: "#310811",
    glow: "rgba(255,78,110,0.55)",
    tint: "#FFA1B3",
  },
  "theme:emerald": {
    id: "theme:emerald",
    name: "Emerald Wave",
    bg: "#06130D",
    text: "#E9FFF1",
    subtext: "#BFFFE0",
    card: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
    accent: "#28E06C",
    gradFrom: "#03190F",
    gradTo: "#07321E",
    glow: "rgba(40,224,108,0.55)",
    tint: "#75F2A8",
  },
  "theme:neonpurple": {
    id: "theme:neonpurple",
    name: "Neon Purple",
    bg: "#0A0612",
    text: "#F8E9FF",
    subtext: "#E9C7FF",
    card: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
    accent: "#8B5CF6",
    gradFrom: "#0D0720",
    gradTo: "#1A0F32",
    glow: "rgba(139,92,246,0.55)",
    tint: "#BFA4FF",
  },
  "theme:silver": {
    id: "theme:silver",
    name: "Silver Frost",
    bg: "#0A0C0F",
    text: "#F2F7FF",
    subtext: "#D8E4F7",
    card: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
    accent: "#B8D4FF",
    gradFrom: "#0A0D12",
    gradTo: "#111A24",
    glow: "rgba(184,212,255,0.50)",
    tint: "#D1E3FF",
  },
};

const Ctx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, _setThemeId] = useState<ProviderThemeId>("theme:neon");

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        _setThemeId(canonId(saved));
      } catch {}
    })();
  }, []);

  const setThemeById = useCallback((id?: ProviderThemeId | null) => {
    const next = canonId(id);
    _setThemeId(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const tokens = useMemo(() => THEMES[themeId] ?? THEMES["theme:neon"], [themeId]);

  const value = useMemo<ThemeContextValue>(() => ({ themeId, tokens, setThemeById }), [themeId, tokens, setThemeById]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
