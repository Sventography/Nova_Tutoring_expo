import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "./context/ThemeContext";
import { getArgDiscoveryState, type ArgDiscoveryState } from "./utils/argState";
import { getArgEvidenceTrail } from "./_lib/argEvidenceTrail";

export default function ArchiveEvidenceScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const [state, setState] = useState<ArgDiscoveryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [hintVisible, setHintVisible] = useState(false);
  const [error, setError] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    setLoading(true);
    setHintVisible(false);
    setError(false);
    getArgDiscoveryState()
      .then(result => { if (alive) setState(result); })
      .catch(cause => {
        console.warn("[Archive] Unable to load evidence", cause);
        if (alive) { setState(null); setError(true); }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []));

  const trail = useMemo(() => state ? getArgEvidenceTrail(state) : null, [state]);

  return (
    <LinearGradient colors={tokens.gradient} style={S.page}>
      <ScrollView contentContainerStyle={S.container}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={S.back}>
          <Ionicons name="chevron-back" color={tokens.accent} size={21} />
          <Text style={[S.backText, { color: tokens.accent }]}>Back</Text>
        </Pressable>
        <Text style={[S.eyebrow, { color: tokens.accent }]}>RETAINED NOTES / N.V.</Text>
        <Text style={[S.title, { color: tokens.text }]}>Things left behind</Text>
        <Text style={[S.intro, { color: tokens.cardText }]}>
          These scraps were found in different places. Read them together; each answers something the previous one couldn't.
        </Text>
        {loading ? <ActivityIndicator color={tokens.accent} /> : error ? (
          <Text accessibilityRole="alert" style={[S.message, { color: tokens.text }]}>
            The notes couldn't be loaded. Return to the Island and try again.
          </Text>
        ) : !trail || trail.found.length === 0 ? (
          <View style={[S.panel, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text style={[S.text, { color: tokens.text }]}>No notes recovered yet.</Text>
            <Text style={[S.small, { color: tokens.cardText }]}>
              The Island contains more than decorations, but nothing here will spoil it in advance.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[S.count, { color: tokens.cardText }]}>
              {trail.found.length} retained · {trail.completed ? "FILE 01 PRESERVED" : "INCOMPLETE"}
            </Text>
            {trail.found.map((item, index) => (
              <View key={item.id} style={[S.panel, { backgroundColor: tokens.card, borderColor: index === trail.found.length - 1 ? tokens.accent : tokens.border }]}>
                <Text style={[S.itemTitle, { color: tokens.accent }]}>{item.title}</Text>
                <Text style={[S.text, { color: tokens.text }]}>{item.observation}</Text>
              </View>
            ))}
            <View style={[S.next, { borderColor: tokens.border }]}>
              <Text style={[S.nextLabel, { color: tokens.accent }]}>
                {trail.completed ? "STILL UNANSWERED" : "THE QUESTION THAT REMAINS"}
              </Text>
              <Text style={[S.question, { color: tokens.text }]}>{trail.nextQuestion}</Text>
              {!trail.completed ? (
                <Pressable onPress={() => setHintVisible(current => !current)} accessibilityRole="button" accessibilityState={{ expanded: hintVisible }} style={S.hintButton}>
                  <Ionicons name={hintVisible ? "chevron-up" : "help-circle-outline"} color={tokens.accent} size={17}/>
                  <Text style={[S.hintLabel, { color: tokens.accent }]}>
                    {hintVisible ? "Hide nudge" : "Need a small nudge?"}
                  </Text>
                </Pressable>
              ) : null}
              {hintVisible && !trail.completed ? <Text style={[S.small, { color: tokens.cardText }]}>{trail.nextNudge}</Text> : null}
            </View>
            <Pressable onPress={() => router.push("/ask" as any)} accessibilityRole="button" style={[S.ask, { borderColor: tokens.accent }]}>
              <Ionicons name="chatbubble-ellipses-outline" color={tokens.accent} size={18}/>
              <Text style={[S.askText, { color: tokens.text }]}>Ask Nova</Text>
            </Pressable>
          </>
        )}
        <Text style={[S.footer, { color: tokens.cardText }]}>The notes are optional. You don't need to purchase anything to follow them.</Text>
      </ScrollView>
    </LinearGradient>
  );
}
const S = StyleSheet.create({
  page: { flex: 1 },
  container: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 65, gap: 14 },
  back: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  backText: { fontSize: 14, fontWeight: "800" },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1.4, marginTop: 12 },
  title: { fontSize: 27, fontWeight: "900" },
  intro: { fontSize: 14, lineHeight: 22 },
  count: { fontSize: 12, fontWeight: "700" },
  panel: { borderRadius: 14, borderWidth: 1.3, padding: 16, gap: 9 },
  itemTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  text: { fontSize: 15, lineHeight: 23 },
  small: { fontSize: 13, lineHeight: 20 },
  message: { fontSize: 15, lineHeight: 22 },
  next: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  nextLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  question: { fontSize: 18, fontWeight: "700", lineHeight: 26 },
  hintButton: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 7 },
  hintLabel: { fontWeight: "800", fontSize: 14 },
  ask: { borderWidth: 1.3, borderRadius: 12, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  askText: { fontSize: 15, fontWeight: "800" },
  footer: { fontSize: 12, lineHeight: 18, textAlign: "center" },
});
