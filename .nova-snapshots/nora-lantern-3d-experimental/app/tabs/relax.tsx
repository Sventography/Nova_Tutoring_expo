import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Audio, AVPlaybackSource } from "expo-av";

// breathing modes
const MODES = [
  { id:"box",   name:"Box (4–4–4–4)", inhale:4, hold1:4, exhale:4, hold2:4 },
  { id:"478",   name:"4–7–8",         inhale:4, hold1:7, exhale:8, hold2:0 },
  { id:"calm",  name:"Calm 5–5",      inhale:5, hold1:0, exhale:5, hold2:0 },
];

const SOUNDS: { id:string; label:string; src: AVPlaybackSource }[] = [
  { id:"ocean",     label:"Ocean",     src: require("../../assets/sounds/ocean.mp3") },
  { id:"calm",      label:"Calm",      src: require("../../assets/sounds/calm.mp3") },
  { id:"fireplace", label:"Fireplace", src: require("../../assets/sounds/fireplace.mp3") },
  { id:"rain",      label:"Rain",      src: require("../../assets/sounds/rain.mp3") },
];

type Phase = "inhale"|"hold1"|"exhale"|"hold2";

function timeFor(p:Phase, m:any){
  return p==="inhale"?m.inhale : p==="hold1"?m.hold1 : p==="exhale"?m.exhale : m.hold2;
}
function nextPhase(p:Phase, m:any){
  if (p==="inhale") return m.hold1? "hold1":"exhale";
  if (p==="hold1")  return "exhale";
  if (p==="exhale") return m.hold2? "hold2":"inhale";
  return "inhale";
}

export default function Relax(){
  // breathing loop
  const [mode, setMode] = useState(MODES[0]);
  const [phase, setPhase] = useState<Phase>("inhale");
  const [left, setLeft] = useState(mode.inhale);
  const [running, setRunning] = useState(true);
  const timerRef = useRef<NodeJS.Timeout|null>(null);

  // bubble anim
  const scale = useRef(new Animated.Value(0.9)).current;
  const animateTo = (k:number, ms:number)=> Animated.timing(scale,{ toValue:k, duration:ms, useNativeDriver:true });

  useEffect(()=>{
    if (!running) { timerRef.current && clearInterval(timerRef.current); return; }
    setLeft(timeFor(phase,mode));
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(()=>{
      setLeft(n=>{
        if (n>1) return n-1;
        const nxt = nextPhase(phase, mode);
        setPhase(nxt);
        const ms = 300;
        if (nxt === "inhale") animateTo(1.15, ms).start();
        else if (nxt === "exhale") animateTo(0.85, ms).start();
        return timeFor(nxt, mode);
      });
      return 0;
    },1000);
    return ()=>{ timerRef.current && clearInterval(timerRef.current); };
  },[running, phase, mode]);

  // relax time tracking for achievements (optional)
  const startedAtRef = useRef<number>(Date.now());
  useEffect(()=>()=>{ // on unmount send relax seconds
    try {
      const { useAchievementsEngine } = require("../context/AchievementEngineContext");
      const { track } = useAchievementsEngine?.() || {};
      if (track) track({ type:"relax:spent", payload:{ seconds: Math.floor((Date.now()-startedAtRef.current)/1000) } });
    } catch {}
  },[]);

  // ambient sounds
  const soundRef = useRef<Audio.Sound|null>(null);
  const [playingId, setPlayingId] = useState<string|null>(null);

  async function toggleSound(id:string, src:AVPlaybackSource){
    try {
      // stop if same pressed
      if (playingId === id) {
        await soundRef.current?.stopAsync(); await soundRef.current?.unloadAsync();
        soundRef.current = null; setPlayingId(null); return;
      }
      // stop existing
      if (soundRef.current) { try { await soundRef.current.stopAsync(); } catch{} try{ await soundRef.current.unloadAsync(); } catch{} }
      const { sound } = await Audio.Sound.createAsync(src, { isLooping: true, volume: 0.7 });
      soundRef.current = sound; setPlayingId(id);
      await sound.playAsync();
    } catch (e) { console.warn("sound toggle failed", e); }
  }
  useEffect(()=>()=>{ // cleanup
    soundRef.current?.unloadAsync();
  },[]);

  // grounding inputs
  const [g5,setG5]=useState(""); const [g4,setG4]=useState("");
  const [g3,setG3]=useState(""); const [g2,setG2]=useState(""); const [g1,setG1]=useState("");

  return (
    <LinearGradient colors={["#ffd6e7","#ffffff"]} style={{flex:1}}>
      <View style={S.container}>
        <Text style={S.title}>Relax</Text>
        <Text style={S.sub}>Breathe, center, listen. Your time here counts toward relax achievements.</Text>

        <View style={S.modesRow}>
          {MODES.map(m=>(
            <Pressable key={m.id} onPress={()=>{ setMode(m); setPhase("inhale"); setLeft(m.inhale); }}
              style={[S.modeBtn, m.id===mode.id && S.modeBtnOn]}>
              <Text style={S.modeTxt}>{m.name}</Text>
            </Pressable>
          ))}
        </View>

        <View style={S.audioRow}>
          {SOUNDS.map(s=>(
            <Pressable key={s.id} onPress={()=>toggleSound(s.id, s.src)}
              style={[S.soundBtn, playingId===s.id && S.soundBtnOn]}>
              <Text style={[S.soundTxt, playingId===s.id && S.soundTxtOn]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={S.bubbleWrap}>
          <Animated.View style={[S.bubble,{ transform:[{scale}] }]}/>
          <Text style={S.phase}>{phase.toUpperCase()}</Text>
          <Text style={S.timer}>{left}s</Text>
        </View>

        <View style={S.controls}>
          <Pressable onPress={()=>setRunning(v=>!v)} style={[S.ctrlBtn, !running && S.ctrlBtnAlt]}>
            <Text style={S.ctrlTxt}>{running?"Pause":"Resume"}</Text>
          </Pressable>
          <Pressable onPress={()=>{ setPhase("inhale"); setLeft(mode.inhale); }} style={[S.ctrlBtn,S.ctrlBtnGhost]}>
            <Text style={S.ctrlGhostTxt}>Reset</Text>
          </Pressable>
        </View>

        <View style={S.box}>
          <Text style={S.boxTitle}>5–4–3–2–1 Grounding</Text>
          <Text style={S.small}>Five things you can see:</Text>
          <TextInput style={S.input} value={g5} onChangeText={setG5} placeholder="…" placeholderTextColor="#6aaaba"/>
          <Text style={S.small}>Four things you can feel:</Text>
          <TextInput style={S.input} value={g4} onChangeText={setG4} placeholder="…" placeholderTextColor="#6aaaba"/>
          <Text style={S.small}>Three things you can hear:</Text>
          <TextInput style={S.input} value={g3} onChangeText={setG3} placeholder="…" placeholderTextColor="#6aaaba"/>
          <Text style={S.small}>Two things you can smell:</Text>
          <TextInput style={S.input} value={g2} onChangeText={setG2} placeholder="…" placeholderTextColor="#6aaaba"/>
          <Text style={S.small}>One thing you can taste:</Text>
          <TextInput style={S.input} value={g1} onChangeText={setG1} placeholder="…" placeholderTextColor="#6aaaba"/>
        </View>
      </View>
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  container:{ flex:1, padding:16 },
  title:{ color:"#062431", fontSize:22, fontWeight:"900" },
  sub:{ color:"#1e4a5e", marginTop:2, marginBottom:10 },
  modesRow:{ flexDirection:"row", gap:8, flexWrap:"wrap", marginBottom:10 },
  modeBtn:{ paddingVertical:8, paddingHorizontal:10, borderRadius:10, borderWidth:1, borderColor:"rgba(6,36,49,0.25)", backgroundColor:"rgba(255,255,255,0.6)" },
  modeBtnOn:{ backgroundColor:"#ffffff", borderColor:"rgba(6,36,49,0.5)" },
  modeTxt:{ color:"#062431", fontWeight:"800" },
  audioRow:{ flexDirection:"row", gap:8, flexWrap:"wrap", marginBottom:12 },
  soundBtn:{ paddingVertical:8, paddingHorizontal:10, borderRadius:10, borderWidth:1, borderColor:"rgba(6,36,49,0.2)", backgroundColor:"rgba(255,255,255,0.55)" },
  soundBtnOn:{ backgroundColor:"#062431" },
  soundTxt:{ color:"#062431", fontWeight:"800" },
  soundTxtOn:{ color:"#aaf5ff" },
  bubbleWrap:{ alignItems:"center", justifyContent:"center", height:220, marginBottom:12 },
  bubble:{ width:160, height:160, borderRadius:999, backgroundColor:"rgba(6,36,49,0.08)", borderWidth:2, borderColor:"rgba(6,36,49,0.35)" },
  phase:{ position:"absolute", top:38, color:"#062431", fontWeight:"900" },
  timer:{ position:"absolute", top:66, color:"#062431", fontSize:28, fontWeight:"900" },
  controls:{ flexDirection:"row", gap:10, marginBottom:12 },
  ctrlBtn:{ flex:1, backgroundColor:"#062431", borderWidth:1, borderColor:"rgba(6,36,49,0.35)", paddingVertical:12, borderRadius:12 },
  ctrlBtnAlt:{ backgroundColor:"#8b5569" },
  ctrlTxt:{ color:"#aaf5ff", textAlign:"center", fontWeight:"900" },
  ctrlBtnGhost:{ backgroundColor:"transparent" },
  ctrlGhostTxt:{ color:"#062431", textAlign:"center", fontWeight:"900" },
  box:{ backgroundColor:"rgba(255,255,255,0.7)", borderRadius:12, borderWidth:1, borderColor:"rgba(6,36,49,0.15)", padding:12 },
  boxTitle:{ color:"#062431", fontWeight:"900", marginBottom:6 },
  small:{ color:"#1e4a5e", marginTop:6, marginBottom:4 },
  input:{ backgroundColor:"#ffffff", borderWidth:1, borderColor:"rgba(6,36,49,0.15)", borderRadius:8, color:"#062431", paddingHorizontal:10, paddingVertical:8 },
});
