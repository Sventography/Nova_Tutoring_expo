import React, { useEffect, useRef } from "react";
import { Animated, Text, View, StyleSheet, Platform } from "react-native";

export default function NeonTitle({ text = "Shop" }: { text?: string }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const glowRadius  = pulse.interpolate({ inputRange: [0, 1], outputRange: [8, 22] });
  const scale       = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });
  const color       = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgb(0,245,255)", "rgb(120,255,255)"],
  });

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
      <Animated.Text
        style={[
          styles.text,
          { color } as any,
          Platform.OS === "web"
            ? ({
                textShadowColor: "rgba(0,255,255,0.95)",
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 16,
              } as any)
            : null,
        ]}
      >
        {text}
      </Animated.Text>

      {/* outer glow ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowRing,
          {
            opacity: glowOpacity,
            shadowRadius: glowRadius as any,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "flex-start", marginBottom: 18, position: "relative" },
  text: { fontSize: 40, fontWeight: "900", letterSpacing: 0.5 },
  glowRing: {
    position: "absolute",
    left: -10,
    right: -10,
    top: -12,
    bottom: -14,
    borderRadius: 10,
    shadowColor: "#00FFFF",
    shadowOpacity: 0.95,
    shadowOffset: { width: 0, height: 0 },
  },
});
