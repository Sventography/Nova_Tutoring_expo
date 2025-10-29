import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Card } from "../_lib/flashcards";
import { getTwentyCardsById, searchTopics, getTopics } from "../_lib/cards20";
import { useCollections } from "../context/CollectionsContext";
import { AchieveEmitter } from "../context/AchievementsContext";

type Topic = { id:string; title:string; count?:number };

function TopicChip({t,onPress}:{t:Topic;onPress:()=>void}){ return(
  <Pressable onPress={onPress} style={S.topic}>
    <Text style={S.topicTitle}>{t.title}</Text>
    <Text style={S.topicCount}>{t.count ?? 0} cards</Text>
  </Pressable> );}

function CardRow({ c, onSave }:{c:Card; onSave:()=>void}){
  const [flip,setFlip]=useState(false);
  return(
    <Pressable onPress={()=>setFlip(v=>!v)} style={S.cardRow}>
      <View style={[S.cardFace, !flip && S.cardFaceActive]}><Text style={S.cardText}>{(c as any).front}</Text></View>
      <View style={[S.cardFace,  flip && S.cardFaceActive]}><Text style={S.cardText}>{(c as any).back}</Text></View>
      <Pressable onPress={onSave} style={S.saveBtn}>
        <Ionicons name="bookmark-outline" size={18} color="#00e5ff"/>
        <Text style={S.saveTxt}>Save</Text>
      </Pressable>
    </Pressable>
  );
}

export default function FlashcardsTab(){
  const collections = useCollections(); // ✅ real hook from provider
  const [q, setQ] = useState("");
  const topicsRaw:Topic[] = useMemo(()=> (getTopics()||[]).map((t:any)=>({ ...t })),[]);
  const topics:Topic[] = useMemo(()=> {
    const list = q ? searchTopics(q) : topicsRaw;
    return (list||[]).map((t:any)=>({ ...t, count: getTwentyCardsById(t.id).length }));
  }, [q, topicsRaw]);

  const [active,setActive]=useState<Topic|null>(null);
  const cards = useMemo<Card[]>(()=> active ? getTwentyCardsById(active.id) : [],[active]);

  // ✅ Save only front/back; let provider mint a fresh id and attach to the active set
  const save = useCallback((c:Card)=>{
    try{
      const front = String((c as any).front||"").trim();
      const back  = String((c as any).back||"").trim();
      if(!front || !back) return;
      collections.addCard({ front, back } as any, active?.id, active?.title);
      try { AchieveEmitter?.emit?.("celebrate","Saved to Collections"); } catch {}
    }catch(e){}
  },[collections,active]);

  if(!active) return(
    <View style={S.wrap}>
      <Text style={S.h1}>Flashcards</Text>
      <TextInput placeholder="Search topics…" placeholderTextColor="rgba(255,255,255,0.5)" value={q} onChangeText={setQ}
        style={S.search} autoCorrect={false} autoCapitalize="none" />
      <FlatList
        data={topics}
        keyExtractor={(t,i)=> `${t.id}-${i}`}
        renderItem={({item})=> <TopicChip t={item} onPress={()=>setActive(item)} />}
        ItemSeparatorComponent={()=> <View style={{height:8}}/> }
        contentContainerStyle={{padding:12}}
      />
    </View>
  );

  return(
    <View style={S.wrap}>
      <View style={S.row}>
        <Pressable onPress={()=>setActive(null)} style={S.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#00e5ff"/>
          <Text style={S.backTxt}>Topics</Text>
        </Pressable>
        <Text style={S.h1}>{active.title}</Text>
        <View style={{width:48}} />{/* spacer */}
      </View>
      <FlatList
        data={cards}
        keyExtractor={(c,i)=> String((c as any).id ?? (c as any).front ?? "k") + "-" + i}
        renderItem={({item})=>(
          <CardRow
            c={item}
            onSave={()=>save({ front:(item as any).front, back:(item as any).back } as any)}
          />
        )}
        ItemSeparatorComponent={()=> <View style={{height:10}}/> }
        contentContainerStyle={{padding:12,paddingBottom:90}}
      />
    </View>
  );
}

export const S = StyleSheet.create({
  wrap:{ flex:1, backgroundColor:"#02060a" },
  h1:{ color:"#fff", fontSize:20, fontWeight:"800", padding:12 },
  search:{ marginHorizontal:12, marginBottom:8, paddingHorizontal:12, paddingVertical:10, borderRadius:12,
           borderWidth:1, borderColor:"rgba(0,229,255,0.25)", color:"#fff", backgroundColor:"rgba(0,0,0,0.35)" },
  row:{ flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  backBtn:{ flexDirection:"row", alignItems:"center", padding:12 },
  backTxt:{ color:"#00e5ff", marginLeft:4, fontWeight:"700" },
  topic:{ padding:14, borderRadius:12, borderWidth:1, borderColor:"rgba(0,229,255,0.25)", backgroundColor:"rgba(0,0,0,0.35)" },
  topicTitle:{ color:"#fff", fontWeight:"800", fontSize:16 }, topicCount:{ color:"rgba(255,255,255,0.7)", marginTop:4 },
  cardRow:{ padding:14, borderRadius:12, borderWidth:1, borderColor:"rgba(0,229,255,0.25)", backgroundColor:"rgba(0,0,0,0.35)" },
  cardFace:{ display:"none" }, cardFaceActive:{ display:"flex" }, cardText:{ color:"#fff", fontSize:16, fontWeight:"700" },
  saveBtn:{ marginTop:10, alignSelf:"flex-end", flexDirection:"row", alignItems:"center", gap:6, paddingVertical:6, paddingHorizontal:10, borderRadius:999, borderWidth:1, borderColor:"rgba(0,229,255,0.5)" },
  saveTxt:{ color:"#00e5ff", fontWeight:"700" },
});
