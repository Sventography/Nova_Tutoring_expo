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
import { useAiPlan } from "../context/AiPlanContext";

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
  code?: string | null;
  coins_awarded?: number;
  ask_memory_tier?: string | null;
  ask_memory_limit?: number | null;
  ask_personality?: PersonalityKey | null;
  ai_plan_id?: string | null;
  ai_question_limit?: number | null;
  ai_questions_used?: number | null;
  ai_questions_reserved?: number | null;
  ai_questions_remaining?: number | null;
  ai_period_end?: string | null;
};

const BACKEND_BASE =
  (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "") ||
  "http://127.0.0.1:5055";


const ASK_EXPERIENCE_DETAILS_KEY =
  "@nova/ask/experience-details-expanded.v1";

const GUEST_AI_INSTALLATION_ID_KEY =
  "@nova/guest-ai-installation-id.v1";

/*
 * Keep exactly one guest installation ID in memory.
 * The promise lock prevents the initial usage lookup and the
 * first Ask request from racing and creating different IDs.
 */
let guestAiInstallationIdCache: string | null = null;
let guestAiInstallationIdPromise: Promise<string> | null = null;

function makeGuestAiInstallationId(): string {
  const randomPart = () =>
    Math.random().toString(36).slice(2, 14);

  return [
    "nova",
    Date.now().toString(36),
    randomPart(),
    randomPart(),
    randomPart(),
  ].join("-");
}

async function getOrCreateGuestAiInstallationId(): Promise<string> {
  if (guestAiInstallationIdCache) {
    return guestAiInstallationIdCache;
  }

  if (guestAiInstallationIdPromise) {
    return guestAiInstallationIdPromise;
  }

  guestAiInstallationIdPromise = (async () => {
    const existing = String(
      (await AsyncStorage.getItem(
        GUEST_AI_INSTALLATION_ID_KEY
      )) || ""
    ).trim();

    if (existing) {
      guestAiInstallationIdCache = existing;
      return existing;
    }

    const created = makeGuestAiInstallationId();

    await AsyncStorage.setItem(
      GUEST_AI_INSTALLATION_ID_KEY,
      created
    );

    guestAiInstallationIdCache = created;
    return created;
  })();

  try {
    return await guestAiInstallationIdPromise;
  } finally {
    guestAiInstallationIdPromise = null;
  }
}

function normalizeGuestUsagePayload(
  json: any
): AskApiResponse {
  return {
    code:
      typeof json?.code === "string"
        ? json.code
        : null,
    ai_plan_id:
      typeof json?.ai_plan_id === "string"
        ? json.ai_plan_id
        : "guest",
    ai_question_limit:
      Number.isFinite(Number(json?.ai_question_limit))
        ? Number(json.ai_question_limit)
        : null,
    ai_questions_used:
      Number.isFinite(Number(json?.ai_questions_used))
        ? Number(json.ai_questions_used)
        : null,
    ai_questions_reserved:
      Number.isFinite(Number(json?.ai_questions_reserved))
        ? Number(json.ai_questions_reserved)
        : null,
    ai_questions_remaining:
      Number.isFinite(Number(json?.ai_questions_remaining))
        ? Number(json.ai_questions_remaining)
        : null,
    ai_period_end:
      typeof json?.ai_period_end === "string"
        ? json.ai_period_end
        : null,
  };
}

async function fetchGuestAiUsageApi(): Promise<{
  ok: boolean;
  data?: AskApiResponse;
  error?: string;
  status?: number;
}> {
  try {
    const guestId =
      await getOrCreateGuestAiInstallationId();

    const res = await fetch(
      `${BACKEND_BASE}/api/ask/guest-usage`,
      {
        method: "GET",
        headers: {
          "X-Nova-Guest-Id": guestId,
        },
      }
    );

    const responseText = await res.text();
    let json: any = {};

    try {
      json = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      json = {};
    }

    if (!res.ok || json?.error) {
      return {
        ok: false,
        status: res.status,
        error: askErrorText(
          json?.error || responseText,
          res.status
        ),
        data: normalizeGuestUsagePayload(json),
      };
    }

    return {
      ok: true,
      data: normalizeGuestUsagePayload(json),
    };
  } catch (error: any) {
    return {
      ok: false,
      error: askErrorText(
        error?.message || error
      ),
    };
  }
}

function askErrorText(
  value: unknown,
  status?: number
): string {
  let raw = "";

  if (typeof value === "string") {
    raw = value;
  } else if (
    value &&
    typeof value === "object"
  ) {
    const record = value as Record<
      string,
      unknown
    >;

    if (
      typeof record.message === "string"
    ) {
      raw = record.message;
    } else {
      try {
        raw = JSON.stringify(value);
      } catch {
        raw = "";
      }
    }
  }

  const lowered = raw.toLowerCase();

  if (
    status === 429 ||
    lowered.includes(
      "credit_balance_exhausted"
    ) ||
    lowered.includes(
      "insufficient_quota"
    ) ||
    lowered.includes("quota")
  ) {
    return (
      "Nova is taking a quick break " +
      "right now. Please try again later."
    );
  }

  if (
    lowered.includes("network") ||
    lowered.includes("failed to fetch") ||
    lowered.includes("timed out") ||
    lowered.includes("timeout")
  ) {
    return (
      "Nova could not connect right now. " +
      "Check your connection and try again."
    );
  }

  return (
    "Nova is temporarily unavailable. " +
    "Please try again in a few moments."
  );
}

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
  isGuest: boolean
): Promise<{
  ok: boolean;
  data?: AskApiResponse;
  error?: string;
  status?: number;
}> {
  try {
    const jwt = isGuest
      ? null
      : await AsyncStorage.getItem("auth.supabase.jwt");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (isGuest) {
      headers["X-Nova-Guest-Id"] =
        await getOrCreateGuestAiInstallationId();
    } else if (jwt) {
      headers["Authorization"] = `Bearer ${jwt}`;
    }

    const body = {
      question,
      history,
      personality,
    };

    const res = await fetch(`${BACKEND_BASE}/api/ask`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const responseText = await res.text();
    let json: any = {};

    try {
      json = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      json = {};
    }

    if (!res.ok || json.error) {
      const rawError =
        json?.error?.message ??
        json?.error ??
        json?.message ??
        responseText;

      const apiCode =
        typeof json?.code === "string"
          ? json.code
          : null;

      console.warn(
        "[Ask] request failed",
        {
          status: res.status,
          code: apiCode,
          rawError,
        }
      );

      return {
        ok: false,
        status: res.status,
        error:
          apiCode === "AI_MONTHLY_LIMIT_REACHED"
            ? "You've used all of your Nova AI questions for this period."
            : apiCode === "AI_GUEST_LIMIT_REACHED"
            ? "You've used both guest Nova AI questions. Create a free account to keep asking Nova."
            : askErrorText(
                rawError,
                res.status
              ),
        data: {
          code: apiCode,
          ai_plan_id:
            typeof json?.ai_plan_id === "string"
              ? json.ai_plan_id
              : null,
          ai_question_limit:
            Number.isFinite(Number(json?.ai_question_limit))
              ? Number(json.ai_question_limit)
              : null,
          ai_questions_used:
            Number.isFinite(Number(json?.ai_questions_used))
              ? Number(json.ai_questions_used)
              : null,
          ai_questions_reserved:
            Number.isFinite(Number(json?.ai_questions_reserved))
              ? Number(json.ai_questions_reserved)
              : null,
          ai_questions_remaining:
            Number.isFinite(Number(json?.ai_questions_remaining))
              ? Number(json.ai_questions_remaining)
              : null,
          ai_period_end:
            typeof json?.ai_period_end === "string"
              ? json.ai_period_end
              : null,
        },
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
        code:
          typeof json.code === "string"
            ? json.code
            : null,
        ai_plan_id:
          typeof json.ai_plan_id === "string"
            ? json.ai_plan_id
            : null,
        ai_question_limit:
          Number.isFinite(Number(json.ai_question_limit))
            ? Number(json.ai_question_limit)
            : null,
        ai_questions_used:
          Number.isFinite(Number(json.ai_questions_used))
            ? Number(json.ai_questions_used)
            : null,
        ai_questions_reserved:
          Number.isFinite(Number(json.ai_questions_reserved))
            ? Number(json.ai_questions_reserved)
            : null,
        ai_questions_remaining:
          Number.isFinite(Number(json.ai_questions_remaining))
            ? Number(json.ai_questions_remaining)
            : null,
        ai_period_end:
          typeof json.ai_period_end === "string"
            ? json.ai_period_end
            : null,
      },
    };
  } catch (e: any) {
    console.warn(
      "[Ask] request exception",
      e
    );

    return {
      ok: false,
      error: askErrorText(
        e?.message || e
      ),
    };
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
  const [detailsExpanded, setDetailsExpanded] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    void AsyncStorage.getItem(
      ASK_EXPERIENCE_DETAILS_KEY
    )
      .then((stored) => {
        if (mounted) {
          setDetailsExpanded(
            stored === "1"
          );
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

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

  const toggleExperienceDetails = () => {
    setDetailsExpanded((current) => {
      const next = !current;

      void AsyncStorage.setItem(
        ASK_EXPERIENCE_DETAILS_KEY,
        next ? "1" : "0"
      ).catch(() => {});

      return next;
    });
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

      <Pressable
        onPress={toggleExperienceDetails}
        accessibilityRole="button"
        accessibilityLabel={
          detailsExpanded
            ? "Hide Nova experience details"
            : "Show Nova experience details"
        }
        style={({ pressed }) => ({
          marginTop: 8,
          minHeight: 38,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: `${selected.accent}66`,
          backgroundColor: tokens?.isDark
            ? "rgba(2,6,23,0.34)"
            : "rgba(255,255,255,0.44)",
          paddingHorizontal: 11,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: pressed ? 0.76 : 1,
        })}
      >
        <Text
          style={{
            color: selected.accent,
            fontSize: 11,
            fontWeight: "900",
            letterSpacing: 0.45,
          }}
        >
          ABOUT THIS EXPERIENCE
        </Text>

        <Ionicons
          name={
            detailsExpanded
              ? "chevron-up"
              : "chevron-down"
          }
          size={18}
          color={selected.accent}
        />
      </Pressable>

      {detailsExpanded ? (
        <>
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
        </>
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

async function removeLegacyLocalAskCounts() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const oldKeys = keys.filter((key) =>
      key.startsWith("@ask/count")
    );

    if (oldKeys.length > 0) {
      await AsyncStorage.multiRemove(oldKeys);
    }
  } catch (error) {
    console.warn(
      "[Ask] legacy count cleanup failed",
      error
    );
  }
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

function prettyPeriodEnd(
  value: string | null
): string {
  if (!value) return "Not available";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
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

  const {
    isGuest: isAiGuest,
    plan: aiPlan,
    monthlyQuestionLimit,
    questionsUsed,
    questionsReserved,
    questionsRemaining,
    guestTrialQuestionLimit,
    effectiveMemoryMessageLimit,
    periodEnd: aiPeriodEnd,
    loading: aiPlanLoading,
    refresh: refreshAiPlan,
  } = useAiPlan();

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
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [usageExpanded, setUsageExpanded] = useState(false);

  const [guestQuestionsUsed, setGuestQuestionsUsed] =
    useState(0);
  const [guestQuestionsReserved, setGuestQuestionsReserved] =
    useState(0);
  const [guestUsageLoading, setGuestUsageLoading] =
    useState(false);
  const [guestUsageReady, setGuestUsageReady] =
    useState(false);

  const [memoryTier, setMemoryTier] = useState<string | null>(null);
  const [memoryLimit, setMemoryLimit] = useState<number | null>(null);
  const [personalitySaving, setPersonalitySaving] = useState(false);

  const listRef = useRef<FlatList<Msg>>(null);
  const initializedExperienceRef = useRef(false);
  const previousExperienceRef =
    useRef<PersonalityKey>("encouraging");

  useEffect(() => {
    void removeLegacyLocalAskCounts();
  }, []);

  useEffect(() => {
    setMemoryTier(askMemoryTier || "free");
    setMemoryLimit(typeof askMemoryLimit === "number" ? askMemoryLimit : null);
  }, [askMemoryTier, askMemoryLimit]);

  const refreshGuestAiUsage = useCallback(async () => {
    if (!isAiGuest) {
      setGuestQuestionsUsed(0);
      setGuestQuestionsReserved(0);
      setGuestUsageLoading(false);
      setGuestUsageReady(false);
      return;
    }

    setGuestUsageLoading(true);

    try {
      const result = await fetchGuestAiUsageApi();

      if (result.ok && result.data) {
        setGuestQuestionsUsed(
          Math.max(
            0,
            Number(result.data.ai_questions_used) || 0
          )
        );
        setGuestQuestionsReserved(
          Math.max(
            0,
            Number(result.data.ai_questions_reserved) || 0
          )
        );
        setGuestUsageReady(true);
      } else {
        setGuestUsageReady(false);
        console.warn(
          "[Ask] guest usage refresh failed",
          result.error
        );
      }
    } finally {
      setGuestUsageLoading(false);
    }
  }, [isAiGuest]);

  useEffect(() => {
    void refreshGuestAiUsage();
  }, [refreshGuestAiUsage]);

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

  const guestQuestionLimit = Math.max(
    1,
    Number(guestTrialQuestionLimit) || 2
  );

  const guestQuestionsRemaining = Math.max(
    0,
    guestQuestionLimit -
      guestQuestionsUsed -
      guestQuestionsReserved
  );

  const guestAskUnavailable =
    isAiGuest &&
    (
      guestUsageLoading ||
      !guestUsageReady ||
      guestQuestionsRemaining <= 0
    );

  const aiLimitReached = isAiGuest
    ? guestAskUnavailable
    : !aiPlanLoading &&
      questionsRemaining <= 0;

  const send = useCallback(
    async () => {
      const trimmed = input.trim();
      if (!trimmed || loading || aiLimitReached) return;

      setLoading(true);
      setError(null);
      setErrorCode(null);

      const effectiveMemoryLimit = Math.max(
        Number(effectiveMemoryMessageLimit) || 0,
        Number(memoryLimit) || 0,
        Number(askMemoryLimit) || 0,
        5
      );
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
        const apiRes = await callAskApi(
          trimmed,
          historyPayload,
          activePersonality,
          isAiGuest
        );

        if (!apiRes.ok || !apiRes.data || !apiRes.data.answer) {
          setError(apiRes.error || "Something went wrong.");
          setErrorCode(apiRes.data?.code ?? null);

          if (
            apiRes.data?.code === "AI_MONTHLY_LIMIT_REACHED"
          ) {
            await refreshAiPlan();
          } else if (
            apiRes.data?.code === "AI_GUEST_LIMIT_REACHED"
          ) {
            await refreshGuestAiUsage();
          }
        } else {
          setErrorCode(null);
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

          onAskQuestion?.();

          if (isAiGuest) {
            setGuestQuestionsUsed(
              Math.max(
                0,
                Number(apiRes.data.ai_questions_used) || 0
              )
            );
            setGuestQuestionsReserved(
              Math.max(
                0,
                Number(apiRes.data.ai_questions_reserved) || 0
              )
            );
            await refreshGuestAiUsage();
          } else {
            // Supabase is authoritative for signed-in Nova AI usage.
            await refreshAiPlan();
          }

          // XP drip is okay to keep (Island bar will be greyed in v1 anyway)
          try {
            await addIslandXp(2, "ask_answer", { source: "ask", length: answer.length });
          } catch (e) {
            console.warn("[Island] addIslandXp from Ask failed", e);
          }
        }
      } catch (e: any) {
        setErrorCode(null);
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
      memoryLimit,
      askMemoryLimit,
      effectiveMemoryMessageLimit,
      aiLimitReached,
      isAiGuest,
      refreshAiPlan,
      refreshGuestAiUsage,
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

  const effectiveDisplayMemoryLimit = Math.max(
    Number(memoryLimit) || 0,
    Number(effectiveMemoryMessageLimit) || 0,
    Number(askMemoryLimit) || 0
  );

  const memoryText =
    !isAiGuest && aiPlan.id !== "free"
      ? `${aiPlan.shortName} memory • remembers ~${effectiveDisplayMemoryLimit} msgs`
      : prettyMemoryTier(
          memoryTier ?? askMemoryTier ?? "free",
          effectiveDisplayMemoryLimit || null
        );

  const aiRemainingRatio =
    monthlyQuestionLimit > 0
      ? questionsRemaining / monthlyQuestionLimit
      : 1;

  const aiUsageWarning = aiRemainingRatio < 0.2;
  const aiUsageAccent = aiUsageWarning
    ? "#FB7185"
    : aiPlan.accentColor || activeExperience.accent;

  const aiConsumed = Math.min(
    monthlyQuestionLimit,
    Math.max(0, questionsUsed + questionsReserved)
  );

  const aiUsedPercent =
    monthlyQuestionLimit > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (aiConsumed / monthlyQuestionLimit) * 100
          )
        )
      : 0;

  const aiUsageWidth = `${aiUsedPercent}%` as `${number}%`;
  const aiResetLabel = prettyPeriodEnd(aiPeriodEnd);

  const guestConsumed = Math.min(
    guestQuestionLimit,
    Math.max(
      0,
      guestQuestionsUsed +
        guestQuestionsReserved
    )
  );

  const guestUsedPercent =
    guestQuestionLimit > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (guestConsumed / guestQuestionLimit) * 100
          )
        )
      : 0;

  const guestUsageWidth =
    `${guestUsedPercent}%` as `${number}%`;

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={115}
      >
        <View style={{ flex: 1, minHeight: 0 }}>
          <View style={{ flex: 1, minHeight: 0 }}>
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
            </View>

            {isAiGuest ? (
              <View
                style={[
                  S.aiUsageCard,
                  {
                    borderColor: `${activeExperience.accent}88`,
                    backgroundColor: tokens.isDark
                      ? "rgba(2,6,23,0.48)"
                      : "rgba(255,255,255,0.58)",
                  },
                ]}
              >
                <View style={S.aiUsageTopRow}>
                  <View style={S.aiUsageTitleRow}>
                    <Ionicons
                      name={
                        guestQuestionsRemaining <= 0
                          ? "lock-closed-outline"
                          : "sparkles-outline"
                      }
                      size={15}
                      color={activeExperience.accent}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        S.aiUsageSummary,
                        { color: tokens.text },
                      ]}
                    >
                      Guest trial
                      {" • "}
                      {guestUsageLoading
                        ? "Updating…"
                        : `${guestQuestionsRemaining} of ${guestQuestionLimit} left`}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    S.aiUsageTrack,
                    {
                      backgroundColor: tokens.isDark
                        ? "rgba(148,163,184,0.16)"
                        : "rgba(15,23,42,0.10)",
                    },
                  ]}
                >
                  <View
                    style={[
                      S.aiUsageFill,
                      {
                        width: guestUsageWidth,
                        backgroundColor: activeExperience.accent,
                      },
                    ]}
                  />
                </View>

                {guestQuestionsRemaining <= 0 ? (
                  <Text
                    style={[
                      S.aiUsagePending,
                      { color: activeExperience.accent },
                    ]}
                  >
                    Guest trial complete • create a free account to keep asking Nova
                  </Text>
                ) : (
                  <Text
                    style={[
                      S.aiUsagePending,
                      { color: tokens.cardText },
                    ]}
                  >
                    2 total guest questions • no conversation history is stored by Nova
                  </Text>
                )}
              </View>
            ) : (
              <Pressable
                onPress={() => setUsageExpanded((current) => !current)}
                accessibilityRole="button"
                accessibilityLabel={
                  usageExpanded
                    ? "Hide Nova AI usage details"
                    : "Show Nova AI usage details"
                }
                style={({ pressed }) => [
                  S.aiUsageCard,
                  {
                    borderColor: `${aiUsageAccent}88`,
                    backgroundColor: tokens.isDark
                      ? "rgba(2,6,23,0.48)"
                      : "rgba(255,255,255,0.58)",
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <View style={S.aiUsageTopRow}>
                  <View style={S.aiUsageTitleRow}>
                    <Ionicons
                      name={
                        aiUsageWarning
                          ? "warning-outline"
                          : "sparkles-outline"
                      }
                      size={15}
                      color={aiUsageAccent}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        S.aiUsageSummary,
                        { color: tokens.text },
                      ]}
                    >
                      {aiPlan.shortName}
                      {" • "}
                      {aiPlanLoading
                        ? "Updating…"
                        : `${questionsRemaining} of ${monthlyQuestionLimit} left`}
                    </Text>
                  </View>

                  <Ionicons
                    name={usageExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={aiUsageAccent}
                  />
                </View>

                <View
                  style={[
                    S.aiUsageTrack,
                    {
                      backgroundColor: tokens.isDark
                        ? "rgba(148,163,184,0.16)"
                        : "rgba(15,23,42,0.10)",
                    },
                  ]}
                >
                  <View
                    style={[
                      S.aiUsageFill,
                      {
                        width: aiUsageWidth,
                        backgroundColor: aiUsageAccent,
                      },
                    ]}
                  />
                </View>

                {usageExpanded ? (
                  <View style={S.aiUsageDetails}>
                    <View style={S.aiUsageDetailRow}>
                      <Text
                        style={[
                          S.aiUsageDetailLabel,
                          { color: tokens.cardText },
                        ]}
                      >
                        Used
                      </Text>
                      <Text
                        style={[
                          S.aiUsageDetailValue,
                          { color: tokens.text },
                        ]}
                      >
                        {questionsUsed} / {monthlyQuestionLimit}
                      </Text>
                    </View>

                    <View style={S.aiUsageDetailRow}>
                      <Text
                        style={[
                          S.aiUsageDetailLabel,
                          { color: tokens.cardText },
                        ]}
                      >
                        Memory
                      </Text>
                      <Text
                        style={[
                          S.aiUsageDetailValue,
                          { color: tokens.text },
                        ]}
                      >
                        Remembers ~{effectiveMemoryMessageLimit} msgs
                      </Text>
                    </View>

                    <View style={S.aiUsageDetailRow}>
                      <Text
                        style={[
                          S.aiUsageDetailLabel,
                          { color: tokens.cardText },
                        ]}
                      >
                        Resets
                      </Text>
                      <Text
                        style={[
                          S.aiUsageDetailValue,
                          { color: tokens.text },
                        ]}
                      >
                        {aiResetLabel}
                      </Text>
                    </View>

                    {questionsReserved > 0 ? (
                      <Text
                        style={[
                          S.aiUsagePending,
                          { color: aiUsageAccent },
                        ]}
                      >
                        {questionsReserved} question
                        {questionsReserved === 1 ? "" : "s"} currently processing
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </Pressable>
            )}

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
              style={{
                flex: 1,
                minHeight: 0,
              }}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              contentContainerStyle={{
                paddingTop: 4,
                paddingBottom: 28,
              }}
              showsVerticalScrollIndicator
              scrollEnabled
              nestedScrollEnabled
              keyboardDismissMode={
                Platform.OS === "ios"
                  ? "interactive"
                  : "on-drag"
              }
              onScrollBeginDrag={Keyboard.dismiss}
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
                  placeholder={
                    isAiGuest &&
                    (
                      guestUsageLoading ||
                      !guestUsageReady
                    )
                      ? "Checking guest trial…"
                      : aiLimitReached
                      ? isAiGuest
                        ? "Guest trial used — create a free account"
                        : "Nova AI limit reached for this period"
                      : activeExperience.placeholder
                  }
                  placeholderTextColor={tokens.isDark ? "#678a94" : "#6b7685"}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={send}
                  style={{ flex: 1, color: tokens.text, paddingVertical: 10 }}
                  editable={!loading}
                />
                <Pressable
                  onPress={send}
                  disabled={loading || !input.trim() || aiLimitReached}
                >
                  <Ionicons
                    name="arrow-up-circle"
                    size={28}
                    color={
                      input.trim() && !aiLimitReached
                        ? activeExperience.accent
                        : tokens.isDark
                        ? "#294b55"
                        : "#a0a8b2"
                    }
                  />
                </Pressable>
              </View>

              {error ? (
                <View
                  style={{
                    marginTop: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor:
                      "rgba(248,113,113,0.58)",
                    backgroundColor:
                      "rgba(127,29,29,0.18)",
                    paddingHorizontal: 11,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 9,
                  }}
                >
                  <Ionicons
                    name={
                      errorCode === "AI_MONTHLY_LIMIT_REACHED" ||
                      errorCode === "AI_GUEST_LIMIT_REACHED"
                        ? "hourglass-outline"
                        : "cloud-offline-outline"
                    }
                    size={20}
                    color="#FCA5A5"
                  />

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#FECACA",
                        fontSize: 12,
                        fontWeight: "900",
                        marginBottom: 3,
                      }}
                    >
                      {errorCode === "AI_GUEST_LIMIT_REACHED"
                        ? "Your guest Nova AI trial is complete."
                        : errorCode === "AI_MONTHLY_LIMIT_REACHED"
                        ? "You've reached this period's Nova AI limit."
                        : "Nova could not answer that just now."}
                    </Text>

                    <Text
                      style={{
                        color: "#FCA5A5",
                        fontSize: 12,
                        lineHeight: 17,
                      }}
                    >
                      {error}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      setError(null);
                      setErrorCode(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss error"
                    hitSlop={10}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color="#FCA5A5"
                    />
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  aiUsageCard: {
    marginHorizontal: 12,
    marginBottom: 9,
    minHeight: 43,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  aiUsageTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  aiUsageTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  aiUsageSummary: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
  },
  aiUsageTrack: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 7,
  },
  aiUsageFill: {
    height: "100%",
    borderRadius: 999,
  },
  aiUsageDetails: {
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148,163,184,0.28)",
    gap: 5,
  },
  aiUsageDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  aiUsageDetailLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  aiUsageDetailValue: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "800",
  },
  aiUsagePending: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: "800",
  },
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
