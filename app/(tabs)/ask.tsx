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
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { askNova } from "../_lib/ai";
import { useTheme } from "../context/ThemeContext";
import { useAchievements } from "../context/AchievementsContext";

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

  // --- theme-driven colors
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
    const userMsg: Msg = { id: String(Date.now()), role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 10);

    try {
      const reply = await askNova(trimmed);
      const aiMsg: Msg = {
        id: String(Date.now() + 1),
        role: "assistant",
        text: reply,
      };
      setMessages((m) => [...m, aiMsg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 10);

      const newCount = await bumpCount();
      setCount(newCount);

      // fire Ask achievements
      try {
        onAskQuestion?.();
      } catch (e) {
        console.log("[Ask] onAskQuestion error", e);
      }
    } catch (e: any) {
      const msg =
        e?.message === "NO_OPENAI_KEY"
          ? "Missing OpenAI API key. Set EXPO_PUBLIC_OPENAI_API_KEY in your env."
          : e?.message || "Something went wrong.";
      setError(msg);
      setMessages((m) => [
        ...m,
        { id: String(Date.now() + 2), role: "system", text: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 10);
    }
  }, [input, loading, onAskQuestion]);

  const renderItem = ({ item }: { item: Msg }) => {
    const isUser = item.role === "user";
    const isSys = item.role === "system";

    const bg = isSys
      ? "rgba(255,235,59,0.12)"
      : isUser
      ? "rgba(0,229,255,0.10)"
      : "rgba(92,252,200,0.10)";

    const border = isSys ? "#ffeb3b" : tokens.border;
    const color = isSys ? "#c09300" : tokens.text;
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
            borderColor: border,
            backgroundColor: bg,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color, fontSize: 15, lineHeight: 20 }}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      {/* top bar with counter */}
      <View
        style={{
          padding: 12,
          paddingBottom: 4,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: headerTextColor,
            fontWeight: "800",
            fontSize: 20,
          }}
        >
          Ask Nova
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: chipBorderColor,
            backgroundColor: chipBgColor,
          }}
        >
          <Ionicons name="help-buoy" size={16} color={tokens.accent} />
          <Text
            style={{
              color: counterTextColor,
              fontWeight: "700",
              fontSize: 13,
            }}
          >
            Questions today: {count}
          </Text>
        </View>
      </View>

      {/* list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: 80,
        }}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={{ padding: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: inputBorder,
              backgroundColor: inputBg,
              paddingHorizontal: 8,
            }}
          >
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
              {loading ? (
                <ActivityIndicator color={tokens.accent} />
              ) : (
                <Ionicons
                  name="arrow-up-circle"
                  size={28}
                  color={input.trim() ? sendEnabledColor : sendDisabledColor}
                />
              )}
            </Pressable>
          </View>
          {error ? (
            <Text style={{ color: "#ffa7a7", marginTop: 6 }}>{error}</Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
