import {useCallback,useEffect,useRef,useState} from "react";
import {AccessibilityInfo,Platform} from "react-native";
import {useFocusEffect} from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {Interest} from "../../app/_lib/discoveryModel";
import {parse,profileKey,themes} from "./preferences";
import {stageAt} from "./districts";
export function useDistrictView(owner:string|null,level:number){
 const [ids,setIds]=useState<Interest[]>([]),[visiting,setVisit]=useState(false);
 const [motion,setMotion]=useState(false),[reduced,setReduced]=useState(true);
 const [celebrating,setCelebrate]=useState(false);
 const prior=useRef(stageAt(level));
 useFocusEffect(useCallback(()=>{
  let live=true;setVisit(false);setIds([]);setMotion(false);setCelebrate(false);
  AsyncStorage.getItem(profileKey(owner)).then(raw=>{if(live)setIds(themes(parse(raw)));}).catch(()=>{});
  return ()=>{live=false;};
 },[owner]));
 useEffect(()=>{
  type Media={matches:boolean;addEventListener:(name:string,fn:()=>void)=>void;removeEventListener:(name:string,fn:()=>void)=>void};
  const browser=globalThis as typeof globalThis & {matchMedia?:(query:string)=>Media};
  if(Platform.OS==="web" && browser.matchMedia){
   const q=browser.matchMedia("(prefers-reduced-motion: reduce)");const change=()=>setReduced(q.matches);
   change();q.addEventListener("change",change);return ()=>q.removeEventListener("change",change);
  }
  let live=true;AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(live)setReduced(v);}).catch(()=>{});
  const sub=AccessibilityInfo.addEventListener("reduceMotionChanged",setReduced);
  return ()=>{live=false;sub.remove();};
 },[]);
 const stage=stageAt(level);
 useEffect(()=>{
  if(visiting && !reduced && stage>prior.current)setCelebrate(true);
  prior.current=stage;
 },[stage,visiting,reduced]);
 useEffect(()=>{
  if(!visiting||reduced){setMotion(false);setCelebrate(false);return;}
  if(!motion&&!celebrating)return;
  const timer=setTimeout(()=>{setMotion(false);setCelebrate(false);},3000);
  return ()=>clearTimeout(timer);
 },[visiting,motion,celebrating,reduced]);
 return {ids,visiting,setVisit,reduced,motion,celebrating,play:()=>setMotion(true),stop:()=>{setMotion(false);setCelebrate(false);}};
}
