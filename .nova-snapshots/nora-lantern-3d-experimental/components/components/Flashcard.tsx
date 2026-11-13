import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { useCollections } from "../state/CollectionsContext";
import { useCoins } from "../state/CoinsContext";
import { useToast } from "../state/ToastContext";
import { useAchievements } from "../state/AchievementsContext";
import { markStudied } from "@lib/storage";
import { useHaptics } from "@lib/haptics";
type Props = {
  id: string;
  topic: string;
  question: string;
  answer: string;
  topicKey?: string;
  index?: number;
};
export default function Flashcard({
  id,
  topic,
  question,
  answer,
  topicKey,
  index,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const spin = new Animated.Value(0);
  const { collection, add, remove, has } = useCollections();
  const inCollection = has(id);
  const { add: addCoins } = useCoins();
  const toast = useToast().show;
  const { unlock } = useAchievements();
  const { pulse, success } = useHaptics();
  const frontInterpolate = spin.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = spin.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });
  const flip = async () => {
    const to = flipped ? 0 : 180;
    setFlipped(!flipped);
    Animated.timing(spin, {
      toValue: to,
      duration: 250,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    if (!flipped && topicKey) {
      await markStudied(topicKey, id);
    }
    pulse();
  };
  const onAdd = () => {
    if (!inCollection) {
      const nextLen = collection.length + 1;
      add({ id, topic, question, answer, createdAt: Date.now() });
      addCoins(5);
      toast("Saved to Collection +5");
      if (nextLen === 1 && unlock("collection_first")) {
        addCoins(25);
        toast("Achievement: First saved card +25");
        success();
      }
      if (nextLen >= 25 && unlock("collection_25")) {
        addCoins(50);
        toast("Achievement: 25 cards collected +50");
      }
      if (nextLen >= 50 && unlock("collection_50")) {
        addCoins(100);
        toast("Achievement: 50 cards collected +100");
      }
      if (nextLen >= 100 && unlock("collection_100")) {
        addCoins(250);
        toast("Achievement: 100 cards collected +250");
      }
    } else {
      remove(id);
      toast("Removed from Collection");
    }
  };
  const pillText = inCollection ? "✓" : "+";
  const side = useMemo(
    () => ({
      padding: 16,
      borderRadius: 16,
      backgroundColor: "white",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
      minHeight: 160,
      justifyContent: "center",
    }),
    [],
  );
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ position: "absolute", right: 8, top: 8, zIndex: 20 }}>
        <Pressable
          onPress={onAdd}
          style={{
            backgroundColor: "#111827",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>{pillText}</Text>
        </Pressable>
      </View>
      <Pressable onPress={flip} accessibilityRole="button">
        <Animated.View
          style={{
            backfaceVisibility: "hidden",
            transform: [{ rotateY: frontInterpolate }],
          }}
        >
          <View style={side}>
            <Text style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
              {topic}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>{question}</Text>
            <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
              tap to flip
            </Text>
          </View>
        </Animated.View>
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backfaceVisibility: "hidden",
            transform: [{ rotateY: backInterpolate }],
          }}
        >
          <View style={[side, { backgroundColor: "#F9FAFB" }]}>
            <Text style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
              {topic}
            </Text>
            <Text style={{ fontSize: 16 }}>Answer</Text>
            <Text style={{ fontSize: 18, fontWeight: "700", marginTop: 4 }}>
              {answer}
            </Text>
            <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
              tap to flip back
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}
