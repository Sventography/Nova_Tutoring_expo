import React, { PropsWithChildren } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = PropsWithChildren<{ style?: ViewStyle }>;

export default function GradientScreen({ children, style }: Props) {
  return (
    <LinearGradient
      // black -> very dark teal/blue
      colors={["#000000", "#02121b", "#062232"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.fill, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, padding: 12 },
});
