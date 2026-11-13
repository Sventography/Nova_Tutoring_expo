import React from "react";
import { View } from "react-native";
import DonateButton from "./DonateButton";

export default function HeaderDonateRight() {
  return (
    <View style={{ paddingRight: 12 }}>
      <DonateButton size="sm" label="Donate" />
    </View>
  );
}
