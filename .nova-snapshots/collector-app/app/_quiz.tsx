import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useThemeColors } from "./providers/ThemeBridge";

export default function Quiz() {
  const palette = useThemeColors();

  const s = useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: palette.bg, padding: 16 },
        title: { color: "#fff", fontSize: 20, fontWeight: "800" },
        box: {
          backgroundColor: palette.card,
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: palette.border
        },
        row: { flexDirection: "row", gap: 12, marginTop: 12 },
        btn: {
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 16
        },
        btnText: { color: "#e5e7eb", fontWeight: "600" },
        btnPrimary: { backgroundColor: palette.primary, borderColor: palette.primary },
        btnPrimaryText: { color: "#001018", fontWeight: "700" }
      }),
    [palette]
  );

  return (
    <ScrollView style={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Quiz</Text>
      <View style={[s.box, { marginTop: 12 }]}>
        <Text style={{ color: palette.text }}>Your quiz UI</Text>
      </View>
      <View style={s.row}>
        <Pressable style={s.btn}>
          <Text style={s.btnText}>Secondary</Text>
        </Pressable>
        <Pressable style={[s.btn, s.btnPrimary]}>
          <Text style={s.btnPrimaryText}>Primary</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
