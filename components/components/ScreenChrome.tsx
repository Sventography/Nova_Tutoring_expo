import React from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
import { useContextSafe as useThemeTokens } from "@/context/ThemeContext";

export default function ScreenChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colors } = useThemeTokens();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1 },
});
