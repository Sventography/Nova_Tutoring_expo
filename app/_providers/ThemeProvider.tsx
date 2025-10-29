import React, { createContext, useContext, useMemo } from "react";

type Theme = {
  colors: {
    bg: string;
    text: string;
    accent: string;
    border: string;
  };
  gradients: {
    header: string[];
    tabbar: string[];
  };
};

const defaultTheme: Theme = {
  colors: {
    bg: "#000000",
    text: "#CFF1FF",
    accent: "#6EC1FF",
    border: "rgba(0,255,255,0.35)",
  },
  gradients: {
    header: ["#0A0F14", "#041622", "#000000"],
    tabbar: ["#03070B", "#02060A", "#000000"],
  },
};

const ThemeCtx = createContext<Theme>(defaultTheme);
export const useTheme = () => useContext(ThemeCtx);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => defaultTheme, []);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
