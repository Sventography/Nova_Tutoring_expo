import React from "react";
import { View, Text } from "react-native";
// Switch alias → relative for now so bundling works everywhere
import FooterDonate from "../../components/FooterDonate";

export default function Customize() {
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ color: "#e8fbff", fontWeight: "800", marginBottom: 12 }}>Customize</Text>
      <FooterDonate />
    </View>
  );
}
