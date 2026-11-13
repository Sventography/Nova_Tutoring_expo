// app/_layout.tsx

import "react-native-gesture-handler";
import "react-native-reanimated";

import React from "react";

import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import AppProviders from "./AppProviders";
import { AiPlanProvider } from "./context/AiPlanContext";
import ThemeOverlay from "./components/ThemeOverlay";
import { FxProvider } from "./context/FxProvider";
import { coinsAutoBoot } from "./utils/coins-autoboot";

export default function RootLayout() {
  React.useEffect(() => {
    coinsAutoBoot();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <AiPlanProvider>
          <FxProvider>
              <ThemeOverlay />
              <Slot />
            </FxProvider>
        </AiPlanProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
