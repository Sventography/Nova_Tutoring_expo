import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

const SOUNDS = [
  { key:'fireplace', file: require('../assets/sounds/fireplace.mp3') },
  { key:'calm',      file: require('../assets/sounds/calm.mp3') },
  { key:'ocean',     file: require('../assets/sounds/ocean.mp3') },
  { key:'rain',      file: require('../assets/sounds/rain.mp3') },
];

export default function Relax() {
  const [active, setActive] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  async function play(key:string, file:any) {
    try {
      if (soundRef.current) { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null; }
      const { sound } = await Audio.Sound.createAsync(file, { isLooping: true, volume: 0.8 });
      soundRef.current = sound;
      await sound.playAsync();
      setActive(key);
    } catch (e) { console.warn(e); }
  }
  async function stop() {
    if (soundRef.current) { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null; }
    setActive(null);
  }

  return (
    <View style={s.container}>
      <Text style={s.h}>Relax</Text>
      <View style={s.row}>
        {SOUNDS.map(snd => (
          <Pressable key={snd.key} onPress={() => play(snd.key, snd.file)} style={[s.pill, active===snd.key && s.pillActive]}>
            <Text style={s.pillText}>{snd.key}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.row}>
        <Pressable onPress={stop} style={s.pill}><Text style={s.pillText}>Stop</Text></Pressable>
      </View>

      <Text style={[s.h, {marginTop:24}]}>Breathing</Text>
      <View style={s.row}>
        <Breath preset="Box" pattern={[4,4,4,4]} />
        <Breath preset="4-7-8" pattern={[4,7,8]} />
        <Breath preset="Coherence" pattern={[5,5]} />
      </View>
    </View>
  );
}

function Breath({preset, pattern}:{preset:string; pattern:number[]}) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{preset}</Text>
      <Text style={s.cardNote}>{pattern.join(' • ')} sec</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, padding:16, gap:12 },
  h:{ color:'#cfe8ef', fontWeight:'800', fontSize:20 },
  row:{ flexDirection:'row', flexWrap:'wrap', gap:8 },
  pill:{ backgroundColor:'#123a42', paddingHorizontal:14, paddingVertical:10, borderRadius:999, borderWidth:1, borderColor:'#1f707a' },
  pillActive:{ backgroundColor:'#1e828f' },
  pillText:{ color:'#cfe8ef', fontWeight:'600', textTransform:'capitalize' },
  card:{ backgroundColor:'#0c2a31', borderColor:'#155a63', borderWidth:1, borderRadius:12, padding:12, minWidth:110 },
  cardTitle:{ color:'#cfe8ef', fontWeight:'700' },
  cardNote:{ color:'#9bb7bf', marginTop:4 },
});
