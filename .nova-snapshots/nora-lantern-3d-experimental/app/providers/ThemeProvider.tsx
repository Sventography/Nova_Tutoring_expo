import React, { createContext, useContext, useMemo, useState } from "react";
import { Appearance } from "react-native";

type Theme = {
  colors: {
    bg: string;
    text: string;
    primary: string;
    card: string;
  };
  mode: "light" | "dark";
  setMode: (m: "light" | "dark") => void;
};

const ThemeCtx = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initial =
    (Appearance?.getColorScheme?.() as "light" | "dark" | null) ?? "dark";
  const [mode, setMode] = useState<"light" | "dark">(initial || "dark");

  const value = useMemo<Theme>(() => {
    const dark = mode === "dark";
    return {
      mode,
      setMode,
      colors: {
        bg: dark ? "#000914" : "#ffffff",
        text: dark ? "#E9F9FF" : "#0A0A0A",
        primary: "#00e5ff",
        card: dark ? "#06131a" : "#f3f7fa",
      },
    };
  }, [mode]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
