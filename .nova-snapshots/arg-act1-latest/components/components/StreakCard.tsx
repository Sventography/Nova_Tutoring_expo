import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../providers/ThemeBridge";

type Props = { label?: string; value?: number | string; sub?: string };

export default function StreakCard({ label = "Streak", value = 0, sub }: Props) {
  const palette = useThemeColors();
  const s = React.useMemo(
    () =>
      StyleSheet.create({
        wrap: { backgroundColor: palette.bg, borderColor: palette.border, borderWidth: 1, borderRadius: 16, padding: 14 },
        title: { color: palette.text, fontSize: 16, fontWeight: "600" },
        value: { color: palette.primary, fontSize: 28, fontWeight: "700", marginTop: 4 },
        sub: { color: palette.muted, marginTop: 2 }
      }),
    [palette]
  );

  return (
    <View style={s.wrap}>
      <Text style={s.title}>{label}</Text>
      <Text style={s.value}>{String(value)}</Text>
      {!!sub && <Text style={s.sub}>{sub}</Text>}
    </View>
  );
}
