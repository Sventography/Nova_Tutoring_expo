// app/(tabs)/ask.tsx
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
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../context/ThemeContext";
import { useAchievements } from "../context/AchievementsContext";
import { useUser } from "../context/UserContext";
import { askNova, AskResponse } from "../utils/ask";
import { supabase } from "../lib/supabase";

/* ────────────────────────────────────────── */
/* ✨ Nova Thinking — Bounce + Dark Shimmer   */
/* ────────────────────────────────────────── */
function NovaThinking() {
  const shimmer = useRef(new Animated.Value(0)).current;
  const letters = "Nova is thinking…".split("");
  const bounces = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: false,
      })
    );

    const bounceLoop = Animated.loop(
      Animated.stagger(
        90,
        bounces.map((v) =>
          Animated.sequence([
            Animated.timing(v, {
              toValue: -4,
              duration: 260,
              useNativeDriver: false,
            }),
            Animated.timing(v, {
              toValue: 0,
              duration: 260,
              useNativeDriver: false,
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
  }, [bounces, shimmer]);

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

      <View style={S.contrastUnderlay} pointerEvents="none" />

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
  return `@ask/count/${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const { supabaseUserId } = useUser();

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

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    return () => showSub.remove();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, [messages]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    const userMsg: Msg = {
      id: `${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");

    try {
      const res: AskResponse = await askNova(trimmed, supabaseUserId);

      if (!res.ok || !res.answer) {
        setError(res.error || "Something went wrong.");
      } else {
        setMessages((m) => [
          ...m,
          {
            id: `${Date.now() + 1}`,
            role: "assistant",
            text: res.answer!,
          },
        ]);

        if (supabaseUserId) {
          await supabase.from("ask_messages").insert([
            { user_id: supabaseUserId, role: "user", content: trimmed },
            { user_id: supabaseUserId, role: "assistant", content: res.answer },
          ]);
        }

        const newCount = await bumpCount();
        setCount(newCount);
        onAskQuestion?.();
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, onAskQuestion, supabaseUserId]);

  const renderItem = ({ item }: { item: Msg }) => {
    const isUser = item.role === "user";
    const align = isUser ? "flex-end" : "flex-start";

    return (
      <View
        style={{
          paddingHorizontal: 12,
          marginVertical: 6,
          width: "100%",
          alignItems: align,
        }}
      >
        <View
          style={{
            maxWidth: "88%",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: tokens.border,
            backgroundColor: isUser
              ? "rgba(0,0,0,0.08)"
              : "rgba(0,0,0,0.06)",
            padding: 12,
          }}
        >
          <Text style={{ color: tokens.text, fontSize: 15 }}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={115}   // 👈 Raised slightly higher
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View
              style={{
                padding: 12,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: tokens.text,
                  fontWeight: "800",
                  fontSize: 20,
                }}
              >
                Ask Nova
              </Text>
              <Text
                style={{
                  color: tokens.cardText,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
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
              keyboardShouldPersistTaps="handled"
            />

            <View style={{ padding: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: tokens.border,
                  backgroundColor: tokens.isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.03)",
                  paddingHorizontal: 8,
                }}
              >
                <TextInput
                  placeholder="Ask me anything…"
                  placeholderTextColor={
                    tokens.isDark ? "#678a94" : "#6b7685"
                  }
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={send}
                  style={{
                    flex: 1,
                    color: tokens.text,
                    paddingVertical: 10,
                  }}
                  editable={!loading}
                />
                <Pressable
                  onPress={send}
                  disabled={loading || !input.trim()}
                >
                  <Ionicons
                    name="arrow-up-circle"
                    size={28}
                    color={
                      input.trim()
                        ? tokens.accent
                        : tokens.isDark
                        ? "#294b55"
                        : "#a0a8b2"
                    }
                  />
                </Pressable>
              </View>

              {error ? (
                <Text style={{ color: "#ffa7a7", marginTop: 6 }}>
                  {error}
                </Text>
              ) : null}
            </View>
          </View>
        </TouchableWithoutFeedback>
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