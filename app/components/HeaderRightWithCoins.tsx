import React from "react";
import { View } from "react-native";
import { unwrap } from "../_data/unwrap";
import HeaderCoinPill from "./HeaderCoinPill";

// Use existing Donate and FX if they exist—otherwise ignore (no crashes).
function SafeDonate() {
  try { const C = unwrap(require("./DonateButton")); return <C size="sm" />; } catch { return null; }
}
function SafeFX() {
  try { const C = unwrap(require("./SoundControls")); return <C />; } catch { return null; }
}

export default function HeaderRightWithCoins() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <SafeDonate />
      <View style={{ width: 10 }} />
      <HeaderCoinPill />
      <View style={{ width: 10 }} />
      <SafeFX />
    </View>
  );
}
