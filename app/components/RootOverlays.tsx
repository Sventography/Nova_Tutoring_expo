import React from "react";
import { View, StyleSheet } from "react-native";
import ThemeOverlay from "./ThemeOverlay";
import FxOverlay from "./FxOverlay";

export default function RootOverlays(){
  return (
    <View pointerEvents="none" style={S.wrap}>
      <ThemeOverlay />
      <FxOverlay />
    </View>
  );
}
const S = StyleSheet.create({
  wrap: { position:"absolute", left:0, right:0, top:0, bottom:0, zIndex: 9999 }
});
