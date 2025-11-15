import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Platform,
  Animated,
  Easing,
  DeviceEventEmitter,
} from "react-native";
import {
  useAchievements,
  ACHIEVEMENT_EVENT,
} from "../context/AchievementsContext";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_LIST,
  SUBJECT_COLORS,
} from "../constants/achievements";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";

type Item = {
  id: string;
  title: string;
  desc?: string;
  coins: number;
  unlockedAt?: number;
};
type Section = { title: string; data: Item[] };

export default function AchievementsScreen() {
  const { unlocked } = useAchievements();
  const { tokens } = useTheme();
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    const onUnlocked = () => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      try {
        confettiRef.current?.start?.();
      } catch {}
    };
    const sub = DeviceEventEmitter.addListener(ACHIEVEMENT_EVENT, onUnlocked);
    if (Platform.OS === "web") {
      const handler = () => onUnlocked();
      // @ts-ignore
      window.addEventListener(ACHIEVEMENT_EVENT as any, handler as any);
      return () => {
        sub.remove();
        // @ts-ignore
        window.removeEventListener(ACHIEVEMENT_EVENT as any, handler as any);
      };
    }
    return () => sub.remove();
  }, []);

  const sections: Section[] = useMemo(() => {
    const unlockedList: Item[] = [];
    const lockedList: Item[] = [];
    for (const a of ACHIEVEMENT_LIST) {
      const ts = unlocked && unlocked[a.id];
      const base = {
        id: a.id,
        title: a.title,
        desc: a.desc,
        coins: a.coins,
      };
      if (ts) unlockedList.push({ ...base, unlockedAt: ts });
      else lockedList.push(base);
    }
    unlockedList.sort(
      (a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)
    );
    return [
      ...(unlockedList.length
        ? [{ title: "Unlocked Achievements", data: unlockedList }]
        : []),
      {
        title: unlockedList.length ? "More to Unlock" : "Achievements",
        data: lockedList,
      },
    ];
  }, [unlocked]);

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <ConfettiCannon
          ref={confettiRef}
          autoStart={false}
          fadeOut
          count={80}
          origin={{ x: 0, y: 0 }}
        />
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={S.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                S.sectionTitle,
                { color: tokens.text },
              ]}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) =>
            item.unlockedAt ? (
              <UnlockedCard item={item} tokens={tokens} />
            ) : (
              <LockedCard item={item} tokens={tokens} />
            )
          }
          initialNumToRender={18}
          windowSize={10}
          maxToRenderPerBatch={24}
          removeClippedSubviews
        />
      </View>
    </LinearGradient>
  );
}

/* ---------- helpers ---------- */

function subjectFromId(id: string): string | null {
  // quiz_<pct>                  -> no subject
  // quiz_<subject>_<pct>        -> subject
  // quiz_taken_<n>              -> no subject
  // quiz_taken_<subject>_<n>    -> subject
  if (!id.startsWith("quiz_")) return null;
  const parts = id.split("_"); // e.g., ["quiz","math","90"] or ["quiz","taken","science","10"]
  if (parts.length === 3) {
    const mid = parts[1];
    if (isNaN(Number(mid))) return mid; // quiz_<subject>_<pct>
  }
  if (parts.length === 4 && parts[1] === "taken") {
    const mid = parts[2];
    if (isNaN(Number(mid))) return mid; // quiz_taken_<subject>_<n>
  }
  return null;
}
function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/_/g, " ");
}
function formatWhen(ts?: number) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/* ---------- cards ---------- */

function UnlockedCard({ item, tokens }: { item: Item; tokens: any }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulse]);

  const borderOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  const shadowRadius = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 12],
  });

  const subj = subjectFromId(item.id);

  const bgColors = tokens.isDark
    ? [tokens.card, "#050b18"]
    : [tokens.card, "#f1f7ff"];

  return (
    <Animated.View
      style={[
        S.cardWrap,
        {
          shadowColor: tokens.accent,
          shadowOpacity: 0.35,
          shadowRadius,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      <LinearGradient colors={bgColors} style={S.cardBg}>
        <LinearGradient
          colors={[tokens.accent, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.neonBorder}
        />
        <Animated.View
          style={[
            S.borderOverlay,
            { opacity: borderOpacity, borderColor: tokens.accent },
          ]}
        />
        <View style={S.cardInner}>
          <View style={S.titleRow}>
            <Ionicons name="trophy" size={18} color={tokens.accent} />
            <Text
              style={[
                S.title,
                { color: tokens.text },
              ]}
            >
              {item.title}
            </Text>
            {!!subj && (
              <View
                style={[
                  S.pill,
                  {
                    borderColor: tokens.accent,
                    backgroundColor: tokens.isDark
                      ? "rgba(0,229,255,0.08)"
                      : "rgba(0,120,200,0.06)",
                  },
                ]}
              >
                <Text
                  style={[
                    S.pillText,
                    { color: tokens.accent },
                  ]}
                >
                  {titleCase(subj)}
                </Text>
              </View>
            )}
          </View>
          {!!item.desc && (
            <Text
              style={[
                S.desc,
                { color: tokens.cardText },
              ]}
            >
              {item.desc}
            </Text>
          )}
          <View style={S.metaRow}>
            <View
              style={[
                S.badge,
                { borderColor: tokens.accent },
              ]}
            >
              <Ionicons name="sparkles" size={14} color={tokens.accent} />
              <Text
                style={[
                  S.badgeText,
                  { color: tokens.text },
                ]}
              >
                +{item.coins} coins
              </Text>
            </View>
            <Text
              style={[
                S.whenText,
                { color: tokens.cardText },
              ]}
            >
              {formatWhen(item.unlockedAt)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function LockedCard({ item, tokens }: { item: Item; tokens: any }) {
  const subj = subjectFromId(item.id);

  const bgColors = tokens.isDark
    ? [tokens.card, "#050b18"]
    : [tokens.card, "#f1f7ff"];

  const muted = tokens.isDark
    ? "rgba(200,220,235,0.7)"
    : "rgba(40,60,80,0.8)";

  return (
    <View
      style={[
        S.cardWrap,
        {
          shadowColor: tokens.accent,
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      <LinearGradient colors={bgColors} style={S.cardBg}>
        <LinearGradient
          colors={[tokens.border, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.neonBorder}
        />
        <View style={S.cardInner}>
          <View style={S.titleRow}>
            <Ionicons name="lock-closed" size={18} color={muted} />
            <Text
              style={[
                S.title,
                { color: tokens.text },
              ]}
            >
              {item.title}
            </Text>
            {!!subj && (
              <View
                style={[
                  S.pill,
                  {
                    borderColor: muted,
                    backgroundColor: tokens.isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                  },
                ]}
              >
                <Text
                  style={[
                    S.pillText,
                    { color: muted },
                  ]}
                >
                  {titleCase(subj)}
                </Text>
              </View>
            )}
          </View>
          {!!item.desc && (
            <Text
              style={[
                S.descMuted,
                { color: muted },
              ]}
            >
              {item.desc}
            </Text>
          )}
          <View style={S.metaRow}>
            <View
              style={[
                S.badge,
                { borderColor: muted },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={14}
                color={muted}
              />
              <Text
                style={[
                  S.badgeText,
                  { color: muted },
                ]}
              >
                +{item.coins} coins
              </Text>
            </View>
            <Text
              style={[
                S.whenText,
                { color: muted },
              ]}
            >
              Locked
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

/* ---------- styles ---------- */

export const S = StyleSheet.create({
  listContent: { padding: 14, paddingBottom: 24 },
  sectionTitle: {
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  cardWrap: {
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: "transparent",
  },
  cardBg: {
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  neonBorder: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
    borderWidth: 1,
    borderRadius: 14,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 14,
  },
  cardInner: { padding: 12 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  title: { fontWeight: "800" },
  desc: { marginBottom: 8 },
  descMuted: { marginBottom: 8 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontWeight: "700" },
  whenText: { fontWeight: "600" },
  pill: {
    marginLeft: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pillText: { fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },
});
