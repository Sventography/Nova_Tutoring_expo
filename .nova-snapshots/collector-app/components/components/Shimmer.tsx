import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function Shimmer({
  height = 64,
  borderRadius = 16,
}: {
  height?: number;
  borderRadius?: number;
}) {
  const x = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    const loop = () => {
      Animated.timing(x, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }).start(() => {
        x.setValue(-1);
        loop();
      });
    };
    loop();
  }, [x]);
  const translateX = x.interpolate({
    inputRange: [-1, 1],
    outputRange: [-150, 150],
  });
  return (
    <View style={[styles.wrap, { height, borderRadius }]}>
      <Animated.View style={[styles.shine, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.25)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { backgroundColor: "#111827", overflow: "hidden" },
  shine: { ...StyleSheet.absoluteFillObject },
});
