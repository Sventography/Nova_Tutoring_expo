// app/(tabs)/ask.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../context/ThemeContext";
import { useAchievements } from "../context/AchievementsContext";
import { useUser } from "../context/UserContext";
import { useIsland } from "../context/IslandContext";
import { usePurchases } from "../context/PurchasesContext";

/* ----------------------------- V1 LOCKS (GREY OUT) ----------------------------- */
const V1_LOCK_ASK_UPGRADES = true; // hides personality selector + shows memory "Coming soon"
/* ------------------------------------------------------------------------------ */

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
            style={[S.thinkingText, { transform: [{ translateY: bounces[i] }] }]}
          >
            {char}
          </Animated.Text>
        ))}
      </View>

      <View style={S.contrastUnderlay} pointerEvents="none" />

      <Animated.View pointerEvents="none" style={[S.shimmer, { transform: [{ translateX }] }]}>
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

type AskHistoryItem = {
  role: "user" | "assistant" | "system";
  content: string;
};

type AskApiResponse = {
  answer?: string;
  error?: string;
  coins_awarded?: number;
  ask_memory_tier?: string | null;
  ask_memory_limit?: number | null;
};

const BACKEND_BASE =
  (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "") ||
  "http://127.0.0.1:5055";

export type PersonalityKey =
  | "encouraging"
  | "calm_focus"
  | "coach"
  | "playful"
  | "storyteller";

async function callAskApi(
  question: string,
  history: AskHistoryItem[],
  personality: PersonalityKey,
  userId: string | null
): Promise<{ ok: boolean; data?: AskApiResponse; error?: string }> {
  try {
    const jwt = await AsyncStorage.getItem("auth.supabase.jwt");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

    const body: any = { question, history, personality };
    if (userId) body.user_id = userId;

    const res = await fetch(`${BACKEND_BASE}/api/ask`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as any;

    if (!res.ok || json.error) {
      return {
        ok: false,
        error: json.error || `Request failed (status ${res.status})`,
      };
    }

    return {
      ok: true,
      data: {
        answer: json.answer,
        error: json.error,
        coins_awarded: json.coins_awarded,
        ask_memory_tier: json.ask_memory_tier ?? null,
        ask_memory_limit:
          typeof json.ask_memory_limit === "number" ? json.ask_memory_limit : null,
      },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error while calling /api/ask" };
  }
}

/* ────────────────────────────────────────── */
/* 🧠 Ask personalities (gated by purchases) */
/* ────────────────────────────────────────── */

type PersonalityOption = {
  key: PersonalityKey;
  label: string;
  subtitle?: string;
  sku?: string | null; // null => always free
};

const PERSONALITY_OPTIONS: PersonalityOption[] = [
  { key: "encouraging", label: "Encouraging", subtitle: "Default Nova vibe", sku: null },
  { key: "calm_focus", label: "Calm Focus", subtitle: "Steady, clear explanations", sku: "ask_personality_calm_focus" },
  { key: "coach", label: "Coach", subtitle: "Direct, motivating guidance", sku: "ask_personality_coach" },
  { key: "playful", label: "Playful", subtitle: "Light, fun & supportive", sku: "ask_personality_playful" },
  { key: "storyteller", label: "Storyteller", subtitle: "Analogy-rich explanations", sku: "ask_personality_storyteller" },
];

const AskPersonalitySelector = ({
  value,
  onChange,
}: {
  value: PersonalityKey;
  onChange: (key: PersonalityKey) => void;
}) => {
  // v1 lock: hide entirely
  if (V1_LOCK_ASK_UPGRADES) return null;

  const { tokens } = useTheme() as any;
  const purchases = (usePurchases() || {}) as any;
  const { isOwned, owned } = purchases;

  const hasSku = (sku?: string | null) => {
    if (!sku) return true;
    if (typeof isOwned === "function") return !!isOwned(sku);
    if (owned && typeof owned === "object") return !!owned[sku];
    return false;
  };

  const unlocked = PERSONALITY_OPTIONS.filter((opt) => hasSku(opt.sku));
  if (!unlocked || unlocked.length <= 1) return null;

  const accent = tokens?.accent || "#22d3ee";
  const text = tokens?.text || "#e5e7eb";
  const textDim = tokens?.cardText || "#9ca3af";
  const chipBgInactive = tokens?.isDark ? "rgba(0,0,0,0.40)" : "rgba(255,255,255,0.14)";
  const chipBgActive = tokens?.isDark ? "rgba(0,0,0,0.70)" : "rgba(255,255,255,0.92)";
  const chipTextActive = tokens?.isDark ? accent : "#0f172a";

  return (
    <View style={S.personalityRow}>
      <Text style={[S.personalityLabel, { color: textDim }]}>Nova mode</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.personalityChips}>
        {unlocked.map((opt) => {
          const active = opt.key === value;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onChange(opt.key)}
              style={[
                S.personalityChip,
                {
                  borderColor: active ? accent : "rgba(148,163,184,0.50)",
                  backgroundColor: active ? chipBgActive : chipBgInactive,
                },
              ]}
            >
              <Text style={[S.personalityChipText, { color: active ? chipTextActive : text }]}>
                {opt.label}
              </Text>
              {opt.subtitle ? (
                <Text style={{ fontSize: 10, marginTop: 2, color: active ? chipTextActive : textDim }}>
                  {opt.subtitle}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

/* ────────────────────────────────────────── */

const todayKey = () => {
  const d = new Date();
  return `@ask/count/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

function buildHistoryFromMessages(msgs: Msg[]): AskHistoryItem[] {
  const relevant = msgs.filter((m) => m.role === "user" || m.role === "assistant");
  return relevant.map((m) => ({ role: m.role, content: m.text }));
}

function prettyMemoryTier(tier: string | null, limit: number | null): string {
  // v1 lock: always show coming soon
  if (V1_LOCK_ASK_UPGRADES) return "Ask memory: Coming soon";

  const t = (tier || "free").toLowerCase();
  let label = "Free memory";

  if (t === "tier1" || t === "tier_1") label = "Tier 1 • Nova Notes";
  else if (t === "tier2" || t === "tier_2") label = "Tier 2 • Nova Journal";
  else if (t === "tier3" || t === "tier_3") label = "Tier 3 • Nova Vault";
  else if (t === "tier4" || t === "tier_4") label = "Tier 4 • Nova Galaxy Archive";

  if (limit != null && Number.isFinite(limit) && limit > 0) {
    return `${label} • remembers ~${limit} msgs`;
  }
  return label;
}

export default function Ask() {
  const { tokens } = useTheme() as any;
  const { onAskQuestion } = useAchievements() as any;
  const {
    supabaseUserId,
    askPersonality,
    setAskPersonality,
    askMemoryTier,
    askMemoryLimit,
  } = useUser() as any;
  const { addIslandXp } = useIsland() as any;

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

  const [memoryTier, setMemoryTier] = useState<string | null>(null);
  const [memoryLimit, setMemoryLimit] = useState<number | null>(null);

  const listRef = useRef<FlatList<Msg>>(null);

  const validKeys = PERSONALITY_OPTIONS.map((o) => o.key);

  // v1 lock: force encouraging
  const activePersonality: PersonalityKey = V1_LOCK_ASK_UPGRADES
    ? "encouraging"
    : validKeys.includes(askPersonality as PersonalityKey)
    ? (askPersonality as PersonalityKey)
    : "encouraging";

  useEffect(() => {
    loadCount().then(setCount).catch(() => {});
  }, []);

  useEffect(() => {
    setMemoryTier(askMemoryTier || "free");
    setMemoryLimit(typeof askMemoryLimit === "number" ? askMemoryLimit : null);
  }, [askMemoryTier, askMemoryLimit]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => showSub.remove();
  }, []);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages]);

  const send = useCallback(
    async () => {
      const trimmed = input.trim();
      if (!trimmed || loading) return;

      setLoading(true);
      setError(null);

      const historyPayload = buildHistoryFromMessages(messages);

      const userMsg: Msg = {
        id: `${Date.now()}`,
        role: "user",
        text: trimmed,
      };

      setMessages((m) => [...m, userMsg]);
      setInput("");

      try {
        const apiRes = await callAskApi(trimmed, historyPayload, activePersonality, supabaseUserId);

        if (!apiRes.ok || !apiRes.data || !apiRes.data.answer) {
          setError(apiRes.error || "Something went wrong.");
        } else {
          const answer = apiRes.data.answer;

          setMessages((m) => [
            ...m,
            { id: `${Date.now() + 1}`, role: "assistant", text: answer },
          ]);

          if (!V1_LOCK_ASK_UPGRADES) {
            if (apiRes.data.ask_memory_tier != null) setMemoryTier(apiRes.data.ask_memory_tier);
            if (apiRes.data.ask_memory_limit != null) setMemoryLimit(apiRes.data.ask_memory_limit);
          }

          const newCount = await bumpCount();
          setCount(newCount);
          onAskQuestion?.();

          // XP drip is okay to keep (Island bar will be greyed in v1 anyway)
          try {
            await addIslandXp(2, "ask_answer", { source: "ask", length: answer.length });
          } catch (e) {
            console.warn("[Island] addIslandXp from Ask failed", e);
          }
        }
      } catch (e: any) {
        setError(e?.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, onAskQuestion, addIslandXp, activePersonality, supabaseUserId]
  );

  const renderItem = ({ item }: { item: Msg }) => {
    const isUser = item.role === "user";
    const align = isUser ? "flex-end" : "flex-start";

    return (
      <View style={{ paddingHorizontal: 12, marginVertical: 6, width: "100%", alignItems: align }}>
        <View
          style={{
            maxWidth: "88%",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: tokens.border,
            backgroundColor: isUser ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.06)",
            padding: 12,
          }}
        >
          <Text style={{ color: tokens.text, fontSize: 15 }}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const memoryText = prettyMemoryTier(memoryTier ?? askMemoryTier ?? "free", memoryLimit ?? askMemoryLimit ?? null);
  const currentPersonaLabel =
    PERSONALITY_OPTIONS.find((o) => o.key === activePersonality)?.label ?? "Encouraging";

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={115}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View
              style={{
                padding: 12,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <View>
                <Text style={{ color: tokens.text, fontWeight: "800", fontSize: 20 }}>
                  Ask Nova
                </Text>
                <Text style={{ color: tokens.cardText, fontWeight: "600", fontSize: 11, marginTop: 2 }}>
                  {memoryText}
                </Text>
                <Text style={{ color: tokens.cardText, fontWeight: "500", fontSize: 11, marginTop: 2 }}>
                  Nova mode: {currentPersonaLabel}
                  {V1_LOCK_ASK_UPGRADES ? " (Locked)" : ""}
                </Text>
              </View>

              <Text style={{ color: tokens.cardText, fontWeight: "700", fontSize: 13 }}>
                Questions today: {count}
              </Text>
            </View>

            {/* Selector hidden when v1 locked */}
            <AskPersonalitySelector
              value={activePersonality}
              onChange={(next) => {
                if (V1_LOCK_ASK_UPGRADES) return;
                if (next === activePersonality) return;
                setAskPersonality(next);
              }}
            />

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
                  backgroundColor: tokens.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  paddingHorizontal: 8,
                }}
              >
                <TextInput
                  placeholder="Ask me anything…"
                  placeholderTextColor={tokens.isDark ? "#678a94" : "#6b7685"}
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

              {error ? <Text style={{ color: "#ffa7a7", marginTop: 6 }}>{error}</Text> : null}
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
  personalityRow: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  personalityLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.9,
    marginBottom: 6,
  },
  personalityChips: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  personalityChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  personalityChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});