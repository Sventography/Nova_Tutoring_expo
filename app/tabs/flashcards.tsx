import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, Dimensions, PanResponder, Animated, Easing, FlatList
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getTopics, searchTopics, getCardsById, type Card } from "../_lib/flashcards";

const { width } = Dimensions.get("window");
const CARD_W = Math.min(360, width - 40);
const CARD_H = Math.min(540, Math.round(CARD_W * 1.35));

type Topic = { id: string; title: string; group: string; count: number };

function GlowFrame({ children }: { children: React.ReactNode }) {
  return (
    <View style={S.glowWrap}>
      <LinearGradient
        colors={["#00FFFF55","#66CCFF44","#00000000"]}
        start={{x:0,y:0}} end={{x:1,y:1}}
        style={S.glow}
      />
      <View style={S.glowInner}>{children}</View>
    </View>
  );
}

function ShimmerTitle({ text }: { text: string }) {
  const slide = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(slide, { toValue: 1, duration: 2400, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(slide, { toValue: -1, duration: 0, useNativeDriver: true })
      ])
    ).start();
  }, [slide]);
  const translateX = slide.interpolate({ inputRange: [-1,1], outputRange: [-40, 40] });
  return (
    <View style={S.shimmerRow}>
      <Text style={S.title}>{text}</Text>
      <Animated.View style={[S.shimmer, { transform: [{ translateX }] }]} />
    </View>
  );
}

function FlashyCard({ card, onFlip }: { card: Card; onFlip?: ()=>void }) {
  const flip = useRef(new Animated.Value(0)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const isBack = useRef(false);

  const rotateY = flip.interpolate({ inputRange: [0,1], outputRange: ["0deg","180deg"] });
  const rotateYBack = flip.interpolate({ inputRange: [0,1], outputRange: ["180deg","360deg"] });

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(tiltX, { toValue: 3, useNativeDriver: true }),
      Animated.spring(tiltY, { toValue: -3, useNativeDriver: true }),
    ]).start();
  };
  const pressOut = () => {
    Animated.parallel([
      Animated.spring(tiltX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(tiltY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  const doFlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    isBack.current = !isBack.current;
    Animated.timing(flip, {
      toValue: isBack.current ? 1 : 0,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onFlip && onFlip());
  };

  return (
    <GlowFrame>
      <Pressable onPress={doFlip} onPressIn={pressIn} onPressOut={pressOut}>
        <View style={S.cardWrap}>
          {/* FRONT */}
          <Animated.View style={[
            S.card,
            S.cardFront,
            {
              transform: [{ perspective: 1000 }, { rotateY }, { rotateX: tiltX }, { rotateZ: tiltY }]
            }
          ]}>
            <LinearGradient colors={["#0A0F1E", "#02050A"]} style={S.cardFill} />
            <Text style={S.cardLabel}>Question</Text>
            <Text style={S.cardText}>{card.front}</Text>
            <View style={S.tapHint}><Ionicons name="sync" size={18} /><Text style={S.tapText}>Tap to flip</Text></View>
          </Animated.View>

          {/* BACK */}
          <Animated.View style={[
            S.card,
            S.cardBack,
            {
              transform: [{ perspective: 1000 }, { rotateY: rotateYBack }, { rotateX: tiltX }, { rotateZ: tiltY }]
            }
          ]}>
            <LinearGradient colors={["#001F2E", "#00050A"]} style={S.cardFill} />
            <Text style={S.cardLabel}>Answer</Text>
            <Text style={S.cardText}>{card.back}</Text>
            {Array.isArray(card.choices) && card.choices?.length ? (
              <View style={S.choiceWrap}>
                {card.choices.map((c, i) => (
                  <View key={i} style={S.choicePill}><Text style={S.choiceText}>{c}</Text></View>
                ))}
              </View>
            ) : null}
            <View style={S.tapHint}><Ionicons name="sync" size={18} /><Text style={S.tapText}>Tap to flip</Text></View>
          </Animated.View>
        </View>
      </Pressable>
    </GlowFrame>
  );
}

export default function FlashcardsScreen() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Topic | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);

  const topics = useMemo<Topic[]>(() => getTopics(), []);
  const filtered = useMemo<Topic[]>(
    () => (q.trim() ? searchTopics(q, 60) : topics),
    [q, topics]
  );

  // load cards on topic select
  useEffect(() => {
    if (!sel) { setCards([]); setIdx(0); return; }
    const list = getCardsById(sel.id);
    setCards(list);
    setIdx(0);
  }, [sel?.id]);

  // swipe navigation
  const pan = useRef(new Animated.Value(0)).current;
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12,
    onPanResponderMove: (_, g) => { pan.setValue(g.dx); },
    onPanResponderRelease: (_, g) => {
      const TH = 80;
      if (g.dx < -TH && idx < cards.length - 1) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIdx(i => i + 1);
      } else if (g.dx > TH && idx > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIdx(i => i - 1);
      }
      Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
    }
  }), [idx, cards.length]);

  const goPrev = useCallback(() => { if (idx > 0) { Haptics.selectionAsync(); setIdx(i=>i-1); } }, [idx]);
  const goNext = useCallback(() => { if (idx < cards.length - 1) { Haptics.selectionAsync(); setIdx(i=>i+1); } }, [idx, cards.length]);

  const current = cards[idx];

  return (
    <View style={S.container}>
      <LinearGradient colors={["#000000","#03081A"]} style={S.bg} />

      {/* Header */}
      <View style={S.header}>
        <ShimmerTitle text="FLASHCARDS" />
        <TextInput
          style={S.search}
          placeholder="Search topics..."
          placeholderTextColor="#7FA8C0"
          value={q}
          onChangeText={setQ}
        />
      </View>

      {/* Topics strip */}
      <View style={S.topicRow}>
        <FlatList
          horizontal
          data={filtered}
          keyExtractor={(t)=>t.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({item}) => (
            <Pressable onPress={()=>{ setSel(item); Haptics.selectionAsync(); }} style={[S.topicPill, sel?.id===item.id && S.topicPillActive]}>
              <Text style={[S.topicText, sel?.id===item.id && S.topicTextActive]}>
                {item.title} • {item.count}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Card stage */}
      <View style={S.stage}>
        {!sel && <Text style={S.hint}>Pick a topic above to begin</Text>}
        {sel && !current && <Text style={S.hint}>No cards found in this topic</Text>}
        {sel && current && (
          <Animated.View style={{ transform: [{ translateX: pan }] }} {...panResponder.panHandlers}>
            <FlashyCard card={current} />
          </Animated.View>
        )}
      </View>

      {/* Controls */}
      <View style={S.controls}>
        <Pressable style={S.ctrlBtn} onPress={goPrev}><Ionicons name="chevron-back" size={22}/><Text style={S.ctrlTxt}>Prev</Text></Pressable>
        <Text style={S.counter}>{cards.length ? `${idx+1} / ${cards.length}` : "-- / --"}</Text>
        <Pressable style={S.ctrlBtn} onPress={goNext}><Text style={S.ctrlTxt}>Next</Text><Ionicons name="chevron-forward" size={22}/></Pressable>
      </View>

      {/* Dots */}
      {cards.length > 1 && (
        <View style={S.dots}>
          {cards.slice(0, 10).map((_, i) => (
            <View key={i} style={[S.dot, i===idx ? S.dotOn : null]} />
          ))}
          {cards.length > 10 && <Text style={S.moreDots}>+{cards.length-10}</Text>}
        </View>
      )}
    </View>
  );
}

export const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  bg: { ...StyleSheet.absoluteFillObject },
  header: { paddingTop: 14, paddingHorizontal: 16, gap: 10 },
  title: { color: "#CFF5FF", fontSize: 22, fontWeight: "700", letterSpacing: 2 },
  shimmerRow: { position: "relative", paddingVertical: 6 },
  shimmer: {
    position: "absolute", top: 6, left: 0, height: 24, width: 48,
    backgroundColor: "#FFFFFF18", borderRadius: 8, opacity: 0.8
  },
  search: {
    backgroundColor: "#051126", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    color: "#E8F8FF", borderWidth: 1, borderColor: "#0B2C52"
  },

  topicRow: { paddingHorizontal: 10, paddingTop: 8 },
  topicPill: { marginHorizontal: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#13345F", backgroundColor: "#06142A" },
  topicPillActive: { backgroundColor: "#082949", borderColor: "#47C9FF" },
  topicText: { color: "#9CC6DC", fontWeight: "600" },
  topicTextActive: { color: "#E6FBFF" },

  stage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  hint: { color: "#8FB5CA", fontSize: 16 },

  glowWrap: { width: CARD_W, height: CARD_H, alignItems: "center", justifyContent: "center" },
  glow: {
    position: "absolute", width: CARD_W + 24, height: CARD_H + 24, borderRadius: 24,
    shadowColor: "#00E5FF", shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
    backgroundColor: "transparent", borderWidth: 2, borderColor: "#00D0FF55"
  },
  glowInner: {
    width: CARD_W, height: CARD_H, borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "#0C3C6A"
  },

  cardWrap: { width: "100%", height: "100%" },
  card: {
    backfaceVisibility: "hidden",
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 20, overflow: "hidden"
  },
  cardFill: { ...StyleSheet.absoluteFillObject },
  cardFront: { },
  cardBack: { transform: [{ rotateY: "180deg" }] },

  cardLabel: { color: "#A0D8F7", fontSize: 13, fontWeight: "700", letterSpacing: 1.2, marginTop: 16, marginHorizontal: 16, opacity: 0.9 },
  cardText: { color: "#E9FBFF", fontSize: 20, fontWeight: "600", marginTop: 10, marginHorizontal: 16, lineHeight: 28 },

  tapHint: { position: "absolute", bottom: 12, right: 12, flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: "#FFFFFF12", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  tapText: { color: "#CEE9F6", fontSize: 12 },

  controls: { paddingVertical: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#0A2744" },
  ctrlBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#07223E", borderWidth: 1, borderColor: "#12436E", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  ctrlTxt: { color: "#D9F7FF", fontWeight: "700", letterSpacing: 0.6 },
  counter: { color: "#9FD9F3", fontWeight: "700" },

  dots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1B3A57" },
  dotOn: { backgroundColor: "#5EDCFF" },
  moreDots: { color: "#A9DAF1", marginLeft: 8 }
});
