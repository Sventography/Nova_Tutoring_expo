import React from "react";
import "./_dev/seed_coins";

import { Slot } from "expo-router";
import AppProviders from "./AppProviders";
import { StreakProvider } from "../app/context/StreakContext";

export default function RootLayout() {
  return (
    <StreakProvider>
      <AppProviders>
        <Slot />
      </AppProviders>
    </StreakProvider>
  );
}
if (__DEV__) {
  import("@react-native-async-storage/async-storage").then(AS => {
    AS.default.setItem("@nova/coins.v1", "999999").then(() =>
      console.log("💰 Dev coins granted")
    );
  });
}