// app/AppProviders.tsx
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
} from "react-native";

import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { CoinsProvider } from "./context/CoinsContext";
import { PurchasesProvider } from "./context/PurchasesContext";
import { CursorProvider } from "./context/CursorContext";
import { CollectionsProvider } from "./context/CollectionsContext";
import { AchievementsProvider } from "./context/AchievementsContext";
import { ToastProvider } from "./context/ToastContext";
import { CertificatesProvider } from "./context/CertificatesContext";
import { UserProvider, useUser } from "./context/UserContext";
import { CompanionProvider } from "./context/CompanionContext";
import { StreakProvider } from "./context/StreakContext";
import { IslandProvider } from "./context/IslandContext";
import { StudyProgressProvider } from "./context/StudyProgressContext";

function ThemeGate({ children }: { children: React.ReactNode }) {
  const { themeId } = useTheme();
  return <React.Fragment key={themeId}>{children}</React.Fragment>;
}

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
        <StudyProgressProvider>
          <IslandProvider>
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
          </IslandProvider>
        </StudyProgressProvider>
      </UserGate>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "white",
  },
});

export default AppProviders;
