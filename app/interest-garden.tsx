import React, { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DISCOVERIES, INTERESTS, type Interest } from "./_lib/discoveryModel";
import { useTheme } from "./context/ThemeContext";
import { useUser } from "./context/UserContext";
import { useIsland } from "./context/IslandContext";
import Garden from "../features/adaptiveIsland/Garden";
import { fresh, parse, profileKey, themes, voluntary, type Preferences } from "../features/adaptiveIsland/preferences";
import {districts,stageAt,stageNames} from "../features/adaptiveIsland/districts";
import HarmonyPlayback from "./components/HarmonyPlayback";
import MasteryCheck from "../features/adaptiveIsland/MasteryCheck";

const writes = new Map<string, Promise<void>>();
class SceneBoundary extends React.Component<{children: React.ReactNode; color: string}, {failed:boolean}> {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  render() { return this.state.failed ? <Text style={{color:this.props.color}}>The 3D garden could not start on this device.</Text> : this.props.children; }
}
export default function InterestGarden() {
  const { ready, session } = useUser();
  const { lesson } = useLocalSearchParams<{lesson?: string}>();
  if (!ready) return null;
  const owner = session?.user?.id ?? null;
  return <Settings key={profileKey(owner)} owner={owner} lesson={lesson}/>;
}
function Settings({owner, lesson}: {owner:string|null; lesson?:string}) {
  const [sound,setSound]=useState(false);
  const key = profileKey(owner);
  const { level } = useIsland();
  const { tokens } = useTheme();
  const router = useRouter();
  const [prefs,setPrefs] = useState<Preferences|null>(null);
  const [status,setStatus] = useState("");
  const [busy,setBusy] = useState(false);
  const [retry,setRetry] = useState(0);
  const [marked,setMarked] = useState(false);
  const active = useRef(false);
  const locked = useRef(false);
  const topic = DISCOVERIES.find(d => d.id === lesson);
  useFocusEffect(useCallback(() => {
    let live = true;
    active.current = true;
    setPrefs(null);
    Promise.resolve(writes.get(key)).then(() => AsyncStorage.getItem(key)).then(raw => {
      if (live) { setPrefs(parse(raw)); setStatus(""); }
    }).catch(() => { if (live) setStatus("Settings could not be read. Retry to protect your saved choices."); });
    return () => {live=false; active.current=false;};
  },[key,retry]));
  function save(change:(p:Preferences)=>Preferences, message:string, onSuccess?:()=>void) {
    if (locked.current || !prefs) return;
    locked.current=true; setBusy(true);
    const task=Promise.resolve(writes.get(key)).then(async () => {
      const next=change(parse(await AsyncStorage.getItem(key)));
      await AsyncStorage.setItem(key, JSON.stringify(next));
      if (active.current) {setPrefs(next);setStatus(message);onSuccess?.();}
    }).catch(()=>{if(active.current)setStatus("Could not save this change. Please try again.");});
    writes.set(key,task);
    void task.finally(()=>{if(writes.get(key)===task)writes.delete(key);locked.current=false;if(active.current)setBusy(false);});
  }
  const ink={color:tokens.text};
  const button=(label:string, action:()=>void, disabled=false, selected?:boolean) =>
    <Pressable key={label} accessibilityRole="button" accessibilityState={{disabled,selected}} disabled={disabled}
      onPress={action} style={{padding:11,borderWidth:1,borderRadius:10,borderColor:selected?tokens.accent:tokens.border,backgroundColor:tokens.card,opacity:disabled?0.65:1}}>
      <Text style={ink}>{selected?"✓ ":""}{label}</Text></Pressable>;
  const selected=prefs ? themes(prefs) : [];
  const names=(ids:Interest[])=>ids.map(id=>INTERESTS.find(([key])=>key===id)?.[1]).join(", ");
  return <ScrollView style={{backgroundColor:tokens.bg}} contentContainerStyle={{padding:18,gap:12}}>
    {button("Return",()=>router.canGoBack()?router.back():router.replace("/island" as never))}
    <Text accessibilityRole="header" style={{...ink,fontSize:24,fontWeight:"700"}}>Island interest garden</Text>
    <Text style={ink}>Your private space on this device. Choose interests here, then visit their districts on My Island. New exhibits appear at Island levels 3, 6 and 10.</Text>
    {topic && owner && <MasteryCheck key={topic.id} lesson={topic.id}/>}
    {!prefs && status!=="" && button("Retry settings",()=>setRetry(n=>n+1))}
    {prefs && <>
      {button(prefs.enabled?"Disable personalization":"Enable personalization",()=>save(p=>({...p,enabled:!p.enabled,automatic:false,counts:{}}),"Settings saved."),busy)}
      {prefs.enabled && <>
        <Text style={ink}>Choose up to three interests. You can change them here anytime.</Text>
        <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{INTERESTS.map(([id,name]) => {
          const picked=prefs.picks.includes(id);
          return button(name,()=>save(p=>({...p,picks:p.picks.includes(id)?p.picks.filter(x=>x!==id):[...p.picks,id].slice(0,3)}),"Interests saved."),busy||(!picked&&prefs.picks.length>=3),picked);
        })}</View>
        {button(prefs.automatic?"Use my choices only":"Adapt to my voluntary discoveries",()=>save(p=>({...p,automatic:!p.automatic,counts:{}}),"Learning preference saved."),busy)}
        {prefs.automatic && <Text style={ink}>Only discoveries you mark as your own interest count. Your choices come first. Voluntary activity fills any remaining spaces. Turning this off clears the counts.</Text>}
        {topic && prefs.automatic && button(marked?"Interest recorded":"I explored this for myself: "+topic.title,()=>save(p=>voluntary(p,topic.interest),"Recorded for your garden.",()=>setMarked(true)),busy||marked)}
        {prefs.automatic && Object.entries(prefs.counts).map(([id,count])=><Text key={id} style={ink}>{names([id as Interest])} · {count}</Text>)}
        <Text style={ink}>{selected.length?"Garden spaces: "+names(selected):"Choose an interest to grow your first space."}</Text>
        {selected.length>0 && button("Explore districts on My Island",()=>router.push("/island" as never))}
        {selected.map(id=><View key={id} style={{gap:6}}>
          <Text accessibilityRole="header" style={ink}>{districts[id].name} · {stageNames[stageAt(level)-1]}</Text>
          <Text style={ink}>{districts[id].exhibits[stageAt(level)-1]}</Text>
          {districts[id].lessons.map(lesson=>button(DISCOVERIES.find(d=>d.id===lesson)!.title,()=>router.push({pathname:"/discover",params:{districtLesson:lesson}} as never)))}
          {districts[id].adventure && button("Enter "+districts[id].name+" adventure",()=>router.push({pathname:"/discover",params:{districtAdventure:districts[id].adventure}} as never))}
          {id==="music" && button(sound?"Close sound bench":"Open sound bench",()=>setSound(v=>!v))}
          {id==="music" && sound && <HarmonyPlayback notes={[0,4,7]}/>}
        </View>)}
        {selected.some(id=>["music","art","space"].includes(id)) && <SceneBoundary color={tokens.text}><Garden interests={selected} level={level}/></SceneBoundary>}
      </>}
      {button("Reset garden preferences",()=>save(fresh,"Preferences and voluntary counts cleared."),busy)}
    </>}
    {!!status && <Text accessibilityLiveRegion="polite" style={ink}>{status}</Text>}
  </ScrollView>;
}
