import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CoinPill } from "./CoinPill";
import DevPanel from "./DevPanel";

export function withHeader(Screen: React.ComponentType<any>) {
  return function WrappedScreen(props: any) {
    const insets = useSafeAreaInsets();
    return (
      <View style={{ flex: 1 }}>
        <View
          style={{
            paddingTop: insets.top + 10,
            paddingHorizontal: 16,
            paddingBottom: 6,
            flexDirection: "row",
            justifyContent: "flex-end",
          }}
        >
          <CoinPill />
        </View>
        <Screen {...props} />
        <DevPanel />
      </View>
    );
  };
}
