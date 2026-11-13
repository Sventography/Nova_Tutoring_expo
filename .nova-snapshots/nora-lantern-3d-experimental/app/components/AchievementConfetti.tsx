import React, { useEffect, useRef, useState } from "react";
import { View, Platform, Text, DeviceEventEmitter } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";
import { ACHIEVEMENT_EVENT } from "../context/AchievementsContext";

export default function AchievementConfetti() {
  const cannonRef = useRef<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    console.log("[AchievementConfetti] mounted. Listening for:", ACHIEVEMENT_EVENT);

    const onUnlocked = (payload?: any) => {
      console.log("[AchievementConfetti] ACHIEVEMENT_EVENT received:", payload);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      // Try native confetti
      try {
        cannonRef.current?.start?.();
      } catch (e) {
        console.log("[AchievementConfetti] cannon start failed", e);
      }

      // Web fallback: big 🎉 overlay
      if (Platform.OS === "web") {
        setVisible(true);
        setTimeout(() => setVisible(false), 1500);
      }
    };

    const sub = DeviceEventEmitter.addListener(ACHIEVEMENT_EVENT, onUnlocked);

    // Also listen to window event in case we fire that form too
    let webHandler: any = null;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      webHandler = (e: any) => onUnlocked({ source: "window", event: e?.type });
      (window as any).addEventListener(ACHIEVEMENT_EVENT as any, webHandler);
    }

    return () => {
      console.log("[AchievementConfetti] cleanup");
      sub.remove();
      if (webHandler && typeof window !== "undefined") {
        (window as any).removeEventListener(ACHIEVEMENT_EVENT as any, webHandler);
      }
    };
  }, []);

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      {/* Native / mobile confetti cannon */}
      <ConfettiCannon
        ref={cannonRef}
        autoStart={false}
        fadeOut
        count={140}
        origin={{ x: 0, y: 0 }}
      />

      {/* Web fallback: big centered 🎉 when visible */}
      {Platform.OS === "web" && visible && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 72, textAlign: "center" }}>🎉</Text>
        </View>
      )}
    </View>
  );
}
