import React from "react";
import { View, StyleSheet } from "react-native";
import DonateButton from "./DonateButton";

export default function FooterDonate() {
  return (
    <View style={S.container}>
      <DonateButton />
    </View>
  );
}

const S = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 16 },
});
