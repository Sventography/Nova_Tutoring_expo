import React, { useEffect, useState } from "react";
import "../_dev/seed_coins"; // ✅ dev-only seed, safe import

import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemeProvider } from "../context/ThemeContext";
import { CursorProvider } from "../context/CursorContext";
import CursorOverlay from "../overlays/CursorOverlay";
import TouchCursorOverlay from "../overlays/TouchCursorOverlay";
import ScrollableTabBar from "../components/ScrollableTabBar";
import HeaderBar from "../components/HeaderBar";
import StarTrailOverlay from "../components/StarTrailOverlay";
import { AchieveEmitter } from "../context/AchievementsContext";
import { CollectionsProvider } from "../context/CollectionsContext";
import "../utils/_streak-autoboot";
import "../utils/streak-achievements-autoboot";
import ToastHost from "../components/ToastHost";
import "../utils/dev-expose";
import "../utils/achievements-smoketest";
import AchievementsAutoTracker from "../context/AchievementsAutoTracker";
import AchievementsCoinsBridge from "../context/AchievementsCoinsBridge";
import FxOverlay from "../components/FxOverlay";
import GlobalTextDefaults from "../components/GlobalTextDefaults";

type Pt = { x: number; y: number };

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

export default function TabsLayout() {
  const [celebrate, setCelebrate] = useState<string | null>(null);

  // ✅ global touch tracking for mobile cursor (safe: capture only)
  const [p, setP] = useState<Pt>({ x: -1, y: -1 });
  const [down, setDown] = useState(false);

  useEffect(() => {
    const sub = (msg: string) => {
      setCelebrate(msg || "🎉 Achievement unlocked!");
      const t = setTimeout(() => setCelebrate(null), 6000);
      return () => clearTimeout(t);
    };

    const listener = AchieveEmitter?.addListener?.("celebrate", sub);
    return () => listener?.remove?.();
  }, []);

  return (
    <ThemeProvider>
      <GlobalTextDefaults />
      <CursorProvider>
        <ToastHost />
        <CollectionsProvider>
          <View
            style={{ flex: 1, position: "relative" }}
            onTouchStartCapture={(e) => {
              setDown(true);
              setP({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
            }}
            onTouchMoveCapture={(e) => {
              setP({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
            }}
            onTouchEndCapture={() => setDown(false)}
            onTouchCancelCapture={() => setDown(false)}
          >
            <HeaderBar />
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
                sceneStyle: { backgroundColor: "transparent" },
                tabBarLabelStyle: {
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                },
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
              {/* ✅ This MUST map to app/(tabs)/quiz/index.tsx (NOT app/(tabs)/quiz.tsx) */}
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
                    <Ionicons
                      name="trophy-outline"
                      color={color}
                      size={size}
                    />
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
                    <Ionicons name="ribbon-outline" color={color} size={size} />
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

            {/* ✅ overlays must never steal taps */}
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

          {Platform.OS === "web" ? <CursorOverlay /> : null}
        </CollectionsProvider>
      </CursorProvider>
    </ThemeProvider>
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
