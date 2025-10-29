import React, { useRef } from "react";
import { Pressable, View } from "react-native";

export default function SecretSequence() {
  const count = useRef(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const onTap = () => {
    count.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => (count.current = 0), 1800);
    if (count.current >= 7) {
      count.current = 0;
      console.log("🔓 Secret unlocked!");
    }
  };

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 4, bottom: 4 }}>
      <Pressable onPress={onTap} hitSlop={20} style={{ width: 24, height: 24 }} />
    </View>
  );
}
