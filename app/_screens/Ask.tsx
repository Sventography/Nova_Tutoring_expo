import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, View, Text, TextInput, TouchableOpacity, Animated, Easing, KeyboardAvoidingView, ScrollView } from "react-native";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE as string) || "http://127.0.0.1:5000";
const ASK_ENDPOINT = (API_BASE.replace(/\/+$/,"")) + "/ask";
let _mem: Record<string, string> = {};
const Storage = { async getItem(k: string){ try{ const AS=require("@react-native-async-storage/async-storage").default; return await AS.getItem(k);}catch{return _mem[k]??null;}}, async setItem(k:string,v:string){ try{ const AS=require("@react-native-async-storage/async-storage").default; await AS.setItem(k,v);}catch{ _mem[k]=v; }}};
function useToast(){ const[msg,setMsg]=useState<string|null>(null); const[visible,setVisible]=useState(false); const t=useRef<any>(null); const show=(m:string,ms=2200)=>{ setMsg(m); setVisible(true); if(t.current)clearTimeout(t.current); t.current=setTimeout(()=>setVisible(false),ms);}; const Toast=visible?(<View pointerEvents="none" style={{ position:"absolute", bottom:24, left:16, right:16, backgroundColor:"rgba(0,0,0,0.85)", borderRadius:16, paddingVertical:12, paddingHorizontal:16, borderWidth:1, borderColor:"rgba(0,255,255,0.35)" }}><Text style={{ color:"white", textAlign:"center", fontWeight:"600" }}>{msg}</Text></View>):null; return{show,Toast};}
function ThinkingShimmer({ text }:{text:string}){ const letters=text.split(""); const anims=useMemo(()=>letters.map(()=>new Animated.Value(0)),[text]); useEffect(()=>{ const loops=anims.map((a,i)=>Animated.loop(Animated.sequence([Animated.timing(a,{toValue:1,duration:650,easing:Easing.inOut(Easing.quad),useNativeDriver:false}),Animated.timing(a,{toValue:0,duration:650,easing:Easing.inOut(Easing.quad),useNativeDriver:false})])).start({delay:i*60}as any)); return()=>loops.forEach((l:any)=>l?.stop?.());},[]); return(<View style={{ flexDirection:"row", flexWrap:"wrap", justifyContent:"center" }}>{letters.map((ch,i)=>(<Animated.Text key={i} style={{ fontSize:22, fontWeight:"800", color:(anims[i] as any).interpolate({ inputRange:[0,1], outputRange:["#66ffff","#ffffff"] }) }}>{ch}</Animated.Text>))}</View>);}
function useTypewriter(){ const[output,setOutput]=useState(""); const cancelRef=useRef<{cancel?:()=>void}>({}); const type=async(text:string,speed=16)=>{ cancelRef.current.cancel&&cancelRef.current.cancel(); let cancelled=false; cancelRef.current.cancel=()=>{cancelled=true;}; setOutput(""); const chars=Array.from(text); for(let i=0;i<chars.length;i++){ if(cancelled)return; setOutput(p=>p+chars[i]); await new Promise(r=>setTimeout(r,speed)); } }; const clear=()=>{ cancelRef.current.cancel&&cancelRef.current.cancel(); setOutput(""); }; return{output,type,clear};}
export default function AskScreen(){ const[q,setQ]=useState(""); const[isThinking,setIsThinking]=useState(false); const[coins,setCoins]=useState(0); const[qCount,setQCount]=useState(0); const[voiceCount]=useState(0); const busy=useRef(false); const{output,type,clear}=useTypewriter(); const{show,Toast}=useToast();
  useEffect(()=>{(async()=>{ const[c,qc,vc]=await Promise.all([Storage.getItem("nova.coins"),Storage.getItem("nova.qCount"),Storage.getItem("nova.voiceCount")]); if(c)setCoins(parseInt(c,10)||0); if(qc)setQCount(parseInt(qc,10)||0); if(vc){} })();},[]);
  useEffect(()=>{Storage.setItem("nova.coins",String(coins));},[coins]); useEffect(()=>{Storage.setItem("nova.qCount",String(qCount));},[qCount]);
  const reward=(amt:number,why:string)=>{ setCoins(c=>c+amt); show(`+${amt} coins • ${why}`); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); };
  const bumpQ=()=>setQCount(prev=>{ const n=prev+1; if(n===50)reward(100,"50 questions asked"); if(n===100)reward(250,"100 questions asked"); return n; });
  const fetchAnswer=async(question:string)=>{ try{ const r=await fetch(ASK_ENDPOINT,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({question}) }); if(!r.ok)throw new Error("bad response"); const data=await r.json(); return (data&&(data.answer||data.result||data.text))||"No answer returned."; }catch{ return "Sassy Nova can’t reach the server. Set EXPO_PUBLIC_API_BASE or start Flask."; } };
  const onAsk=async()=>{ const query=q.trim(); if(!query){show("Type a question first"); return;} if(busy.current)return; busy.current=true; try{ await Haptics.selectionAsync(); setIsThinking(true); clear(); const ans=await fetchAnswer(query); setIsThinking(false); await type(ans,16); bumpQ(); }catch{ setIsThinking(false); show("Something went wrong. Try again."); }finally{ busy.current=false; } };
  const glow=useRef(new Animated.Value(0)).current; useEffect(()=>{ Animated.loop(Animated.sequence([Animated.timing(glow,{toValue:1,duration:1100,easing:Easing.inOut(Easing.quad),useNativeDriver:false}),Animated.timing(glow,{toValue:0,duration:1100,easing:Easing.inOut(Easing.quad),useNativeDriver:false})])).start();},[]); const glowStyle:any={ shadowColor:"#00ffff", shadowOpacity:glow.interpolate({inputRange:[0,1],outputRange:[0.3,0.75]}) as any, shadowRadius:glow.interpolate({inputRange:[0,1],outputRange:[6,14]}) as any, shadowOffset:{width:0,height:0} };
  const QuickBtn=({href,title}:{href:string;title:string})=>(<Link href={href} asChild><TouchableOpacity style={{ backgroundColor:"#0b0b0b", borderColor:"#00ffff", borderWidth:1, paddingVertical:10, paddingHorizontal:12, borderRadius:12 }}><Text style={{ color:"#66ffff", fontWeight:"700" }}>{title}</Text></TouchableOpacity></Link>);
  return(<KeyboardAvoidingView style={{ flex:1, backgroundColor:"black" }} behavior={Platform.OS==="ios"?"padding":undefined}>
    <View style={{ paddingTop:18, paddingHorizontal:18, paddingBottom:10, borderBottomColor:"rgba(0,255,255,0.15)", borderBottomWidth:1 }}>
      <Text style={{ color:"white", fontSize:22, fontWeight:"800" }}>Ask Nova</Text>
      <View style={{ flexDirection:"row", marginTop:8 }}>
        <Link href="/(tabs)/account" asChild><TouchableOpacity style={{ marginRight:10, paddingVertical:6, paddingHorizontal:10, borderRadius:12, backgroundColor:"rgba(0,255,255,0.08)", borderWidth:1, borderColor:"rgba(0,255,255,0.25)" }}><Text style={{ color:"#66ffff", fontWeight:"700" }}>⭐ Coins: <Text style={{ color:"white" }}>{coins}</Text></Text><Text style={{ color:"#7ff", fontSize:10 }}>View profile</Text></TouchableOpacity></Link>
        <View style={{ marginRight:10, paddingVertical:6, paddingHorizontal:10, borderRadius:12, backgroundColor:"rgba(255,255,255,0.06)", borderWidth:1, borderColor:"rgba(255,255,255,0.2)" }}><Text style={{ color:"#ddd" }}>Q: <Text style={{ color:"white", fontWeight:"700" }}>{qCount}</Text></Text></View>
      </View>
    </View>
    <ScrollView contentContainerStyle={{ flexGrow:1 }}>
      <View style={{ flex:1, padding:18, justifyContent:"center", alignItems:"center" }}>{isThinking ? <ThinkingShimmer text={"Nova is thinking..."} /> : <Text style={{ color:"white", fontSize:16, lineHeight:22, textAlign:"left", width:"100%" }}>{output || "Voice or text — I’ll bring the glow ✨"}</Text>}</View>
    </ScrollView>
    <View style={{ padding:18, gap:12 }}>
      <View style={{ flexDirection:"row", alignItems:"center", backgroundColor:"#0b0b0b", borderRadius:16, borderWidth:1, borderColor:"rgba(0,255,255,0.25)", paddingHorizontal:12, paddingVertical:8 }}>
        <TextInput value={q} onChangeText={setQ} placeholder="Ask Nova anything..." placeholderTextColor="#7dd" style={{ flex:1, color:"white", paddingVertical:8, fontSize:16 }} returnKeyType="send" onSubmitEditing={onAsk} />
        <Animated.View style={[{ borderRadius:14, opacity:isThinking?0.6:1 }, glowStyle]}><TouchableOpacity disabled={isThinking} onPress={onAsk} style={{ backgroundColor:"#00ffff", paddingVertical:12, paddingHorizontal:18, borderRadius:14 }}><Text style={{ color:"black", fontWeight:"800" }}>{isThinking?"...":"Ask"}</Text></TouchableOpacity></Animated.View>
      </View>
      <View style={{ gap:10 }}>
        <Text style={{ color:"#7ff", opacity:0.9, fontSize:12 }}>Quick links</Text>
        <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8 }}>
          <QuickBtn href="/" title="Landing" />
          <QuickBtn href="/(tabs)" title="Tabs Home" />
          <QuickBtn href="/(tabs)/account" title="Account" />
          <QuickBtn href="/(tabs)/flashcards" title="Flashcards" />
          <QuickBtn href="/(tabs)/quiz" title="Quiz" />
          <QuickBtn href="/(tabs)/collections" title="Collections" />
          <QuickBtn href="/(tabs)/shop" title="Shop" />
          <QuickBtn href="/(tabs)/relax" title="Relax" />
          <QuickBtn href="/(tabs)/brain" title="Brain" />
        </View>
      </View>
    </View>
    {Toast}
  </KeyboardAvoidingView>);
}
