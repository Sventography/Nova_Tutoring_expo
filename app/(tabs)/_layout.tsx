// app/(tabs)/_layout.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import CursorOverlay from "../overlays/CursorOverlay";
import TouchCursorOverlay from "../overlays/TouchCursorOverlay";
import ScrollableTabBar from "../components/ScrollableTabBar";
import HeaderBar from "../components/HeaderBar";
import StarTrailOverlay from "../components/StarTrailOverlay";
import { AchieveEmitter } from "../context/AchievementsContext";
import ToastHost from "../components/ToastHost";
import AchievementsAutoTracker from "../context/AchievementsAutoTracker";
import AchievementsCoinsBridge from "../context/AchievementsCoinsBridge";
import FxOverlay from "../components/FxOverlay";
import GlobalTextDefaults from "../components/GlobalTextDefaults";
import { useUser } from "../context/UserContext";

// --------------------
// DEV-ONLY imports
// --------------------
if (__DEV__) {
  try {
    require("../utils/_streak-autoboot");
    require("../utils/streak-achievements-autoboot");
    require("../utils/dev-expose");
    require("../utils/achievements-smoketest");
  } catch {}
}

type Pt = { x: number; y: number };

// use a namespaced key so it doesn't collide with anything else
const CURSOR_EQUIPPED_KEY = "@nova/cursor.equipped.v1";

function CelebrateToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <View pointerEvents="box-none" style={S.overlay}>
      <LinearGradient
        colors={["#00e5ff", "#66a6ff", "#000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={S.toast}
      >
        <Text style={S.toastText}>{message}</Text>
        <Pressable onPress={onClose} hitSlop={12} style={S.closeBtn}>
          <Text style={S.closeText}>×</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

/**
 * Root tabs layout.
 * All global providers (User, Theme, Coins, Purchases, Cursor, Toast, etc.)
 * are wired up in AppProviders + app/_layout.
 */
export default function TabsLayout() {
  return (
    <>
      <GlobalTextDefaults />
      {/* Global toast host lives here, inside ToastProvider from AppProviders */}
      <ToastHost />
      <InnerTabsLayout />
      {Platform.OS === "web" ? <CursorOverlay /> : null}
    </>
  );
}

/**
 * Inner layout that uses useUser() and only renders the Tabs once
 * the user context is hydrated, so first-login doesn't feel like a freeze.
 */
function InnerTabsLayout() {
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = (Platform.OS === "web" ? 64 : 56) + (insets?.top ?? 0);

  const [celebrate, setCelebrate] = useState<string | null>(null);

  // global touch tracking for mobile cursor trail
  const [p, setP] = useState<Pt>({ x: -1, y: -1 });
  const [down, setDown] = useState(false);

  const { ready } = useUser() as any;

  // listen for achievement celebration events
  useEffect(() => {
    const sub = (msg: string) => {
      setCelebrate(msg || "🎉 Achievement unlocked!");
      const t = setTimeout(() => setCelebrate(null), 6000);
      return () => clearTimeout(t);
    };

    const listener = AchieveEmitter?.addListener?.("celebrate", sub);
    return () => listener?.remove?.();
  }, []);

  // ensure mobile has a default cursor trail (star) if none is set yet
  useEffect(() => {
    if (Platform.OS === "web") return;

    let cancelled = false;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(CURSOR_EQUIPPED_KEY);
        if (cancelled) return;

        if (!stored) {
          await AsyncStorage.setItem(CURSOR_EQUIPPED_KEY, "star");
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log("[cursor] seeded default cursor.equipped.v1=star");
          }
        }
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn("[cursor] error seeding default cursor", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // While the user context is hydrating (first login / first app open),
  // show a simple friendly loading state instead of mounting everything.
  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000814",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: "#e8fbff",
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          Loading your profile...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, position: "relative" }}
      onTouchStartCapture={
        Platform.OS === "web"
          ? undefined
          : (e) => {
              setDown(true);
              setP({
                x: e.nativeEvent.pageX,
                y: e.nativeEvent.pageY,
              });
            }
      }
      onTouchMoveCapture={
        Platform.OS === "web"
          ? undefined
          : (e) => {
              setP({
                x: e.nativeEvent.pageX,
                y: e.nativeEvent.pageY,
              });
            }
      }
      onTouchEndCapture={
        Platform.OS === "web" ? undefined : () => setDown(false)
      }
      onTouchCancelCapture={
        Platform.OS === "web" ? undefined : () => setDown(false)
      }
    >
      {/* Header fixed at the top */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <HeaderBar />
      </View>

      {/* Achievements ↔ coins glue + auto tracking */}
      <AchievementsCoinsBridge />
      <AchievementsAutoTracker />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: "#00e5ff",
          tabBarInactiveTintColor: "rgba(0,229,255,0.7)",
          tabBarStyle: {
            height: 68,
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          sceneStyle: {
            backgroundColor: "transparent",
            paddingTop: HEADER_HEIGHT,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.5,
          },
          tabBarButton: (props) => (
            <Pressable
              {...props}
              onPress={(e) => {
                if (Platform.OS !== "web") {
                  // haptics for tab presses (kept light)
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                props.onPress?.(e);
              }}
            />
          ),
        }}
        tabBar={(props) => <ScrollableTabBar {...props} />}
      >
        <Tabs.Screen
          name="ask"
          options={{
            title: "ASK",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="chatbubbles-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="flashcards"
          options={{
            title: "FLASHCARDS",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="albums-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="quiz"
          options={{
            title: "QUIZ",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="help-circle-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="brainteasers"
          options={{
            title: "BRAINTEASERS",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bulb-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: "SHOP",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="bag-handle-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="achievements"
          options={{
            title: "ACHIEVEMENTS",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "HISTORY",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="relax"
          options={{
            title: "RELAX",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="sparkles-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "ACCOUNT",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="person-circle-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="certificates"
          options={{
            title: "CERTIFICATES",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="ribbon-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="collections"
          options={{
            title: "COLLECTIONS",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="bookmarks-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="purchases"
          options={{
            title: "PURCHASES",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bag" color={color} size={size} />
            ),
          }}
        />
      </Tabs>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <FxOverlay />
        {Platform.OS === "web" ? <StarTrailOverlay /> : null}
        {Platform.OS !== "web" ? (
          <TouchCursorOverlay p={p} down={down} />
        ) : null}
      </View>

      {celebrate ? (
        <CelebrateToast
          message={celebrate}
          onClose={() => setCelebrate(null)}
        />
      ) : null}
    </View>
  );
}

export const S = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    minWidth: 240,
    maxWidth: 340,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.7)",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    backgroundColor: "rgba(0,12,20,0.88)",
  },
  toastText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  closeBtn: { position: "absolute", right: 10, top: 6, padding: 4 },
  closeText: { color: "white", fontSize: 22, lineHeight: 22 },
});
