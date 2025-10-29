import React from "react";
import { View, StyleSheet } from "react-native";
import AppHeader from "./AppHeader";
import DonateFab from "./DonateFab";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Chrome({ title, children }: { title?: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={s.screen}>
      <AppHeader title={title} />
      <View style={[s.content, { paddingBottom: insets.bottom + 16 }]}>{children}</View>
      <DonateFab />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#071018" },
  content: { flex: 1 }
});
