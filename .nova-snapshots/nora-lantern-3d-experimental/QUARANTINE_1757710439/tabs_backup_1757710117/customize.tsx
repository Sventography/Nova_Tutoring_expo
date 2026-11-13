import React from "react";
import { useThemeColors } from "../providers/ThemeBridge";
import { View, Text, Platform, ScrollView } from "react-native";
import EquipPicker from "@/components/EquipPicker";
import { FloatingDonateButton } from "@/components/FloatingDonateButton";

export default function CustomizeTab() {
  const palette = useThemeColors();
  return (
    <View variant="bg" style={{ flex: 1, backgroundColor: palette.bg }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "ios" ? 14 : 10,
          paddingBottom: 8,
        }}
      >
        <Text
          tone="text"
          style={{ color: palette.text, fontSize: 28, fontWeight: "800" }}
        >
          Customize
        </Text>
        <Text style={{ color: palette.subtext, marginTop: 4 }}>
          Switch your theme, cursor, and plush anytime.
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <EquipPicker title="Theme" type="theme" />
        <EquipPicker title="Cursor" type="cursor" />
        <EquipPicker title="Plush" type="plush" />
      </ScrollView>
      <FloatingDonateButton />
    </View>
  );
}
