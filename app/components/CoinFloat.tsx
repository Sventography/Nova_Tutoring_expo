import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";

type Props = { amount: number; tier?: "bronze"|"silver"|"gold"|"diamond"; onDone?: () => void };

export default function CoinFloat({ amount, tier, onDone }: Props) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: -40, duration: 1000, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, []);

  const color =
    tier === "bronze" ? "#ff8800" :
    tier === "silver" ? "#cccccc" :
    tier === "gold"   ? "#ffd700" :
    tier === "diamond"? "#00e5ff" :
    "#00e5ff";

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: y }], opacity }]}>
      <Text style={[styles.txt, { color, textShadowColor: color } ]}>+{amount}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 0,
    top: -10,
  },
  txt: {
    fontSize: 14,
    fontWeight: "700",
    textShadowRadius: 6,
  },
});
