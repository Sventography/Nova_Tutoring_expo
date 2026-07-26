// app/(tabs)/ask.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Modal,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../context/ThemeContext";
import { useAchievements } from "../context/AchievementsContext";
import { useUser } from "../context/UserContext";
import { useIsland } from "../context/IslandContext";
import { usePurchases } from "../context/PurchasesContext";

/* ────────────────────────────────────────── */
/* ✨ Nova Thinking — Bounce + Dark Shimmer   */
/* ────────────────────────────────────────── */
function NovaThinking({
  experience,
}: {
  experience: PersonalityOption;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const letters = experience.thinkingText.split("");
  const bounces = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: experience.key === "calm_focus" ? 2400 : 1800,
        useNativeDriver: false,
      })
    );

    const bounceLoop = Animated.loop(
      Animated.stagger(
        experience.key === "calm_focus" ? 125 : 90,
        bounces.map((v) =>
          Animated.sequence([
            Animated.timing(v, {
              toValue: experience.key === "calm_focus" ? -2 : -4,
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
  }, [bounces, experience.key, shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-260, 260],
  });

  return (
    <View
      style={[
        S.thinkingWrap,
        {
          borderColor: experience.accent,
          backgroundColor: experience.tintDark,
        },
      ]}
    >
      <View style={S.textRow}>
        {letters.map((char, i) => (
          <Animated.Text
            key={`${experience.key}-${i}`}
            style={[
              S.thinkingText,
              {
                color: experience.accent,
                transform: [{ translateY: bounces[i] }],
              },
            ]}
          >
            {char}
          </Animated.Text>
        ))}
      </View>

      <Animated.View
        pointerEvents="none"
        style={[S.shimmer, { transform: [{ translateX }] }]}
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(255,255,255,0.04)",
            "rgba(255,255,255,0.18)",
            "rgba(255,255,255,0.04)",
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

type Msg = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  personality?: PersonalityKey;
};

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
  ask_personality?: PersonalityKey | null;
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
        ask_memory_limit: (() => {
          const parsed = Number(json.ask_memory_limit);
          return Number.isFinite(parsed) ? parsed : null;
        })(),
        ask_personality:
          typeof json.ask_personality === "string"
            ? (json.ask_personality as PersonalityKey)
            : null,
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
  tagline: string;
  description: string;
  sku?: string | null;
  icon: string;
  accent: string;
  tintDark: string;
  tintLight: string;
  thinkingText: string;
  greeting: string;
  switchMessage: string;
  placeholder: string;
  behaviors: string[];
};

const PERSONALITY_OPTIONS: PersonalityOption[] = [
  {
    key: "encouraging",
    label: "Encouraging",
    tagline: "Your warm, patient study partner",
    description:
      "Supportive explanations, gentle corrections, and low-pressure check-ins.",
    sku: null,
    icon: "heart-outline",
    accent: "#22d3ee",
    tintDark: "rgba(34,211,238,0.12)",
    tintLight: "rgba(14,165,233,0.10)",
    thinkingText: "Encouraging Nova is thinking…",
    greeting:
      "Hey! I’m Encouraging Nova. Ask me anything, and we’ll work through it together without judgment. 💫",
    switchMessage:
      "Warm guidance is on. I’ll explain clearly, correct gently, and keep the pressure low.",
    placeholder: "What can we work through together?",
    behaviors: [
      "Gentle, useful corrections",
      "Friendly step-by-step help",
      "Supportive check-ins",
    ],
  },
  {
    key: "calm_focus",
    label: "Calm Focus",
    tagline: "A quiet study room in your pocket",
    description:
      "Minimal distractions, short steps, and exactly one clear next action.",
    sku: "ask_personality_calm_focus",
    icon: "moon-outline",
    accent: "#60a5fa",
    tintDark: "rgba(96,165,250,0.13)",
    tintLight: "rgba(59,130,246,0.10)",
    thinkingText: "Calm Focus Nova is organizing the next step…",
    greeting:
      "Calm Focus Nova is ready. We’ll take one concept at a time, with no clutter and no rush.",
    switchMessage:
      "Quiet study mode is active: concise steps, no jokes, and one next action at a time.",
    placeholder: "What should we focus on first?",
    behaviors: [
      "No jokes, hype, or clutter",
      "Up to four concise steps",
      "One clear next action",
    ],
  },
  {
    key: "coach",
    label: "Coach",
    tagline: "Turn every question into forward motion",
    description:
      "Goal-driven explanations, punchy game plans, and a challenge to finish.",
    sku: "ask_personality_coach",
    icon: "flash-outline",
    accent: "#fb923c",
    tintDark: "rgba(251,146,60,0.14)",
    tintLight: "rgba(249,115,22,0.10)",
    thinkingText: "Coach Nova is building your game plan…",
    greeting:
      "Coach Nova is in! Bring me the problem—we’ll set the goal, build the plan, and get you moving. ⚡",
    switchMessage:
      "Coach mode is active: clear goals, direct strategy, and a small challenge at the end.",
    placeholder: "What are we tackling today?",
    behaviors: [
      "A concrete goal",
      "A punchy game plan",
      "A practical “Your Move”",
    ],
  },
  {
    key: "playful",
    label: "Playful",
    tagline: "Learning with jokes, games, and weird examples",
    description:
      "Silly comparisons, memorable mini-games, and accurate explanations underneath.",
    sku: "ask_personality_playful",
    icon: "game-controller-outline",
    accent: "#f472b6",
    tintDark: "rgba(244,114,182,0.14)",
    tintLight: "rgba(236,72,153,0.10)",
    thinkingText: "Playful Nova is inventing something ridiculous…",
    greeting:
      "Playful Nova reporting for duty! Let’s turn your question into something weird enough to remember. 🎮✨",
    switchMessage:
      "Playful mode is active: expect silly metaphors, mini-games, and a quick challenge.",
    placeholder: "What should we make fun to learn?",
    behaviors: [
      "Funny, relevant metaphors",
      "Game-like explanations",
      "A playful quick challenge",
    ],
  },
  {
    key: "storyteller",
    label: "Storyteller",
    tagline: "Learn it as a world you can picture",
    description:
      "Short scenes and recurring metaphors, followed by the real academic meaning.",
    sku: "ask_personality_storyteller",
    icon: "book-outline",
    accent: "#a78bfa",
    tintDark: "rgba(167,139,250,0.15)",
    tintLight: "rgba(139,92,246,0.10)",
    thinkingText: "Storyteller Nova is setting the scene…",
    greeting:
      "Storyteller Nova is ready. Give me a concept, and I’ll turn it into a scene you can see—and then decode it with you. 📖",
    switchMessage:
      "Storyteller mode is active: a vivid scene first, then the exact meaning behind it.",
    placeholder: "What concept should become a story?",
    behaviors: [
      "A vivid mini-story",
      "Story-to-concept mapping",
      "A plain-language takeaway",
    ],
  },
];

function getPersonalityOption(
  key: PersonalityKey | null | undefined
): PersonalityOption {
  return (
    PERSONALITY_OPTIONS.find((option) => option.key === key) ??
    PERSONALITY_OPTIONS[0]
  );
}

const AskPersonalitySelector = ({
  value,
  onChange,
  disabled = false,
}: {
  value: PersonalityKey;
  onChange: (key: PersonalityKey) => void | Promise<void>;
  disabled?: boolean;
}) => {
  const { tokens } = useTheme() as any;
  const purchaseContext = (usePurchases() || {}) as any;
  const {
    isOwned,
    owned,
    purchases,
    purchasesReady = true,
    isAskPersonalityOwned,
  } = purchaseContext;

  const [open, setOpen] = useState(false);

  const hasOption = useCallback(
    (option: PersonalityOption) => {
      if (!option.sku || option.key === "encouraging") return true;

      if (typeof isAskPersonalityOwned === "function") {
        return !!isAskPersonalityOwned(option.key);
      }

      if (typeof isOwned === "function" && isOwned(option.sku)) {
        return true;
      }

      const maps = [owned, purchases];

      return maps.some(
        (map) =>
          map &&
          typeof map === "object" &&
          (map[option.sku as string] ||
            map[(option.sku as string).replace(/_/g, "-")] ||
            map[(option.sku as string).replace(/-/g, "_")])
      );
    },
    [isAskPersonalityOwned, isOwned, owned, purchases]
  );

  const unlocked = useMemo(
    () => PERSONALITY_OPTIONS.filter(hasOption),
    [hasOption]
  );

  const selected =
    unlocked.find((option) => option.key === value) ??
    PERSONALITY_OPTIONS[0];

  const text = tokens?.text || "#e5e7eb";
  const textDim = tokens?.cardText || "#9ca3af";
  const surface = tokens?.isDark
    ? "rgba(2,6,23,0.99)"
    : "rgba(255,255,255,0.99)";

  const choose = async (key: PersonalityKey) => {
    setOpen(false);
    if (key === value || disabled) return;
    await onChange(key);
  };

  return (
    <View style={S.personalityRow}>
      <Text style={[S.personalityLabel, { color: textDim }]}>
        Nova experience
      </Text>

      <Pressable
        disabled={disabled || !purchasesReady}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          S.personalityDropdown,
          {
            borderColor: selected.accent,
            backgroundColor: tokens?.isDark
              ? selected.tintDark
              : selected.tintLight,
            opacity:
              disabled || !purchasesReady
                ? 0.65
                : pressed
                ? 0.86
                : 1,
          },
        ]}
      >
        <View
          style={[
            S.personalityIcon,
            {
              borderColor: selected.accent,
              backgroundColor: tokens?.isDark
                ? "rgba(2,6,23,0.58)"
                : "rgba(255,255,255,0.72)",
            },
          ]}
        >
          <Ionicons
            name={selected.icon as any}
            size={21}
            color={selected.accent}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[S.personalityDropdownTitle, { color: text }]}>
            {selected.label} Nova
          </Text>
          <Text
            style={[
              S.personalityDropdownSubtitle,
              { color: selected.accent },
            ]}
          >
            {selected.tagline}
          </Text>
        </View>

        {disabled || !purchasesReady ? (
          <ActivityIndicator size="small" color={selected.accent} />
        ) : (
          <Ionicons
            name="chevron-down"
            size={20}
            color={selected.accent}
          />
        )}
      </Pressable>

      <View
        style={[
          S.experienceCard,
          {
            borderColor: `${selected.accent}88`,
            backgroundColor: tokens?.isDark
              ? "rgba(2,6,23,0.52)"
              : "rgba(255,255,255,0.60)",
          },
        ]}
      >
        <Text style={[S.experienceDescription, { color: text }]}>
          {selected.description}
        </Text>

        <View style={S.behaviorWrap}>
          {selected.behaviors.map((behavior) => (
            <View
              key={behavior}
              style={[
                S.behaviorPill,
                {
                  borderColor: `${selected.accent}88`,
                  backgroundColor: tokens?.isDark
                    ? selected.tintDark
                    : selected.tintLight,
                },
              ]}
            >
              <Text
                style={[
                  S.behaviorPillText,
                  { color: selected.accent },
                ]}
              >
                {behavior}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {!purchasesReady ? (
        <Text style={[S.personalityHint, { color: textDim }]}>
          Loading your purchased Nova experiences…
        </Text>
      ) : unlocked.length <= 1 ? (
        <Text style={[S.personalityHint, { color: textDim }]}>
          Unlock more Nova experiences in the Shop.
        </Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={S.personalityModalBackdrop}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              S.personalityModalCard,
              {
                backgroundColor: surface,
                borderColor: selected.accent,
              },
            ]}
          >
            <View style={S.personalityModalHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[S.personalityModalTitle, { color: text }]}
                >
                  Choose your Nova experience
                </Text>
                <Text
                  style={[
                    S.personalityModalSubtitle,
                    { color: textDim },
                  ]}
                >
                  Each one changes how Nova explains, structures, and
                  continues the conversation.
                </Text>
              </View>

              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={text} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 520 }}
              showsVerticalScrollIndicator={false}
            >
              {unlocked.map((option) => {
                const active = option.key === value;

                return (
                  <Pressable
                    key={option.key}
                    onPress={() => void choose(option.key)}
                    style={({ pressed }) => [
                      S.personalityOption,
                      {
                        borderColor: active
                          ? option.accent
                          : "rgba(148,163,184,0.34)",
                        backgroundColor: active
                          ? tokens?.isDark
                            ? option.tintDark
                            : option.tintLight
                          : pressed
                          ? tokens?.isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(15,23,42,0.05)"
                          : "transparent",
                      },
                    ]}
                  >
                    <View
                      style={[
                        S.personalityIcon,
                        {
                          borderColor: option.accent,
                          backgroundColor: tokens?.isDark
                            ? "rgba(2,6,23,0.58)"
                            : "rgba(255,255,255,0.72)",
                        },
                      ]}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={option.accent}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          S.personalityOptionTitle,
                          { color: text },
                        ]}
                      >
                        {option.label} Nova
                      </Text>
                      <Text
                        style={[
                          S.personalityOptionTagline,
                          { color: option.accent },
                        ]}
                      >
                        {option.tagline}
                      </Text>
                      <Text
                        style={[
                          S.personalityOptionSubtitle,
                          { color: textDim },
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>

                    <Ionicons
                      name={
                        active
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={22}
                      color={active ? option.accent : textDim}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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

function buildHistoryFromMessages(
  msgs: Msg[],
  limit: number | null | undefined
): AskHistoryItem[] {
  const relevant = msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.text }));

  const parsedLimit = Number(limit);
  const safeLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.floor(parsedLimit)
      : 5;

  return relevant.slice(-safeLimit);
}

function prettyMemoryTier(tier: string | null, limit: number | null): string {
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
  const {
    purchasesReady,
    isAskPersonalityOwned,
  } = usePurchases() as any;

  const validKeys = PERSONALITY_OPTIONS.map((option) => option.key);

  const storedPersonality: PersonalityKey = validKeys.includes(
    askPersonality as PersonalityKey
  )
    ? (askPersonality as PersonalityKey)
    : "encouraging";

  const activePersonality: PersonalityKey =
    storedPersonality === "encouraging" ||
    (typeof isAskPersonalityOwned === "function" &&
      isAskPersonalityOwned(storedPersonality))
      ? storedPersonality
      : "encouraging";

  const activeExperience = getPersonalityOption(activePersonality);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "sys1",
      role: "assistant",
      text: getPersonalityOption("encouraging").greeting,
      personality: "encouraging",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);

  const [memoryTier, setMemoryTier] = useState<string | null>(null);
  const [memoryLimit, setMemoryLimit] = useState<number | null>(null);
  const [personalitySaving, setPersonalitySaving] = useState(false);

  const listRef = useRef<FlatList<Msg>>(null);
  const initializedExperienceRef = useRef(false);
  const previousExperienceRef =
    useRef<PersonalityKey>("encouraging");

  useEffect(() => {
    loadCount().then(setCount).catch(() => {});
  }, []);

  useEffect(() => {
    setMemoryTier(askMemoryTier || "free");
    setMemoryLimit(typeof askMemoryLimit === "number" ? askMemoryLimit : null);
  }, [askMemoryTier, askMemoryLimit]);

  useEffect(() => {
    const experience = getPersonalityOption(activePersonality);

    if (!initializedExperienceRef.current) {
      initializedExperienceRef.current = true;
      previousExperienceRef.current = activePersonality;

      setMessages((current) => {
        const hasConversation = current.some(
          (message) => message.role === "user"
        );

        if (hasConversation) return current;

        return [
          {
            id: "sys1",
            role: "assistant",
            text: experience.greeting,
            personality: activePersonality,
          },
        ];
      });

      return;
    }

    if (previousExperienceRef.current === activePersonality) {
      return;
    }

    previousExperienceRef.current = activePersonality;

    setMessages((current) => [
      ...current,
      {
        id: `mode-${Date.now()}`,
        role: "system",
        text: `${experience.label} Nova activated — ${experience.switchMessage}`,
        personality: activePersonality,
      },
    ]);
  }, [activePersonality]);

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

      const effectiveMemoryLimit =
        memoryLimit ?? askMemoryLimit ?? 5;
      const historyPayload = buildHistoryFromMessages(
        messages,
        effectiveMemoryLimit
      );

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

          const responsePersonality =
            apiRes.data.ask_personality &&
            validKeys.includes(apiRes.data.ask_personality)
              ? apiRes.data.ask_personality
              : activePersonality;

          setMessages((m) => [
            ...m,
            {
              id: `${Date.now() + 1}`,
              role: "assistant",
              text: answer,
              personality: responsePersonality,
            },
          ]);

          if (apiRes.data.ask_memory_tier != null) {
            setMemoryTier(apiRes.data.ask_memory_tier);
          }

          if (apiRes.data.ask_memory_limit != null) {
            setMemoryLimit(apiRes.data.ask_memory_limit);
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
    [
      input,
      loading,
      messages,
      onAskQuestion,
      addIslandXp,
      activePersonality,
      supabaseUserId,
      memoryLimit,
      askMemoryLimit,
    ]
  );

  const renderItem = ({ item }: { item: Msg }) => {
    const isUser = item.role === "user";

    if (item.role === "system") {
      const systemExperience = getPersonalityOption(
        item.personality ?? activePersonality
      );

      return (
        <View style={S.modeChangeWrap}>
          <View
            style={[
              S.modeChangePill,
              {
                borderColor: systemExperience.accent,
                backgroundColor: tokens.isDark
                  ? systemExperience.tintDark
                  : systemExperience.tintLight,
              },
            ]}
          >
            <Ionicons
              name={systemExperience.icon as any}
              size={15}
              color={systemExperience.accent}
            />
            <Text
              style={[
                S.modeChangeText,
                { color: tokens.text },
              ]}
            >
              {item.text}
            </Text>
          </View>
        </View>
      );
    }

    const bubbleExperience = getPersonalityOption(
      item.personality ?? activePersonality
    );
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
          style={[
            S.messageBubble,
            {
              maxWidth: "88%",
              borderColor: isUser
                ? tokens.border
                : bubbleExperience.accent,
              backgroundColor: isUser
                ? tokens.isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.06)"
                : tokens.isDark
                ? bubbleExperience.tintDark
                : bubbleExperience.tintLight,
              borderLeftWidth: isUser ? 1 : 4,
            },
          ]}
        >
          {!isUser ? (
            <View style={S.assistantIdentityRow}>
              <Ionicons
                name={bubbleExperience.icon as any}
                size={15}
                color={bubbleExperience.accent}
              />
              <Text
                style={[
                  S.assistantIdentityText,
                  { color: bubbleExperience.accent },
                ]}
              >
                {bubbleExperience.label} Nova
              </Text>
            </View>
          ) : null}

          <Text
            selectable
            style={[
              S.messageText,
              { color: tokens.text },
            ]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  const memoryText = prettyMemoryTier(
    memoryTier ?? askMemoryTier ?? "free",
    memoryLimit ?? askMemoryLimit ?? null
  );

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
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{
                    color: tokens.text,
                    fontWeight: "800",
                    fontSize: 20,
                  }}
                >
                  Ask Nova
                </Text>

                <View style={S.headerExperienceRow}>
                  <View
                    style={[
                      S.headerExperienceBadge,
                      {
                        borderColor: activeExperience.accent,
                        backgroundColor: tokens.isDark
                          ? activeExperience.tintDark
                          : activeExperience.tintLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={activeExperience.icon as any}
                      size={13}
                      color={activeExperience.accent}
                    />
                    <Text
                      style={[
                        S.headerExperienceText,
                        { color: activeExperience.accent },
                      ]}
                    >
                      {activeExperience.label} Nova
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: tokens.cardText,
                    fontWeight: "600",
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {memoryText}
                </Text>
              </View>

              <Text style={{ color: tokens.cardText, fontWeight: "700", fontSize: 13 }}>
                Questions today: {count}
              </Text>
            </View>

            <AskPersonalitySelector
              value={activePersonality}
              disabled={personalitySaving || loading || purchasesReady === false}
              onChange={async (next) => {
                if (next === activePersonality || personalitySaving) return;

                setPersonalitySaving(true);
                setError(null);

                try {
                  await Promise.resolve(setAskPersonality(next));
                } catch (changeError: any) {
                  setError(
                    changeError?.message ||
                      "Nova could not save that experience."
                  );
                } finally {
                  setPersonalitySaving(false);
                }
              }}
            />

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 120 }}
              ListFooterComponent={
                loading ? (
                  <NovaThinking
                    key={activeExperience.key}
                    experience={activeExperience}
                  />
                ) : null
              }
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
                  placeholder={activeExperience.placeholder}
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
                        ? activeExperience.accent
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
    paddingHorizontal: 13,
    paddingVertical: 9,
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
  },
  textRow: {
    flexDirection: "row",
  },
  thinkingText: {
    fontWeight: "800",
    fontSize: 14,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 260,
  },
  shimmerGradient: {
    width: 260,
    height: "100%",
  },
  personalityRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  personalityLabel: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.9,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  personalityDropdown: {
    minHeight: 68,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  personalityIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  personalityDropdownTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  personalityDropdownSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
    lineHeight: 15,
  },
  experienceCard: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
  },
  experienceDescription: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  behaviorWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 9,
  },
  behaviorPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  behaviorPillText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  personalityHint: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 6,
  },
  personalityModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
    justifyContent: "center",
    padding: 20,
  },
  personalityModalCard: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
  },
  personalityModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  personalityModalTitle: {
    fontSize: 19,
    fontWeight: "900",
  },
  personalityModalSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  personalityOption: {
    minHeight: 92,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 11,
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  personalityOptionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  personalityOptionTagline: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  personalityOptionSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  headerExperienceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  headerExperienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerExperienceText: {
    fontSize: 10,
    fontWeight: "900",
  },
  messageBubble: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  assistantIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
  },
  assistantIdentityText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  modeChangeWrap: {
    width: "100%",
    paddingHorizontal: 18,
    marginVertical: 8,
    alignItems: "center",
  },
  modeChangePill: {
    maxWidth: "94%",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  modeChangeText: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
});