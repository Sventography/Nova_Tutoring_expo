// app/AppProviders.tsx
import React, { useEffect } from "react";
import { Text } from "react-native";
import * as Linking from "expo-linking";

import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { CoinsProvider, useCoins } from "./context/CoinsContext";
import { PurchasesProvider, usePurchases } from "./context/PurchasesContext";
import { CursorProvider, useCursor } from "./context/CursorContext";
import { CollectionsProvider } from "./context/CollectionsContext";
import { StreakProvider } from "./context/StreakContext";
import { AchievementsProvider } from "./context/AchievementsContext";
import { ToastProvider } from "./context/ToastContext";
import { CertificatesProvider } from "./context/CertificatesContext";
import { UserProvider } from "./context/UserContext";

function ThemeGate({ children }: { children: React.ReactNode }) {
  const { themeId, tokens } = useTheme();

  // 🔹 Global default for ALL <Text> in the app
  if (Text.defaultProps == null) Text.defaultProps = {};
  Text.defaultProps.style = [
    ...(Array.isArray(Text.defaultProps.style)
      ? Text.defaultProps.style
      : Text.defaultProps.style
      ? [Text.defaultProps.style]
      : []),
    { color: tokens.text },
  ];

  // key forces a remount when theme changes, ensuring static styles reset
  return <React.Fragment key={themeId}>{children}</React.Fragment>;
}

function DevCoinsListener() {
  const { addCoins } = useCoins();
  useEffect(() => {
    const handle = (url?: string | null) => {
      if (!url) return;
      const { hostname, path, queryParams } = Linking.parse(url);
      const route = (hostname || path || "").toLowerCase();
      if (route.includes("coins") && queryParams && typeof queryParams.add !== "undefined") {
        const amt = Number(queryParams.add);
        if (!Number.isNaN(amt) && amt !== 0) addCoins(amt);
      }
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, [addCoins]);
  return null;
}

function DevThemeListener() {
  const { setThemeById } = useTheme();
  useEffect(() => {
    const handle = (url?: string | null) => {
      if (!url) return;
      const { hostname, path, queryParams } = Linking.parse(url);
      const route = (hostname || path || "").toLowerCase();
      if (route.includes("theme") && queryParams && typeof queryParams.id !== "undefined") {
        setThemeById(String(queryParams.id));
      }
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, [setThemeById]);
  return null;
}

function DevGrantListener() {
  const { grant } = usePurchases();
  const { setCursorById } = useCursor();
  useEffect(() => {
    const handle = (url?: string | null) => {
      if (!url) return;
      const { hostname, path, queryParams } = Linking.parse(url);
      const route = (hostname || path || "").toLowerCase();
      if (route.includes("grant") && queryParams && typeof queryParams.id !== "undefined") {
        let ids = String(queryParams.id)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        if (ids.length === 1 && ids[0] === "all") {
          ids = [
            "theme:neon",
            "theme:starry",
            "theme:pink",
            "theme:dark",
            "theme:mint",
            "theme:glitter",
            "theme:blackgold",
            "theme:crimson",
            "theme:emerald",
            "theme:neonpurple",
            "theme:silver",
            "cursor:glow",
            "cursor:orb",
            "cursor:star-trail",
          ];
        }

        ids.forEach((id) => {
          if (id.startsWith("cursor:")) setCursorById(id as any);
        });

        grant(ids).catch(() => {});
      }
    };

    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, [grant, setCursorById]);
  return null;
}

export function AppProviders(props: any) {
  const { children } = props;
  return (
    <ThemeProvider>
      <ThemeGate>
        <StreakProvider>
          <AchievementsProvider>
            <ToastProvider>
              <CertificatesProvider>
                <CoinsProvider>
                  <PurchasesProvider>
                    <CursorProvider>
                      <UserProvider>
                        <CollectionsProvider>
                          <DevCoinsListener />
                          <DevThemeListener />
                          <DevGrantListener />
                          {children}
                        </CollectionsProvider>
                      </UserProvider>
                    </CursorProvider>
                  </PurchasesProvider>
                </CoinsProvider>
              </CertificatesProvider>
            </ToastProvider>
          </AchievementsProvider>
        </StreakProvider>
      </ThemeGate>
    </ThemeProvider>
  );
}

export default AppProviders;
