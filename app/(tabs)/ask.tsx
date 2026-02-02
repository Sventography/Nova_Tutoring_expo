import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Animated,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { askNova } from "../_lib/ai";
import { useTheme } from "../context/ThemeContext";
import { useAchievements } from "../context/AchievementsContext";

/* ────────────────────────────────────────── */
/* ✨ Nova Thinking — Bounce + Dark Shimmer   */
/* ────────────────────────────────────────── */
function NovaThinking() {
  const shimmer = useRef(new Animated.Value(0)).current;

  // per-letter bounce anims
  const letters = "Nova is thinking…".split("");
  const bounces = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // shimmer loop
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: false,
      })
    );

    // staggered bounce loop
    const bounceLoop = Animated.loop(
      Animated.stagger(
        90,
        bounces.map((v) =>
          Animated.sequence([
            Animated.timing(v, {
              toValue: -4,
              duration: 260,
              useNativeDriver: true,
            }),
            Animated.timing(v, {
              toValue: 0,
              duration: 260,
              useNativeDriver: true,
            }),
          ])
        )
      )
    );

    shimmerLoop.start();
    bounceLoop.start();

    return () => {
      shimmerLoop.stop();
      bounceLoop.stop();
    };
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 220],
  });

  return (
    <View style={S.thinkingWrap}>
      <View style={S.textRow}>
        {letters.map((char, i) => (
          <Animated.Text
            key={i}
            style={[
              S.thinkingText,
              { transform: [{ translateY: bounces[i] }] },
            ]}
          >
            {char}
          </Animated.Text>
        ))}
      </View>

      {/* dark neutral underlay */}
      <View style={S.contrastUnderlay} pointerEvents="none" />

      {/* shimmer sweep */}
      <Animated.View
        pointerEvents="none"
        style={[
          S.shimmer,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(255,255,255,0.06)",
            "rgba(255,255,255,0.18)",
            "rgba(255,255,255,0.06)",
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={S.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
}
/* ────────────────────────────────────────── */

type Msg = { id: string; role: "user" | "assistant" | "system"; text: string };

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `@ask/count/${y}-${m}-${day}`;
};

async function loadCount(): Promise<number> {
  const v = await AsyncStorage.getItem(todayKey());
  return v ? parseInt(v, 10) : 0;
}
async function bumpCount() {
  const c = await loadCount();
  await AsyncStorage.setItem(todayKey(), String(c + 1));
  return c + 1;
}

export default function Ask() {
  const { tokens } = useTheme();
  const { onAskQuestion } = useAchievements();

  const gradient = tokens.gradient;
  const headerTextColor = tokens.text;
  const counterTextColor = tokens.cardText;
  const chipBorderColor = tokens.border;
  const chipBgColor = tokens.card;
  const inputBg = tokens.isDark
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.03)";
  const inputBorder = tokens.border;
  const placeholderColor = tokens.isDark ? "#678a94" : "#6b7685";
  const sendEnabledColor = tokens.accent;
  const sendDisabledColor = tokens.isDark ? "#294b55" : "#a0a8b2";

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "sys1",
      role: "assistant",
      text: "Hey! I’m Nova. Ask me anything — math, science, essays, you name it. 💫",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    loadCount().then(setCount).catch(() => {});
  }, []);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);

    setMessages((m) => [
      ...m,
      { id: String(Date.now()), role: "user", text: trimmed },
    ]);
    setInput("");

    try {
      const reply = await askNova(trimmed);
      setMessages((m) => [
        ...m,
        { id: String(Date.now() + 1), role: "assistant", text: reply },
      ]);

      const newCount = await bumpCount();
      setCount(newCount);
      onAskQuestion?.();
    } catch (e: any) {
      const msg = e?.message || "Something went wrong.";
      setError(msg);
      setMessages((m) => [
        ...m,
        { id: String(Date.now() + 2), role: "system", text: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 20);
    }
  }, [input, loading, onAskQuestion]);

  const renderItem = ({ item }: { item: Msg }) => {
    const isUser = item.role === "user";
    const isSys = item.role === "system";

    const bg = isSys
      ? "rgba(255,235,59,0.12)"
      : isUser
      ? "rgba(0,0,0,0.08)"
      : "rgba(0,0,0,0.06)";

    const border = isSys ? "#ffeb3b" : tokens.border;
    const color = isSys ? "#c09300" : tokens.text;
    const align = isUser ? "flex-end" : "flex-start";

    return (
      <View style={{ paddingHorizontal: 12, marginVertical: 6, width: "100%", alignItems: align }}>
        <View style={{ maxWidth: "88%", borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: bg, padding: 12 }}>
          <Text style={{ color, fontSize: 15, lineHeight: 20 }}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <View style={{ padding: 12, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: headerTextColor, fontWeight: "800", fontSize: 20 }}>
          Ask Nova
        </Text>
        <Text style={{ color: counterTextColor, fontWeight: "700", fontSize: 13 }}>
          Questions today: {count}
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListFooterComponent={loading ? <NovaThinking /> : null}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={{ padding: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: inputBorder, backgroundColor: inputBg, paddingHorizontal: 8 }}>
            <TextInput
              placeholder="Ask me anything…"
              placeholderTextColor={placeholderColor}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              style={{ flex: 1, color: tokens.text, paddingVertical: 10 }}
              editable={!loading}
            />
            <Pressable onPress={send} disabled={loading || !input.trim()}>
              <Ionicons
                name="arrow-up-circle"
                size={28}
                color={input.trim() ? sendEnabledColor : sendDisabledColor}
              />
            </Pressable>
          </View>
          {error ? <Text style={{ color: "#ffa7a7", marginTop: 6 }}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  thinkingWrap: {
    alignSelf: "center",
    marginVertical: 14,
    paddingHorizontal: 12,
    overflow: "hidden",
  },
  textRow: {
    flexDirection: "row",
  },
  thinkingText: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "700",
    fontSize: 16,
  },
  contrastUnderlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.24)",
    borderRadius: 8,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 220,
  },
  shimmerGradient: {
    width: 220,
    height: "100%",
  },
});
