// app/overlays/IslandXpBar.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions, Pressable } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useIsland } from "../context/IslandContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const TRACK_HEIGHT = 80;

// v1 lock
const V1_LOCK_ISLAND_XP = true;

export default function IslandXpBar() {
  const { tokens } = useTheme() as any;
  const { xp, level, xpToNext, collapsed, positionY, setCollapsed, setPositionY, lastGain } = useIsland();

  const realProgress = xpToNext > 0 ? Math.min(1, xp / xpToNext) : 0;
  const progress = V1_LOCK_ISLAND_XP ? 0 : realProgress;

  const dragY = useRef(new Animated.Value(positionY)).current;
  const widthAnim = useRef(new Animated.Value(collapsed ? 16 : 40)).current;
  const progressAnim = useRef(new Animated.Value(progress || 0)).current;

  const [visibleGain, setVisibleGain] = useState(0);
  const gainOpacity = useRef(new Animated.Value(0)).current;
  const gainTranslateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    dragY.setValue(positionY);
  }, [positionY, dragY]);

  useEffect(() => {
    Animated.timing(widthAnim, { toValue: collapsed ? 16 : 40, duration: 180, useNativeDriver: false }).start();
  }, [collapsed, widthAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 260, useNativeDriver: false }).start();
  }, [progress, progressAnim]);

  useEffect(() => {
    if (V1_LOCK_ISLAND_XP) return;
    if (!lastGain) return;

    setVisibleGain(lastGain);
    gainOpacity.setValue(0);
    gainTranslateY.setValue(8);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(gainOpacity, { toValue: 1, duration: 180, useNativeDriver: false }),
        Animated.timing(gainTranslateY, { toValue: 0, duration: 180, useNativeDriver: false }),
      ]),
      Animated.delay(800),
      Animated.timing(gainOpacity, { toValue: 0, duration: 220, useNativeDriver: false }),
    ]).start();
  }, [lastGain, gainOpacity, gainTranslateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !V1_LOCK_ISLAND_XP,
      onPanResponderMove: (_, gesture) => {
        if (V1_LOCK_ISLAND_XP) return;
        const next = positionY + gesture.dy;
        dragY.setValue(next);
      },
      onPanResponderRelease: async (_, gesture) => {
        if (V1_LOCK_ISLAND_XP) return;
        let next = positionY + gesture.dy;
        const margin = 40;
        const min = margin;
        const max = SCREEN_HEIGHT - margin - TRACK_HEIGHT;
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

  const barHeightAnim = progressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, TRACK_HEIGHT] });

  const lockedAccent = "rgba(148,163,184,0.55)";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: dragY,
          borderColor: border,
          backgroundColor: bg,
          width: widthAnim,
          opacity: V1_LOCK_ISLAND_XP ? 0.6 : 1,
        },
      ]}
    >
      {!V1_LOCK_ISLAND_XP ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.gainPill,
            { opacity: gainOpacity, transform: [{ translateY: gainTranslateY }] },
          ]}
        >
          <Text style={styles.gainText}>+{visibleGain} XP!!</Text>
        </Animated.View>
      ) : null}

      <Pressable
        style={styles.pressArea}
        onPress={() => {
          if (V1_LOCK_ISLAND_XP) return;
          setCollapsed(!collapsed);
        }}
        {...(!V1_LOCK_ISLAND_XP ? panResponder.panHandlers : {})}
      >
        <View style={styles.barOuter}>
          <Animated.View
            style={[
              styles.barInner,
              {
                height: barHeightAnim,
                backgroundColor: V1_LOCK_ISLAND_XP ? lockedAccent : accent,
              },
            ]}
          />
        </View>

        {!collapsed && (
          <View style={styles.labelWrap}>
            {V1_LOCK_ISLAND_XP ? (
              <>
                <Text style={[styles.levelText, { color: text }]}>Island XP</Text>
                <Text style={[styles.subText, { color: text }]}>Coming soon</Text>
              </>
            ) : (
              <>
                <Text style={[styles.levelText, { color: text }]}>Lv {level}</Text>
                <Text style={[styles.subText, { color: text }]}>{xp}/{xpToNext}</Text>
              </>
            )}
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
  pressArea: { flexDirection: "row", alignItems: "center" },
  barOuter: {
    width: 10,
    height: TRACK_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.8)",
    overflow: "hidden",
    backgroundColor: "rgba(15,23,42,0.9)",
    justifyContent: "flex-end",
  },
  barInner: { width: "100%", borderRadius: 999 },
  labelWrap: { marginLeft: 6, justifyContent: "center" },
  levelText: { fontSize: 11, fontWeight: "700" },
  subText: { fontSize: 9, opacity: 0.9 },
  gainPill: {
    position: "absolute",
    right: -4,
    top: -22,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.85)",
  },
  gainText: { color: "#e5f2ff", fontSize: 9, fontWeight: "700" },
});