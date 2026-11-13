import React from "react";
import { Text, Pressable, StyleSheet, ViewStyle } from "react-native";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "default" | "correct" | "incorrect" | "primary" | "danger";
  minHeight?: number;
  style?: ViewStyle;
  numberOfLines?: number;
};

export default function NeonButton({
  children,
  onPress,
  disabled,
  variant = "default",
  minHeight = 48,
  style,
  numberOfLines = 1,
}: Props) {
  const v =
    variant === "correct"
      ? styles.correct
      : variant === "incorrect"
        ? styles.incorrect
        : variant === "primary"
          ? styles.primary
          : variant === "danger"
            ? styles.danger
            : styles.defaultBtn;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        v,
        { minHeight, opacity: disabled ? 0.6 : pressed ? 0.9 : 1 },
        style,
      ]}
    >
      <Text style={styles.text} numberOfLines={numberOfLines}>
        {children as any}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  text: { color: "#dbe7ff", fontSize: 16 },
  defaultBtn: { borderColor: "#223142", backgroundColor: "#0b121b" },
  primary: { borderColor: "#1f3d7a", backgroundColor: "#0b1629" },
  danger: { borderColor: "#5a1a1a", backgroundColor: "#1a0b0b" },
  correct: { borderColor: "#18a558", backgroundColor: "rgba(24,165,88,0.15)" },
  incorrect: {
    borderColor: "#d12c2c",
    backgroundColor: "rgba(209,44,44,0.15)",
  },
});
