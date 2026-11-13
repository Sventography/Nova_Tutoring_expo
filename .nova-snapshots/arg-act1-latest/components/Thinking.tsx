import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

export default function Thinking({ label = "Nova is thinking..." }: { label?: string }) {
  const opacity = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#8b74ff", opacity }} />
      <Text style={{ color: "#a7a7b2" }}>{label}</Text>
    </View>
  );
}
