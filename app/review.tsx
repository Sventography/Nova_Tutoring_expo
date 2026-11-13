import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "./context/ThemeContext";
import { useUser } from "./context/UserContext";
import { getTwentyCardsById } from "./_lib/cards20";
import { dueCards, nextReview, parseReviewSchedule, reviewCardKey, type ReviewRating, type ReviewRecord } from "./_lib/spacedReview";

const PREFIX = "@nova/spaced-review:v1:";

export default function SmartReview() {
  const router = useRouter();
  const { topicId = "", title = "Flashcards" } = useLocalSearchParams<{ topicId?: string; title?: string }>();
  const { tokens } = useTheme();
  const { supabaseUserId } = useUser() as { supabaseUserId?: string | null };
  const owner = supabaseUserId || "guest";
  const key = PREFIX + owner + ":" + String(topicId);
  const cards = useMemo(() => {
    try { return getTwentyCardsById(String(topicId)) || []; }
    catch { return []; }
  }, [topicId]);
  const [schedule, setSchedule] = useState<Record<string, ReviewRecord>>({});
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setRevealed(false);
    setSchedule({});
    setReviewed(0);
    setError(null);
    AsyncStorage.getItem(key)
      .then(raw => { if (active) setSchedule(parseReviewSchedule(raw)); })
      .catch(err => { console.warn("[SmartReview] read failed", err); if (active) setError("Review history could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [key]);

  const queue = useMemo(() => dueCards(cards, schedule), [cards, schedule]);
  const current = queue[0];
  const rate = async (rating: ReviewRating) => {
    if (!current || !revealed || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const updated = { ...schedule, [reviewCardKey(current)]: nextReview(schedule[reviewCardKey(current)], rating) };
    try {
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      setSchedule(updated);
      setRevealed(false);
      setReviewed(n => n + 1);
    } catch (err) {
      console.warn("[SmartReview] save failed", err);
      setError("Couldn't save this review. Please try again.");
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={S.wrap}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={S.back}>
          <Text style={[S.backText, { color: tokens.accent }]}>‹ Back to Flashcards</Text>
        </Pressable>
        <Text style={[S.heading, { color: tokens.text }]}>Smart Review</Text>
        <Text style={[S.subtitle, { color: tokens.cardText }]}>{title} · {reviewed} reviewed this session</Text>
        <Text style={[S.info, { color: tokens.cardText }]}>Answer from memory, then reveal the back. Cards you know return later; cards you miss return sooner.</Text>
        {loading ? <ActivityIndicator color={tokens.accent} /> : cards.length === 0 ? (
          <View style={[S.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text style={[S.prompt, { color: tokens.text }]}>No cards are available for this topic.</Text>
            <Text style={[S.info, { color: tokens.cardText }]}>Choose another topic from Flashcards.</Text>
          </View>
        ) : !current ? (
          <View style={[S.card, { backgroundColor: tokens.card, borderColor: tokens.accent }]}>
            <Text style={[S.prompt, { color: tokens.text }]}>You're all caught up!</Text>
            <Text style={[S.info, { color: tokens.cardText }]}>Great work. The cards you've reviewed will return when they're due.</Text>
          </View>
        ) : (
          <View style={[S.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Text style={[S.overline, { color: tokens.accent }]}>{queue.length} DUE · QUESTION</Text>
            <Text style={[S.prompt, { color: tokens.text }]}>{current.front}</Text>
            {revealed ? (
              <>
                <View style={[S.separator, { backgroundColor: tokens.border }]} />
                <Text style={[S.overline, { color: tokens.accent }]}>ANSWER</Text>
                <Text style={[S.answer, { color: tokens.text }]}>{current.back}</Text>
                <View style={S.buttons}>
                  <Pressable disabled={saving} onPress={() => { void rate("again"); }} style={[S.rateButton, { borderColor: tokens.border }]}>
                    <Text style={[S.rateText, { color: tokens.text }]}>Still learning</Text>
                    <Text style={[S.rateSub, { color: tokens.cardText }]}>Try in 10 min</Text>
                  </Pressable>
                  <Pressable disabled={saving} onPress={() => { void rate("got-it"); }} style={[S.rateButton, { borderColor: tokens.accent }]}>
                    <Text style={[S.rateText, { color: tokens.text }]}>Got it!</Text>
                    <Text style={[S.rateSub, { color: tokens.cardText }]}>Review later</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Pressable accessibilityRole="button" style={[S.primary, { backgroundColor: tokens.accent }]} onPress={() => setRevealed(true)}>
                <Text style={S.primaryText}>Reveal answer</Text>
              </Pressable>
            )}
          </View>
        )}
        {error ? <Text accessibilityRole="alert" style={[S.error, { color: tokens.text }]}>{error}</Text> : null}
        <Text style={[S.info, { color: tokens.cardText }]}>Your review schedule is saved on this device for this account. No coins are charged or awarded.</Text>
      </ScrollView>
    </LinearGradient>
  );
}
const S = StyleSheet.create({
  wrap: { padding: 18, paddingBottom: 56, gap: 12, width: "100%", maxWidth: 640, alignSelf: "center" },
  back: { paddingVertical: 8 },
  backText: { fontWeight: "800", fontSize: 15 },
  heading: { fontSize: 28, fontWeight: "900" },
  subtitle: { fontSize: 14, fontWeight: "700" },
  info: { fontSize: 14, lineHeight: 21 },
  card: { borderWidth: 1.5, borderRadius: 18, padding: 18, marginTop: 12, gap: 14 },
  overline: { fontSize: 12, fontWeight: "900", letterSpacing: 1.3 },
  prompt: { fontSize: 20, fontWeight: "800", lineHeight: 28 },
  separator: { height: 1 },
  answer: { fontSize: 17, lineHeight: 26 },
  primary: { borderRadius: 12, minHeight: 48, justifyContent: "center", alignItems: "center" },
  primaryText: { color: "#05202a", fontWeight: "900", fontSize: 16 },
  buttons: { flexDirection: "row", gap: 10 },
  rateButton: { flex: 1, borderWidth: 1.5, padding: 12, alignItems: "center", borderRadius: 12, gap: 4 },
  rateText: { fontWeight: "800", fontSize: 14 },
  rateSub: { fontSize: 12 },
  error: { borderRadius: 10, borderWidth: 1, borderColor: "#f97373", padding: 12 },
});
