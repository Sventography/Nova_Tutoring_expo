import React from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { CursorProvider } from "./context/CursorContext";
import { UserProvider } from "./context/UserContext";
import { CoinsProvider } from "./context/CoinsContext";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CursorProvider>
        <UserProvider>
          <CoinsProvider>
            {children}
          </CoinsProvider>
        </UserProvider>
      </CursorProvider>
    </ThemeProvider>
  );
}
