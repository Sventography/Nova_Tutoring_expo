import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { askNova } from "../_lib/ai";

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
    } catch (e: any) {
      const msg =
        e?.message === "NO_OPENAI_KEY"
          ? "Missing OpenAI API key. Set EXPO_PUBLIC_OPENAI_API_KEY in your env."
          : e?.message || "Something went wrong.";
      setError(msg);
      // keep the conversation intact, just show an inline error bubble
      setMessages((m) => [
        ...m,
        { id: String(Date.now() + 2), role: "system", text: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 10);
    }
  }, [input, loading]);

  const renderItem = ({ item }: { item: Msg }) => {
    const isUser = item.role === "user";
    const isSys = item.role === "system";
    const bg = isSys
      ? "rgba(255,235,59,0.15)"
      : isUser
      ? "rgba(0,229,255,0.12)"
      : "rgba(92,252,200,0.12)";
    const border = isSys
      ? "#ffeb3b"
      : isUser
      ? "#00e5ff"
      : "#5cfcc8";
    const color = isSys ? "#c09300" : "#cfeaf0";
    const align = isUser ? "flex-end" : "flex-start";

    return (
      <View style={{ paddingHorizontal: 12, marginVertical: 6, width: "100%", alignItems: align }}>
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
          <Text style={{ color, fontSize: 15, lineHeight: 20 }}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={["#000000", "#001822"]} style={{ flex: 1 }}>
      {/* top bar with counter */}
      <View style={{ padding: 12, paddingBottom: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "#cfeaf0", fontWeight: "800", fontSize: 20 }}>Ask Nova</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="help-buoy" size={16} color="#00e5ff" />
          <Text style={{ color: "#98c7d1", fontWeight: "700" }}>Questions today: {count}</Text>
        </View>
      </View>

      {/* list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: 80 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {/* input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <View style={{ padding: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#204853",
              backgroundColor: "rgba(255,255,255,0.03)",
              paddingHorizontal: 8,
            }}
          >
            <TextInput
              placeholder="Ask me anything…"
              placeholderTextColor="#678a94"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              style={{ flex: 1, color: "#cfeaf0", paddingVertical: 10 }}
              editable={!loading}
            />
            <Pressable onPress={send} disabled={loading || !input.trim()}>
              {loading ? (
                <ActivityIndicator color="#00e5ff" />
              ) : (
                <Ionicons name="arrow-up-circle" size={28} color={input.trim() ? "#00e5ff" : "#294b55"} />
              )}
            </Pressable>
          </View>
          {error ? <Text style={{ color: "#ffa7a7", marginTop: 6 }}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
