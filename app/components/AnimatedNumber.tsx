import React, { useRef, useEffect, useState } from "react";
import { Animated, Text } from "react-native";

type Props = { value: number; style?: any; duration?: number };

export default function AnimatedNumber({ value, style, duration = 600 }: Props) {
  const anim = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();
  }, [value]);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    return () => anim.removeListener(id);
  }, []);

  return <Text style={style}>{display}</Text>;
}
