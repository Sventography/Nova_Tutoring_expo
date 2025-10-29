import React from "react";

export const ThemeContext = React.createContext<{ theme: "light" | "dark"; setTheme: (t: "light" | "dark") => void }>({
  theme: "light",
  setTheme: () => {},
});

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
