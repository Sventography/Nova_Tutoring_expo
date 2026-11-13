import React, { useMemo, useState } from "react";
import { Pressable, Text, View, Animated } from "react-native";
import * as Haptics from "expo-haptics";

type Props = {
  label: string;
  reveal?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
};

export default function NeonAnswer({
  label,
  reveal = false,
  isCorrect = false,
  disabled = false,
  onSelect,
}: Props) {
  const [selected, setSelected] = useState(false);
  const [pulse] = useState(new Animated.Value(1));

  function runPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 550,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 1.0,
          duration: 550,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }

  const bg = useMemo(() => {
    if (!reveal) return selected ? "#0b1220" : "#0a0f18";
    if (selected && isCorrect) return "#063a2d";
    if (selected && !isCorrect) return "#3a0b0b";
    return "#0a0f18";
  }, [reveal, selected, isCorrect]);

  const border = useMemo(() => {
    if (!reveal) return selected ? "#38bdf8" : "#1f2937";
    if (selected && isCorrect) return "#22c55e";
    if (selected && !isCorrect) return "#ef4444";
    return "#1f2937";
  }, [reveal, selected, isCorrect]);

  const glowShadow = useMemo(() => {
    if (!selected) return {};
    const color = !reveal ? "#38bdf8" : isCorrect ? "#22c55e" : "#ef4444";
    return {
      shadowColor: color,
      shadowOpacity: 0.7,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
    };
  }, [reveal, selected, isCorrect]);

  async function handlePress() {
    if (disabled) return;
    setSelected(true);
    runPulse();
    await Haptics.selectionAsync();
    onSelect && onSelect();
  }

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={{
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 2,
          paddingVertical: 14,
          paddingHorizontal: 14,
          borderRadius: 14,
          marginVertical: 8,
          ...glowShadow,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
            {label}
          </Text>
          {reveal && (
            <Text
              style={{
                color: selected
                  ? isCorrect
                    ? "#22c55e"
                    : "#ef4444"
                  : "#64748b",
                fontWeight: "800",
              }}
            >
              {selected ? (isCorrect ? "✓" : "✕") : ""}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
