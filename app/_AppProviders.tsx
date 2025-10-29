// app/AppProviders.tsx
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar as RNStatusBar, Platform } from "react-native";

// state/providers you already have
import { CollectionsProvider } from "./state/CollectionsContext";
import { CoinsProvider } from "./state/CoinsContext";
import { ToastProvider } from "./state/ToastContext";
import { AchievementsProvider } from "./state/AchievementsContext";
import { SettingsProvider } from "./state/SettingsContext";
import { CertificatesProvider } from "./state/CertificatesContext";

// ✅ these two are the keys for your issues
import { UserProvider } from "./context/UserContext";
import { TopicsProvider } from "./state/TopicsContext"; // same folder where useTopics comes from

import { CommerceProvider } from "./context/CommerceContext";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RNStatusBar
          barStyle="light-content"
          backgroundColor={Platform.OS === "android" ? "#000000" : undefined}
        />
        <UserProvider>
          <TopicsProvider>
            <SettingsProvider>
              <AchievementsProvider>
                <CoinsProvider>
                  <ToastProvider>
                    <CollectionsProvider>
                      <CertificatesProvider>
                        <CommerceProvider>{children}</CommerceProvider>
                      </CertificatesProvider>
                    </CollectionsProvider>
                  </ToastProvider>
                </CoinsProvider>
              </AchievementsProvider>
            </SettingsProvider>
          </TopicsProvider>
        </UserProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
