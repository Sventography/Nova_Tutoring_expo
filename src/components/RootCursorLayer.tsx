import React from "react";
import { View } from "react-native";
export default function RootCursorLayer() {
  return <View pointerEvents="none" style={{ position: "absolute", inset: 0 }} />;
}
