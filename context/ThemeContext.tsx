import React, { createContext, useContext, useMemo, useState } from "react";

type Theme = {
  bg: string; text: string; textSoft: string; card: string; tint: string; bar: string;
};
const DARK: Theme = { bg:"#000", text:"#fff", textSoft:"#9aa2ad", card:"#0b1220", tint:"#06b6d4", bar:"#0e1628" };
const LIGHT: Theme = { bg:"#fff", text:"#111", textSoft:"#5b6673", card:"#f3f5f7", tint:"#06b6d4", bar:"#e7ebf0" };

type Ctx = { theme: Theme; mode: "dark" | "light"; setMode: (m:"dark"|"light")=>void };
const C = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"dark"|"light">("dark");
  const value = useMemo(() => ({ theme: mode==="dark" ? DARK : LIGHT, mode, setMode }), [mode]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useThemeTokens() {
  const v = useContext(C);
  if (!v) throw new Error("useThemeTokens must be used within ThemeProvider");
  return v;
}
