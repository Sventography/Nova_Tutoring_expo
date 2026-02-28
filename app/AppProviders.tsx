// app/AppProviders.tsx
import React, { useEffect } from "react";
import * as Linking from "expo-linking";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
} from "react-native";

import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { CoinsProvider, useCoins } from "./context/CoinsContext";
import { PurchasesProvider, usePurchases } from "./context/PurchasesContext";
import { CursorProvider, useCursor } from "./context/CursorContext";
import { CollectionsProvider } from "./context/CollectionsContext";
import { AchievementsProvider } from "./context/AchievementsContext";
import { ToastProvider } from "./context/ToastContext";
import { CertificatesProvider } from "./context/CertificatesContext";
import { UserProvider, useUser } from "./context/UserContext";
import { CompanionProvider } from "./context/CompanionContext";
import { StreakProvider } from "./context/StreakContext";

function ThemeGate({ children }: { children: React.ReactNode }) {
  const { themeId } = useTheme();
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
      if (
        route.includes("coins") &&
        queryParams &&
        typeof queryParams.add !== "undefined"
      ) {
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
      if (
        route.includes("theme") &&
        queryParams &&
        typeof queryParams.id !== "undefined"
      ) {
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
      if (
        route.includes("grant") &&
        queryParams &&
        typeof queryParams.id !== "undefined"
      ) {
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

/**
 * UserGate:
 * Holds the entire app until UserContext.ready is true,
 * so you don't get stuck on "Loading your profile..." after tapping Let's Learn.
 */
function UserGate({ children }: { children: React.ReactNode }) {
  const { ready } = useUser();

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export function AppProviders(props: any) {
  const { children } = props;

  return (
    <UserProvider>
      <UserGate>
        <CoinsProvider>
          <PurchasesProvider>
            <CompanionProvider>
              <StreakProvider>
                <ThemeProvider>
                  <ThemeGate>
                    <CursorProvider>
                      <CollectionsProvider>
                        <CertificatesProvider>
                          <ToastProvider>
                            <AchievementsProvider>
                              <DevCoinsListener />
                              <DevThemeListener />
                              <DevGrantListener />
                              {/* NOTE:
                                  AchievementConfettiOverlay is now mounted
                                  inside the tabs layout only, so it can never
                                  interfere with sign-in or other stack screens.
                              */}
                              {children}
                            </AchievementsProvider>
                          </ToastProvider>
                        </CertificatesProvider>
                      </CollectionsProvider>
                    </CursorProvider>
                  </ThemeGate>
                </ThemeProvider>
              </StreakProvider>
            </CompanionProvider>
          </PurchasesProvider>
        </CoinsProvider>
      </UserGate>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617", // dark navy-ish fallback
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "white",
  },
});

export default AppProviders;