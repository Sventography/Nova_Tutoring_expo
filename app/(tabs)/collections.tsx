import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useCollections } from "../context/CollectionsContext";
import { useTheme } from "../context/ThemeContext";

const NEON = "#39FF14";

/** Tiny bottom toast tied to this screen only */
function useScreenToast(tokens: any) {
  const y = useRef(new Animated.Value(80)).current;
  const [msg, setMsg] = useState<string | null>(null);

  const show = (m: string) => {
    setMsg(m);
    Animated.timing(y, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(y, {
          toValue: 80,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(() => setMsg(null));
      }, 1200);
    });
  };

  const Toast = msg ? (
    <Animated.View
      style={[
        S.toast,
        {
          transform: [{ translateY: y }],
          backgroundColor: tokens.card,
          borderColor: tokens.accent,
        },
      ]}
    >
      <Text style={[S.toastTxt, { color: tokens.text }]}>{msg}</Text>
    </Animated.View>
  ) : null;

  return { show, Toast };
}

/** Cross-fade “flip” so back always shows (web + native) */
function CardRow({
  item,
  onRemove,
  tokens,
}: {
  item: { id: any; front: string; back: string };
  onRemove: () => void;
  tokens: any;
}) {
  const [flipped, setFlipped] = useState(false);
  const p = useRef(new Animated.Value(0)).current;

  const frontOpacity = p.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const backOpacity = p.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const scaleFront = p.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.9, 0.85],
  });
  const scaleBack = p.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.85, 0.9, 1],
  });

  const flip = () => {
    Animated.timing(p, {
      toValue: flipped ? 0 : 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setFlipped((v) => !v);
  };

  return (
    <Pressable
      onPress={flip}
      style={[
        S.card,
        {
          borderColor: tokens.border,
          backgroundColor: tokens.card,
        },
      ]}
      accessibilityRole="button"
    >
      <View style={{ minHeight: 56 }}>
        <Animated.View
          style={[
            S.layer,
            {
              opacity: frontOpacity,
              transform: [{ scale: scaleFront }],
            },
          ]}
        >
          <Text
            style={[
              S.faceLabel,
              { color: tokens.cardText },
            ]}
          >
            Front
          </Text>
          <Text
            style={[
              S.frontTxt,
              { color: tokens.accent },
            ]}
          >
            {item.front}
          </Text>
        </Animated.View>
        <Animated.View
          style={[
            S.layer,
            {
              opacity: backOpacity,
              transform: [{ scale: scaleBack }],
            },
          ]}
        >
          <Text
            style={[
              S.faceLabel,
              { color: tokens.cardText },
            ]}
          >
            Back
          </Text>
          <Text
            style={[
              S.backTxt,
              { color: tokens.text },
            ]}
          >
            {item.back}
          </Text>
        </Animated.View>
      </View>

      <View style={S.row}>
        <Pressable
          style={[
            S.small,
            S.outline,
            { borderColor: tokens.border },
          ]}
          onPress={flip}
        >
          <Text style={[S.smallTxt, { color: tokens.text }]}>
            Flip
          </Text>
        </Pressable>
        <Pressable
          style={[
            S.small,
            S.danger,
            {
              borderColor: "#ff6b6b",
              backgroundColor: tokens.isDark
                ? "rgba(255,107,107,0.18)"
                : "rgba(255,107,107,0.12)",
            },
          ]}
          onPress={onRemove}
        >
          <Text style={[S.smallTxt, { color: tokens.text }]}>
            Remove
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

type Topic = {
  id: string;
  title: string;
  cards: { id: any; front: string; back: string }[];
};

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}
/** Simple fuzzy score: subsequence score + inclusion boost */
function fuzzyScore(source: string, query: string) {
  const s = norm(source),
    q = norm(query);
  if (!q) return 0;
  if (s.includes(q)) return 100 + q.length; // strong boost for substring
  // subsequence scoring
  let si = 0,
    score = 0;
  for (let i = 0; i < q.length; i++) {
    const ch = q[i];
    const idx = s.indexOf(ch, si);
    if (idx === -1) return -1;
    score += 5 - Math.min(4, idx - si); // closer characters score higher
    si = idx + 1;
  }
  return score;
}

export default function CollectionsTab() {
  const coll = useCollections();
  const { tokens } = useTheme();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [query, setQuery] = useState(""); // 🔎 search

  const { show, Toast } = useScreenToast(tokens);

  // ❶ Merge topics by title (case-insensitive).
  const topics: Topic[] = useMemo(() => {
    const src: Topic[] = (coll.topics || []) as any;
    const map = new Map<string, Topic>(); // key by normalized title
    for (const t of src) {
      const key = String(t?.title ?? "")
        .trim()
        .toLowerCase();
      const existing = map.get(key);
      if (existing) {
        const seen = new Set(existing.cards.map((c) => String(c.id)));
        for (const c of t.cards || []) {
          const cid = String(c.id);
          if (!seen.has(cid)) {
            existing.cards.push(c);
            seen.add(cid);
          }
        }
      } else {
        map.set(key, {
          id: String(t.id || key),
          title: String(t.title || "Untitled"),
          cards: [...(t.cards || [])],
        });
      }
    }
    return Array.from(map.values());
  }, [coll.topics]);

  const active = useMemo(
    () =>
      activeId
        ? topics.find((t) => t.id === activeId) || null
        : topics[0] || null,
    [topics, activeId]
  );

  // 🔎 Fuzzy filter the active set's cards on front+back
  const cards = useMemo(() => {
    const src = active?.cards ?? [];
    const q = query.trim();
    if (!q) return src;
    const scored = src
      .map((c) => {
        const s1 = fuzzyScore(c.front || "", q);
        const s2 = fuzzyScore(c.back || "", q);
        const s = Math.max(s1, s2);
        return { c, s };
      })
      .filter((x) => x.s >= 0);
    scored.sort((a, b) => b.s - a.s);
    return scored.map((x) => x.c);
  }, [active, query]);

  const totals = useMemo(
    () => ({
      sets: topics.length,
      cards: topics.reduce(
        (n, t) => n + (t.cards?.length || 0),
        0
      ),
    }),
    [topics]
  );

  function addCard() {
    const f = front.trim(),
      b = back.trim();
    if (!f || !b) return;
    const targetId = active?.id || "user-my-flashcards";
    const targetTitle = active?.title || "My Flashcards";
    coll.addCard(
      { front: f, back: b } as any,
      targetId,
      targetTitle
    );
    setFront("");
    setBack("");
    show("Saved to Collections");
  }

  // Header = title + search + chips + creator
  const Header = (
    <View>
      <Text
        style={[
          S.h1,
          { color: tokens.accent },
        ]}
      >
        Collections
      </Text>
      <Text
        style={[
          S.sub,
          { color: tokens.cardText },
        ]}
      >
        {totals.sets} set{totals.sets === 1 ? "" : "s"} •{" "}
        {totals.cards} cards
      </Text>

      {/* 🔎 Search */}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search cards…"
        placeholderTextColor={
          tokens.isDark ? "rgba(255,255,255,0.6)" : "#6b7685"
        }
        style={[
          S.search,
          {
            borderColor: tokens.border,
            backgroundColor: tokens.card,
            color: tokens.text,
          },
        ]}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      {/* Sets (horizontal) */}
      <FlatList
        horizontal
        data={topics}
        keyExtractor={(t, i) => `${t?.id ?? "set"}-${i}`}
        contentContainerStyle={{ paddingVertical: 8 }}
        showsHorizontalScrollIndicator={false}
        ListEmptyComponent={
          <Text
            style={[
              S.note,
              { color: tokens.cardText },
            ]}
          >
            No sets yet — add a card below to create your first set.
          </Text>
        }
        renderItem={({ item }) => {
          const isActive = active?.id === item.id;
          return (
            <Pressable
              style={[
                S.setChip,
                {
                  borderColor: isActive
                    ? tokens.accent
                    : tokens.border,
                  backgroundColor: isActive
                    ? tokens.isDark
                      ? "rgba(57,255,20,0.18)"
                      : "rgba(57,255,20,0.1)"
                    : tokens.card,
                },
              ]}
              onPress={() => setActiveId(item.id)}
            >
              <Text
                style={[
                  S.setTxt,
                  { color: tokens.text },
                ]}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  S.setCount,
                  { color: tokens.cardText },
                ]}
              >
                {item.cards?.length || 0}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Creator */}
      <View
        style={[
          S.editor,
          {
            borderColor: tokens.border,
            backgroundColor: tokens.card,
          },
        ]}
      >
        <Text
          style={[
            S.h2,
            { color: tokens.text },
          ]}
        >
          Create Flashcards{" "}
          {active ? `– ${active.title}` : ""}
        </Text>
        <TextInput
          style={[
            S.input,
            {
              borderColor: tokens.border,
              backgroundColor: tokens.card,
              color: tokens.text,
            },
          ]}
          value={front}
          onChangeText={setFront}
          placeholder="Front (question/prompt)"
          placeholderTextColor={
            tokens.isDark ? "rgba(255,255,255,0.6)" : "#6b7685"
          }
        />
        <TextInput
          style={[
            S.input,
            {
              borderColor: tokens.border,
              backgroundColor: tokens.card,
              color: tokens.text,
            },
          ]}
          value={back}
          onChangeText={setBack}
          placeholder="Back (answer)"
          placeholderTextColor={
            tokens.isDark ? "rgba(255,255,255,0.6)" : "#6b7685"
          }
        />
        <View style={S.row}>
          <Pressable
            style={[
              S.btn,
              front.trim() && back.trim()
                ? {
                    borderColor: tokens.accent,
                    backgroundColor: tokens.isDark
                      ? "rgba(57,255,20,0.22)"
                      : "rgba(57,255,20,0.12)",
                  }
                : {
                    borderColor: tokens.border,
                    backgroundColor: tokens.isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  },
            ]}
            disabled={!(front.trim() && back.trim())}
            onPress={addCard}
          >
            <Text
              style={[
                S.btnTxt,
                { color: tokens.text },
              ]}
            >
              Add Card
            </Text>
          </Pressable>
          <View style={{ width: 10 }} />
          <Pressable
            style={[
              S.btn,
              {
                borderColor: tokens.border,
                backgroundColor: tokens.isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
            onPress={() => {
              setFront("");
              setBack("");
            }}
          >
            <Text
              style={[
                S.btnTxt,
                { color: tokens.text },
              ]}
            >
              Clear
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <View style={S.wrap}>
        <FlatList
          data={cards}
          keyExtractor={(c, i) =>
            `${c?.id ?? "k"}-${i}`
          }
          ListHeaderComponent={Header}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 100,
          }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 8 }} />
          )}
          renderItem={({ item }) => (
            <CardRow
              item={item}
              onRemove={() =>
                active && coll.removeCard(item.id, active.id)
              }
              tokens={tokens}
            />
          )}
          ListEmptyComponent={<View />}
        />
        {Toast}
      </View>
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  wrap: { flex: 1 },
  h1: { fontSize: 22, fontWeight: "800" },
  h2: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 8,
  },
  sub: { marginBottom: 6 },
  note: { opacity: 0.8 },

  search: {
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },

  setChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  setTxt: { fontWeight: "700" },
  setCount: { fontWeight: "700" },

  editor: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },

  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },

  layer: { position: "relative" },
  faceLabel: {
    fontSize: 12,
    marginBottom: 6,
    opacity: 0.9,
  },
  frontTxt: { fontWeight: "800", fontSize: 16, paddingRight: 2 },
  backTxt: { fontSize: 16, paddingRight: 2 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1.5,
  },
  btnTxt: { fontWeight: "800" },

  small: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  danger: {},
  outline: {},

  smallTxt: { fontWeight: "700" },

  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  toastTxt: { fontWeight: "700", textAlign: "center" },
});
