// app/providers/ThemeProvider.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import { Appearance } from "react-native";

type Theme = "light" | "dark" | "nova";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = Appearance.getColorScheme();
  const [theme, setTheme] = useState<Theme>((colorScheme as Theme) || "light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeNova() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeNova must be used within ThemeProvider");
  }
  return context;
}
