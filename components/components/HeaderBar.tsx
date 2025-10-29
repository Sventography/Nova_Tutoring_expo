import React from "react";
import { View } from "react-native";
import CoinPill from "./CoinPill";
export default function HeaderBar({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <View
      style={{
        position: "absolute",
        top: 10,
        right: 12,
        zIndex: 30,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {children}
      <CoinPill />
    </View>
  );
}
