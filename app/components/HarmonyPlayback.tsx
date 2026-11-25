import React,{useCallback,useEffect,useRef,useState} from "react";
import {AppState,Platform,Pressable,Text,View} from "react-native";
import {useFocusEffect} from "expo-router";
import {Audio} from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import {useTheme} from "../context/ThemeContext";
import {KEY_NOTES} from "../_lib/discoveryLabs";
import {harmonyWave,waveBase64} from "../_lib/harmonyAudio";

type ActiveTone={sound:Audio.Sound;file:string|null};
let fileCounter=0;
async function dispose(tone:ActiveTone){
 await tone.sound.unloadAsync().catch(()=>{});
 if(tone.file)await FileSystem.deleteAsync(tone.file,{idempotent:true}).catch(()=>{});
}
export default function HarmonyPlayback({notes}:{notes:readonly number[]}){
 const {tokens}=useTheme();
 const current=useRef<ActiveTone|null>(null);
 const generation=useRef(0);
 const inFlight=useRef(false);
 const focused=useRef(false);
 const mounted=useRef(true);
 const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState("");
 const stop=useCallback(()=>{
  generation.current++;
  const tone=current.current;
  current.current=null;
  if(tone)void dispose(tone);
 },[]);
 useEffect(()=>{
  mounted.current=true;
  const sub=AppState.addEventListener("change",state=>{
   if(state!=="active"){
    stop();
    if(mounted.current)setStatus("");
   }
  });
  return()=>{mounted.current=false;sub.remove();stop();};
 },[stop]);
 useFocusEffect(useCallback(()=>{
  focused.current=true;
  return()=>{focused.current=false;stop();if(mounted.current)setStatus("");};
 },[stop]));
 async function play(keys:readonly number[]){
  if(inFlight.current||!focused.current)return;
  inFlight.current=true;setBusy(true);
  const request=++generation.current;
  const valid=()=>mounted.current&&focused.current&&request===generation.current;
  const previous=current.current;current.current=null;
  let tone:ActiveTone|null=null;
  let file:string|null=null;
  try{
   if(previous)await dispose(previous);
   if(!valid())return;
   setStatus("Preparing sound…");
   const data=waveBase64(harmonyWave(keys));
   let uri="data:audio/wav;base64,"+data;
   if(Platform.OS!=="web"){
    if(!FileSystem.cacheDirectory)throw new Error("Audio cache unavailable");
    file=FileSystem.cacheDirectory+"nova-harmony-"+Date.now()+"-"+(++fileCounter)+".wav";
    await FileSystem.writeAsStringAsync(file,data,{encoding:FileSystem.EncodingType.Base64});
    uri=file;
   }
   if(!valid())return;
   const sound=new Audio.Sound();
   tone={sound,file};
   await sound.loadAsync({uri},{shouldPlay:false,isLooping:false,volume:0.65});
   if(!valid())return;
   const playing=tone;
   current.current=playing;
   sound.setOnPlaybackStatusUpdate(update=>{
    if(!valid()||current.current!==playing)return;
    if(!update.isLoaded||update.didJustFinish){
     current.current=null;
     if(mounted.current)setStatus(update.isLoaded?"":"Sound unavailable. You can still explore the visual keyboard.");
     void dispose(playing);
    }
   });
   await sound.playAsync();
   if(valid()&&current.current===playing)setStatus("Playing "+keys.map(k=>KEY_NOTES[k]).join(" + "));
   // Ownership has transferred to current/cleanup (including completion callback).
   tone=null;file=null;
  }catch{
   if(valid())setStatus("Sound unavailable. You can still explore the visual keyboard.");
  }finally{
   if(tone){
    if(current.current===tone)current.current=null;
    await dispose(tone);
   }else if(file)await FileSystem.deleteAsync(file,{idempotent:true}).catch(()=>{});
   inFlight.current=false;
   if(mounted.current)setBusy(false);
  }
 }
 const button=(title:string,onPress:()=>void,disabled=false)=>(
  <Pressable key={title} accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled}
   onPress={onPress} style={{padding:10,minHeight:44,borderWidth:1,borderRadius:9,borderColor:tokens.border,backgroundColor:tokens.bg,opacity:disabled?0.5:1,justifyContent:"center"}}>
   <Text style={{color:tokens.text,fontWeight:"600"}}>{title}</Text>
  </Pressable>
 );
 return <View style={{gap:8}}>
  <Text style={{color:tokens.text}}>Listen to the chord or individual notes. These are short synthesized tones, not a recorded piano.</Text>
  <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
   {button("Play chord",()=>void play(notes),busy)}
   {button("Stop sound",()=>{stop();setStatus("");})}
  </View>
  <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
   {KEY_NOTES.map((name,index)=>button("Play "+name,()=>void play([index]),busy))}
  </View>
  {!!status&&<Text accessibilityLiveRegion="polite" style={{color:tokens.text}}>{status}</Text>}
  <Text style={{color:tokens.text}}>Compare C4 and C5: doubling the frequency creates an octave. Sound plays only when you choose it; start with your device volume low.</Text>
 </View>;
}
