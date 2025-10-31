import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, SectionList, Platform, Animated, Easing, DeviceEventEmitter } from "react-native";
import { useAchievements, ACHIEVEMENT_EVENT } from "../context/AchievementsContext";
import { ACHIEVEMENTS, ACHIEVEMENT_LIST, SUBJECT_COLORS } from "../constants/achievements";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";

type Item = { id: string; title: string; desc?: string; coins: number; unlockedAt?: number };
type Section = { title: string; data: Item[] };

export default function AchievementsScreen() {
  const { unlocked } = useAchievements();
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    const onUnlocked = () => {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      try { confettiRef.current?.start?.(); } catch {}
    };
    const sub = DeviceEventEmitter.addListener(ACHIEVEMENT_EVENT, onUnlocked);
    if (Platform.OS === "web") {
      const handler = () => onUnlocked();
      window.addEventListener(ACHIEVEMENT_EVENT, handler as any);
      return () => { sub.remove(); window.removeEventListener(ACHIEVEMENT_EVENT, handler as any); };
    }
    return () => sub.remove();
  }, []);

  const sections: Section[] = useMemo(() => {
    const unlockedList: Item[] = [];
    const lockedList: Item[] = [];
    for (const a of ACHIEVEMENT_LIST) {
      const ts = (unlocked && unlocked[a.id]);
      const base = { id: a.id, title: a.title, desc: a.desc, coins: a.coins };
      if (ts) unlockedList.push({ ...base, unlockedAt: ts });
      else lockedList.push(base);
    }
    unlockedList.sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0));
    return [
      ...(unlockedList.length ? [{ title: "Unlocked Achievements", data: unlockedList }] : []),
      { title: unlockedList.length ? "More to Unlock" : "Achievements", data: lockedList },
    ];
  }, [unlocked]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ConfettiCannon ref={confettiRef} autoStart={false} fadeOut count={80} origin={{ x: 0, y: 0 }} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={S.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (<Text style={S.sectionTitle}>{section.title}</Text>)}
        renderItem={({ item }) =>
          item.unlockedAt ? <UnlockedCard item={item} /> : <LockedCard item={item} />
        }
        initialNumToRender={18}
        windowSize={10}
        maxToRenderPerBatch={24}
        removeClippedSubviews
      />
    </View>
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
function titleCase(s: string) { return s.replace(/\b\w/g, c => c.toUpperCase()).replace(/_/g, " "); }
function formatWhen(ts?: number) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return ""; }
}

/* ---------- cards ---------- */

function UnlockedCard({ item }: { item: Item }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    ).start();
  }, [pulse]);

  const borderOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const shadowRadius = pulse.interpolate({ inputRange: [0, 1], outputRange: [6, 12] });

  const subj = subjectFromId(item.id);

  return (
    <Animated.View style={[S.cardWrap, { shadowColor: "#00e5ff", shadowOpacity: 0.35, shadowRadius, shadowOffset: { width: 0, height: 0 } }]}>
      <LinearGradient colors={["#061325", "#0a1220"]} style={S.cardBg}>
        <LinearGradient colors={["#00e5ff", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.neonBorder} />
        <Animated.View style={[S.borderOverlay, { opacity: borderOpacity }]} />
        <View style={S.cardInner}>
          <View style={S.titleRow}>
            <Ionicons name="trophy" size={18} color="#00e5ff" />
            <Text style={S.title}>{item.title}</Text>
            {!!subj && <View style={S.pill}><Text style={S.pillText}>{titleCase(subj)}</Text></View>}
          </View>
          {!!item.desc && <Text style={S.desc}>{item.desc}</Text>}
          <View style={S.metaRow}>
            <View style={S.badge}>
              <Ionicons name="sparkles" size={14} color="#00e5ff" />
              <Text style={S.badgeText}>+{item.coins} coins</Text>
            </View>
            <Text style={S.whenText}>{formatWhen(item.unlockedAt)}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function LockedCard({ item }: { item: Item }) {
  const subj = subjectFromId(item.id);
  return (
    <View style={[S.cardWrap, { shadowColor: "#00e5ff", shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }]}>
      <LinearGradient colors={["#050b18", "#0a1220"]} style={S.cardBg}>
        <LinearGradient colors={["#009dc2", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.neonBorder} />
        <View style={S.cardInner}>
          <View style={S.titleRow}>
            <Ionicons name="lock-closed" size={18} color="#8aa3b1" />
            <Text style={S.title}>{item.title}</Text>
            {!!subj && <View style={[S.pill, { borderColor: "rgba(138,163,177,0.5)" }]}><Text style={[S.pillText, { color: "#b9ccd6" }]}>{titleCase(subj)}</Text></View>}
          </View>
          {!!item.desc && <Text style={S.descMuted}>{item.desc}</Text>}
          <View style={S.metaRow}>
            <View style={[S.badge, { borderColor: "rgba(138,163,177,0.35)" }]}>
              <Ionicons name="sparkles-outline" size={14} color="#8aa3b1" />
              <Text style={[S.badgeText, { color: "#8aa3b1" }]}>+{item.coins} coins</Text>
            </View>
            <Text style={[S.whenText, { color: "#8aa3b1" }]}>Locked</Text>
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
    color: "#cfeff6",
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
    borderColor: "rgba(0,229,255,0.6)",
    borderRadius: 14,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.9)",
    borderRadius: 14,
  },
  cardInner: { padding: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  title: { color: "#e9f4ff", fontWeight: "800" },
  desc: { color: "#9fdcf0", marginBottom: 8 },
  descMuted: { color: "#8aa3b1", marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(102,224,255,0.5)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { color: "#cfeff6", fontWeight: "700" },
  whenText: { color: "#66e0ff", fontWeight: "600" },
  pill: {
    marginLeft: 6,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(0,229,255,0.08)",
  },
  pillText: { color: "#9ff2ff", fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },
});
