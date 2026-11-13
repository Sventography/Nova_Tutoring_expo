import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

export default function NovaThinking({ visible = false }: { visible?: boolean }) {
  const op = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.2, duration: 500, useNativeDriver: true })
      ])
    );
    if (visible) loop.start(); else op.setValue(0);
    return () => loop.stop();
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View style={{ opacity: op }}>
      <Text style={s.thinking}>Nova is thinking…</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  thinking:{color:'#9be8ff',fontWeight:'800',textAlign:'center',marginTop:8}
});
