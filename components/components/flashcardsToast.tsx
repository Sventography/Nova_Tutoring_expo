import React, { useRef, useState, useCallback } from "react";
import { View, Text, Animated, Easing } from "react-native";

export default function useFlashcardsToast() {
  const toastY = useRef(new Animated.Value(80)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState("");

  const show = useCallback(
    (text: string) => {
      setMsg(text);
      Animated.parallel([
        Animated.timing(toastY, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(toastY, {
              toValue: 80,
              duration: 220,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: false,
            }),
            Animated.timing(toastOpacity, {
              toValue: 0,
              duration: 200,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: false,
            }),
          ]).start();
        }, 1200);
      });
    },
    [toastY, toastOpacity],
  );

  const Toast = () => (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 40,
        alignItems: "center",
        transform: [{ translateY: toastY }],
        opacity: toastOpacity,
      }}
    >
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.08)",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 14,
        }}
      >
        <Text style={{ color: "#e6f3ff", fontWeight: "600" }}>{msg}</Text>
      </View>
    </Animated.View>
  );

  return { show, Toast };
}
