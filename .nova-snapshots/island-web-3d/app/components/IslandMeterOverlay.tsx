// app/components/IslandMeterOverlay.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname } from "expo-router";

const ISLAND_PROGRESS_KEY = "@nova/island.progress.v1";
const ISLAND_METER_POS_KEY_BASE = "@nova/islandMeter.pos.v1";

const BASE_LEVEL_XP = 200;
const LEVEL_MULTIPLIER = 2;

// simple XP → level curve
function getLevelForXp(totalXp: number) {
  let level = 1;
  let xpForNext = BASE_LEVEL_XP;
  let remaining = totalXp;

  while (remaining >= xpForNext) {
    remaining -= xpForNext;
    level += 1;
    xpForNext = xpForNext * LEVEL_MULTIPLIER;
  }

  return { level, xpIntoCurrent: remaining, xpForNext };
}

type SavedProgress = {
  totalXp: number;
};

type SavedPos = {
  x: number;
  y: number;
};

export default function IslandMeterOverlay() {
  const pathname = usePathname();
  const posKey = useMemo(
    () => `${ISLAND_METER_POS_KEY_BASE}:${pathname || "root"}`,
    [pathname]
  );

  const [totalXp, setTotalXp] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offsetRef = useRef({ x: 0, y: 0 });

  const { level, xpIntoCurrent, xpForNext } = useMemo(
    () => getLevelForXp(totalXp),
    [totalXp]
  );

  const fillPct =
    xpForNext <= 0 ? 0 : Math.max(0, Math.min(1, xpIntoCurrent / xpForNext));

  // load XP + position from storage on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // progress
        const raw = await AsyncStorage.getItem(ISLAND_PROGRESS_KEY);
        if (!cancelled && raw) {
          try {
            const parsed = JSON.parse(raw) as SavedProgress;
            if (typeof parsed.totalXp === "number") {
              setTotalXp(parsed.totalXp);
            }
          } catch {
            // ignore
          }
        }

        // position (route-specific)
        const rawPos = await AsyncStorage.getItem(posKey);
        if (!cancelled && rawPos) {
          try {
            const parsed = JSON.parse(rawPos) as SavedPos;
            if (
              typeof parsed.x === "number" &&
              typeof parsed.y === "number"
            ) {
              offsetRef.current = { x: parsed.x, y: parsed.y };
              pan.setValue({ x: parsed.x, y: parsed.y });
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pan, posKey]);

  // persist XP when it changes (we’ll wire writes in quiz later)
  useEffect(() => {
    (async () => {
      try {
        const payload: SavedProgress = { totalXp };
        await AsyncStorage.setItem(
          ISLAND_PROGRESS_KEY,
          JSON.stringify(payload)
        );
      } catch {
        // ignore
      }
    })();
  }, [totalXp]);

  // PanResponder only for DRAGGING; taps go through Pressable
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        // nothing needed, we just start from current offset
      },
      onPanResponderMove: (_evt, gesture) => {
        const nx = offsetRef.current.x + gesture.dx;
        const ny = offsetRef.current.y + gesture.dy;
        pan.setValue({ x: nx, y: ny });
      },
      onPanResponderRelease: async () => {
        const current: { x: number; y: number } =
          (pan as any).__getValue?.() ?? { x: 0, y: 0 };
        offsetRef.current = current;

        try {
          const payload: SavedPos = { x: current.x, y: current.y };
          await AsyncStorage.setItem(posKey, JSON.stringify(payload));
        } catch {
          // ignore
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const label = `Lv.${level}`;
  const sub =
    xpForNext > 0
      ? `${xpIntoCurrent}/${xpForNext} XP`
      : `${xpIntoCurrent} XP`;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* single-finger tap toggles collapsed/expanded */}
      <Pressable
        onPress={() => setCollapsed((c) => !c)}
        style={styles.hitSlopArea}
      >
        {collapsed ? (
          // 🔹 COLLAPSED: tiny pill only (so it blocks almost nothing)
          <LinearGradient
            colors={["#06141F", "#020812"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.collapsedPill}
          >
            <Text style={styles.collapsedLabel}>{label}</Text>
          </LinearGradient>
        ) : (
          // 🔹 EXPANDED: thin vertical bar meter like before
          <LinearGradient
            colors={["#020A14", "#050B18"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.card}
          >
            <View style={styles.verticalTrack}>
              <View style={styles.trackOuter}>
                <View style={styles.trackInner}>
                  <View
                    style={[
                      styles.trackFill,
                      { flex: fillPct },
                    ]}
                  />
                  <View
                    style={[
                      styles.trackEmpty,
                      { flex: 1 - fillPct },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.title}>Nova Island</Text>
              <Text style={styles.subtitle}>{label}</Text>
              <Text style={styles.subtitleSmall}>{sub}</Text>
            </View>
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    // default anchor: left side, mid-screen-ish above tab bar
    left: 10,
    bottom: Platform.OS === "ios" ? 150 : 140,
    zIndex: 9997,
  },
  hitSlopArea: {
    padding: 6,
  },
  // EXPANDED: thin vertical bar + small text
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(0,229,255,0.9)",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "rgba(1,10,18,0.96)",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  verticalTrack: {
    paddingRight: 6,
  },
  trackOuter: {
    width: 14,
    height: 80,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.5)",
    backgroundColor: "rgba(0,15,30,0.9)",
    overflow: "hidden",
  },
  trackInner: {
    flex: 1,
    flexDirection: "column-reverse",
  },
  trackFill: {
    backgroundColor: "rgba(0,229,255,0.95)",
  },
  trackEmpty: {
    backgroundColor: "transparent",
  },
  textBlock: {
    justifyContent: "center",
    paddingLeft: 4,
  },
  title: {
    color: "#E8FBFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  subtitle: {
    marginTop: 1,
    color: "rgba(207,234,247,0.95)",
    fontSize: 11,
    fontWeight: "700",
  },
  subtitleSmall: {
    marginTop: 1,
    color: "rgba(148,191,213,0.95)",
    fontSize: 10,
    fontWeight: "600",
  },

  // COLLAPSED: tiny pill
  collapsedPill: {
    minWidth: 54,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.3,
    borderColor: "rgba(0,229,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(1,10,18,0.96)",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  collapsedLabel: {
    color: "#E8FBFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});