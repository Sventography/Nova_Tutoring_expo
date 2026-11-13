import React, { useCallback, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function useAchievementToast() {
  const y = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");

  const show = useCallback(
    (t: string, s?: string) => {
      setTitle(t);
      setSubtitle(s ?? "");
      Animated.parallel([
        Animated.timing(y, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(y, {
              toValue: 80,
              duration: 220,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: false,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: false,
            }),
            Animated.timing(scale, {
              toValue: 0.96,
              duration: 200,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: false,
            }),
          ]).start();
        }, 1400);
      });
    },
    [y, opacity, scale],
  );

  const Toast = () => (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 28,
        alignItems: "center",
        transform: [{ translateY: y }, { scale }],
        opacity,
      }}
    >
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: "#ff7eb9",
          shadowOpacity: 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.08)",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Ionicons name="sparkles" size={22} color="#ff65a3" />
        <View style={{ maxWidth: 280 }}>
          <Text style={{ color: "#111", fontWeight: "800" }}>{title}</Text>
          {subtitle ? (
            <Text style={{ color: "#444", marginTop: 2 }}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );

  return { show, Toast };
}
