import React, { useEffect, useRef, useState } from "react";
import { View, Platform, Text } from "react-native";
import { useAchievements } from "../context/AchievementsContext";

export default function AchievementConfettiOverlay() {
  const { unlocked } = useAchievements();
  const [visible, setVisible] = useState(false);
  const prevCountRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    const count = unlocked ? Object.keys(unlocked).length : 0;
    const prev = prevCountRef.current;

    // First run: just sync without firing
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevCountRef.current = count;
      return;
    }

    // Fire only when new achievements appear
    if (count > prev) {
      prevCountRef.current = count;
      setVisible(true);
      setTimeout(() => setVisible(false), 1500);
    } else {
      prevCountRef.current = count;
    }
  }, [unlocked]);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {visible && (
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
