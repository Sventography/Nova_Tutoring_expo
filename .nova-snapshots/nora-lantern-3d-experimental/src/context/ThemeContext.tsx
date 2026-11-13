import React, { createContext, useContext, useMemo, useState } from "react";
export type ThemePalette = { bg: string; text: string; subtext?: string; accent: string };
const defaultPalette: ThemePalette = { bg: "#000008", text: "#e6faff", subtext: "#8aa7c4", accent: "#22d3ee" };
const ThemeCtx = createContext<{ palette: ThemePalette; setAccent: (c: string) => void } | undefined>(undefined);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccent] = useState(defaultPalette.accent);
  const value = useMemo(() => ({ palette: { ...defaultPalette, accent }, setAccent }), [accent]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
export function useTheme() { const v = useContext(ThemeCtx); if (!v) throw new Error("ThemeProvider missing"); return v; }
export default function useThemeContext(){ return useTheme(); }
