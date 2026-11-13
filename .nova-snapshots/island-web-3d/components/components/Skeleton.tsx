import React, { useEffect, useRef } from "react";
import { Animated, View, ViewStyle } from "react-native";
export default function Skeleton({
  height = 16,
  width = "100%",
  radius = 10,
  style,
}: {
  height?: number;
  width?: number | string;
  radius?: number;
  style?: ViewStyle;
}) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = () => {
      a.setValue(0);
      Animated.timing(a, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }).start(() => loop());
    };
    loop();
  }, [a]);
  const bg = a.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0.06)", "rgba(0,0,0,0.12)"],
  });
  return (
    <Animated.View
      style={[
        { height, width, borderRadius: radius, backgroundColor: bg as any },
        style,
      ]}
    />
  );
}
