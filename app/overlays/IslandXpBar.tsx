// app/overlays/IslandXpBar.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Pressable,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useIsland } from "../context/IslandContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function IslandXpBar() {
  const { tokens } = useTheme() as any;
  const {
    xp,
    level,
    xpToNext,
    collapsed,
    positionY,
    setCollapsed,
    setPositionY,
  } = useIsland();

  const progress = xpToNext > 0 ? Math.min(1, xp / xpToNext) : 0;

  const dragY = useRef(new Animated.Value(positionY)).current;
  const widthAnim = useRef(new Animated.Value(collapsed ? 16 : 40)).current;

  // Keep animated Y in sync with stored position
  useEffect(() => {
    dragY.setValue(positionY);
  }, [positionY, dragY]);

  // Animate width on collapse/expand
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: collapsed ? 16 : 40,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [collapsed, widthAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const next = positionY + gesture.dy;
        dragY.setValue(next);
      },
      onPanResponderRelease: async (_, gesture) => {
        let next = positionY + gesture.dy;
        const margin = 40;
        const min = margin;
        const max = SCREEN_HEIGHT - margin - 80;
        if (next < min) next = min;
        if (next > max) next = max;
        await setPositionY(next);
        dragY.setValue(next);
      },
    })
  ).current;

  const accent = tokens?.accent || "#22d3ee";
  const bg = tokens?.isDark ? "rgba(0,0,0,0.55)" : "rgba(15,23,42,0.70)";
  const border = tokens?.border || "rgba(148,163,184,0.9)";
  const text = tokens?.text || "#e5e7eb";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: dragY,
          borderColor: border,
          backgroundColor: bg,
          width: widthAnim,
        },
      ]}
    >
      <Pressable
        style={styles.pressArea}
        onPress={() => setCollapsed(!collapsed)}
        {...panResponder.panHandlers}
      >
        {/* Outer bar */}
        <View style={styles.barOuter}>
          <Animated.View
            style={[
              styles.barInner,
              {
                height: `${Math.max(progress * 100, 8)}%`,
                backgroundColor: accent,
              },
            ]}
          />
        </View>

        {/* Label area (hidden when collapsed) */}
        {!collapsed && (
          <View style={styles.labelWrap}>
            <Text style={[styles.levelText, { color: text }]}>
              Lv {level}
            </Text>
            <Text style={[styles.subText, { color: text }]}>
              {xp}/{xpToNext}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 8,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    zIndex: 9995,
  },
  pressArea: {
    flexDirection: "row",
    alignItems: "center",
  },
  barOuter: {
    width: 10,
    height: 80,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.8)",
    overflow: "hidden",
    backgroundColor: "rgba(15,23,42,0.9)",
    justifyContent: "flex-end",
  },
  barInner: {
    width: "100%",
    borderRadius: 999,
  },
  labelWrap: {
    marginLeft: 6,
    justifyContent: "center",
  },
  levelText: {
    fontSize: 11,
    fontWeight: "700",
  },
  subText: {
    fontSize: 9,
    opacity: 0.9,
  },
});
