import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Make sure useThemeContext is exported from ThemeContext
import useThemeContext from "./context/ThemeContext";

type Flashcard = { topic?: string; question: string; answer: string };

async function findFlashcards(q: string): Promise<Flashcard[]> {
  const raw = await AsyncStorage.getItem("flashcards");
  const items: Flashcard[] = raw ? JSON.parse(raw) : [];
  const s = q.toLowerCase();
  return items
    .filter(
      (fc) =>
        (fc.question || "").toLowerCase().includes(s) ||
        (fc.answer || "").toLowerCase().includes(s) ||
        (fc.topic || "").toLowerCase().includes(s),
    )
    .slice(0, 5);
}

async function fetchWiki(q: string): Promise<string> {
  try {
    const r = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
    );
    if (!r.ok) return "";
    const j = await r.json();
    return j?.extract || "";
  } catch {
    return "";
  }
}

async function askOpenAI(q: string, context: string): Promise<string> {
  try {
    const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
    if (!key) return "";
    const body = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Answer clearly. Prefer facts from the provided context. If unsure, say you’re unsure. Include short bullet points when helpful.",
        },
        { role: "user", content: `Question: ${q}\nContext:\n${context}` },
      ],
      temperature: 0.3,
    };
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return "";
    const j = await r.json();
    return j?.choices?.[0]?.message?.content?.trim?.() || "";
  } catch {
    return "";
  }
}

export default function AskScreen() {
  const { colors, spacing } = useThemeContext();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [fromFlash, setFromFlash] = useState<Flashcard[]>([]);
  const [fromWiki, setFromWiki] = useState("");

  const disabled = useMemo(() => !q.trim() || loading, [q, loading]);

  const onAsk = async () => {
    setLoading(true);
    setAnswer("");
    const [fc, wiki] = await Promise.all([
      findFlashcards(q.trim()),
      fetchWiki(q.trim()),
    ]);
    setFromFlash(fc);
    setFromWiki(wiki);
    const context = [
      fc.length
        ? `Flashcards:\n${fc.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n")}`
        : "",
      wiki ? `Wikipedia:\n${wiki}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const ai = await askOpenAI(q.trim(), context);
    const merged = [
      ai ? `AI:\n${ai}` : "",
      fc.length
        ? `Flashcards:\n${fc.map((f) => `• ${f.answer}`).join("\n")}`
        : "",
      wiki ? `Wikipedia:\n${wiki}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    setAnswer(merged || "No answer found.");
    setLoading(false);
  };

  const onDonate = async () => {
    await Linking.openURL("https://example.com/donate");
  };

  return (
    <View
      variant="bg"
      style={[
        styles.container,
        { backgroundColor: colors.background, padding: spacing.md },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Ask</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Ask anything…"
        placeholderTextColor="#888"
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.primary },
        ]}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        disabled={disabled}
        onPress={onAsk}
        style={({ pressed }) => [
          styles.askBtn,
          { opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
        ]}
      >
        <Text style={styles.askTxt}>Ask</Text>
      </Pressable>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={[styles.loadingTxt, { color: colors.text }]}>
            Thinking…
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.answerBox}>
          {!!answer && (
            <Text style={[styles.answer, { color: colors.text }]}>
              {answer}
            </Text>
          )}
          {!answer && (
            <Text style={{ color: colors.text, opacity: 0.7 }}>
              Your answer will appear here.
            </Text>
          )}
        </ScrollView>
      )}

      <Pressable onPress={onDonate} style={styles.donateWrap}>
        <LinearGradient
          colors={["#00aaff", "#00ffff", "#000000"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.donateGrad}
        >
          <Text style={styles.donateTxt}>Donate</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  askBtn: {
    backgroundColor: "#1f1f1f",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  askTxt: { color: "white", fontWeight: "600", fontSize: 16 },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  loadingTxt: { fontSize: 14 },
  answerBox: { paddingVertical: 10 },
  answer: { fontSize: 16, lineHeight: 22 },
  donateWrap: {
    position: "absolute",
    right: 16,
    bottom: 22,
    width: 140,
    height: 46,
    borderRadius: 14,
    overflow: "hidden",
  },
  donateGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  donateTxt: { color: "white", fontWeight: "800", letterSpacing: 0.5 },
});
