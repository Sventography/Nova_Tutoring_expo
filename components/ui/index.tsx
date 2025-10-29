import * as React from "react";
import { View, StyleSheet } from "react-native";

/** Simple gradient placeholder – swap with your real gradient if you have one */
export function GradientScreen({ children }: { children: React.ReactNode }) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default {};
