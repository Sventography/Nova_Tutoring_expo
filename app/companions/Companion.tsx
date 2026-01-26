import React, { useEffect, useRef, useState } from "react";
import { View, Animated, StyleSheet, Text } from "react-native";
import { onCompanion } from "./CompanionEvents";
import { Companion as CompanionType } from "./companions";

export default function Companion({ companion }: { companion: CompanionType }) {
  const bob = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  const [burstType, setBurstType] = useState<"heart" | "coin" | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    return onCompanion((reaction) => {
      if (reaction === "celebrate") celebrate();
      if (reaction === "coin") coinBurst();
      if (reaction === "comfort") heartBurst();
    });
  }, []);

  const celebrate = () => {
    Animated.sequence([
      Animated.timing(jump, {
        toValue: -28,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(jump, {
        toValue: 0,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const heartBurst = () => {
    setBurstType("heart");
    triggerBurst();
  };

  const coinBurst = () => {
    setBurstType("coin");
    triggerBurst();
  };

  const triggerBurst = () => {
    burst.setValue(0);
    Animated.timing(burst, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start(() => setBurstType(null));
  };

  return (
    <View style={styles.container}>
      <Animated.Image
        source={companion.image}
        style={[
          styles.image,
          {
            transform: [{ translateY: Animated.add(bob, jump) }],
          },
        ]}
      />

      {burstType && (
        <View style={styles.burst}>
          {[...Array(6)].map((_, i) => (
            <Animated.Text
              key={i}
              style={{
                position: "absolute",
                opacity: burst.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
                transform: [
                  {
                    translateY: burst.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -50],
                    }),
                  },
                  { translateX: (Math.random() - 0.5) * 40 },
                ],
                fontSize: 18,
              }}
            >
              {burstType === "heart" ? "💜" : "🪙"}
            </Animated.Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  image: { width: 96, height: 96, resizeMode: "contain" },
  burst: { position: "absolute", top: -10 },
});
