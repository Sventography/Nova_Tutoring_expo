import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";

export type ToastItem = { id: string; text: string };
type Props = { toasts: ToastItem[]; onDone: (id: string) => void };

export default function Toast({ toasts, onDone }: Props) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 70,
        left: 0,
        right: 0,
        alignItems: "center",
      }}
    >
      {toasts.map((t) => (
        <ToastBubble key={t.id} id={t.id} text={t.text} onDone={onDone} />
      ))}
    </View>
  );
}

function ToastBubble({
  id,
  text,
  onDone,
}: {
  id: string;
  text: string;
  onDone: (id: string) => void;
}) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(a, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(1800),
      Animated.timing(a, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => onDone(id));
  }, [id]);
  return (
    <Animated.View
      style={{
        opacity: a,
        transform: [
          {
            translateY: a.interpolate({
              inputRange: [0, 1],
              outputRange: [-10, 0],
            }),
          },
        ],
        backgroundColor: "#121821",
        borderColor: "#1b2530",
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: "#E6F1FF", fontWeight: "700" }}>{text}</Text>
    </Animated.View>
  );
}
