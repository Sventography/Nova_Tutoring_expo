import React from 'react';
import { View, StyleSheet } from 'react-native';

type State = 'p' | 'g' | 'r';

export default function DotBar({ states, current }: { states: State[]; current: number }) {
  return (
    <View style={s.wrap}>
      {states.map((st, i) => (
        <View
          key={i}
          style={[
            s.dot,
            st === 'g' && s.ok,
            st === 'r' && s.bad,
            i === current && s.cur
          ]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8, alignSelf: 'center', marginTop: 12, flexWrap: 'wrap' },
  dot: { width: 10, height: 10, borderRadius: 10, backgroundColor: '#203040' },
  ok: { backgroundColor: '#00d26a' },
  bad: { backgroundColor: '#ff375f' },
  cur: { borderWidth: 1, borderColor: '#00e0ff', transform: [{ scale: 1.3 }] }
});