import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useCollections } from "../context/CollectionsContext";

const CYAN = "#00E5FF";
const NEON = "#39FF14";

/** Tiny bottom toast tied to this screen only */
function useScreenToast(){
  const y = useRef(new Animated.Value(80)).current;
  const [msg, setMsg] = useState<string|null>(null);
  const show = (m:string)=>{
    setMsg(m);
    Animated.timing(y,{toValue:0,duration:240,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start(()=>{
      setTimeout(()=>{
        Animated.timing(y,{toValue:80,duration:200,easing:Easing.in(Easing.cubic),useNativeDriver:true}).start(()=>setMsg(null));
      },1200);
    });
  };
  const Toast = msg ? (
    <Animated.View style={[S.toast,{transform:[{translateY:y}]}]}>
      <Text style={S.toastTxt}>{msg}</Text>
    </Animated.View>
  ) : null;
  return { show, Toast };
}

/** Cross-fade “flip” so back always shows (web + native) */
function CardRow({ item, onRemove }: { item: {id:any; front:string; back:string}; onRemove: ()=>void }) {
  const [flipped, setFlipped] = useState(false);
  const p = useRef(new Animated.Value(0)).current;

  const frontOpacity = p.interpolate({ inputRange:[0,1], outputRange:[1,0] });
  const backOpacity  = p.interpolate({ inputRange:[0,1], outputRange:[0,1] });
  const scaleFront   = p.interpolate({ inputRange:[0,0.5,1], outputRange:[1,0.9,0.85] });
  const scaleBack    = p.interpolate({ inputRange:[0,0.5,1], outputRange:[0.85,0.9,1] });

  const flip = ()=>{
    Animated.timing(p,{ toValue: flipped?0:1, duration:300, easing:Easing.out(Easing.cubic), useNativeDriver:true }).start();
    setFlipped(v=>!v);
  };

  return (
    <Pressable onPress={flip} style={S.card} accessibilityRole="button">
      <View style={{minHeight:56}}>
        <Animated.View style={[S.layer,{opacity:frontOpacity, transform:[{scale:scaleFront}]}]}>
          <Text style={S.faceLabel}>Front</Text>
          <Text style={S.frontTxt}>{item.front}</Text>
        </Animated.View>
        <Animated.View style={[S.layer,{opacity:backOpacity,  transform:[{scale:scaleBack}]}]}>
          <Text style={S.faceLabel}>Back</Text>
          <Text style={S.backTxt}>{item.back}</Text>
        </Animated.View>
      </View>

      <View style={S.row}>
        <Pressable style={[S.small,S.outline]} onPress={flip}><Text style={S.smallTxt}>Flip</Text></Pressable>
        <Pressable style={[S.small,S.danger]} onPress={onRemove}><Text style={S.smallTxt}>Remove</Text></Pressable>
      </View>
    </Pressable>
  );
}

type Topic = { id:string; title:string; cards: {id:any;front:string;back:string}[] };

function norm(s:string){ return s.toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu,""); }
/** Simple fuzzy score: subsequence score + inclusion boost */
function fuzzyScore(source:string, query:string){
  const s = norm(source), q = norm(query);
  if(!q) return 0;
  if(s.includes(q)) return 100 + q.length; // strong boost for substring
  // subsequence scoring
  let si=0, score=0;
  for(let i=0;i<q.length;i++){
    const ch=q[i];
    const idx = s.indexOf(ch, si);
    if(idx===-1) return -1;
    score += 5 - Math.min(4, idx - si); // closer characters score higher
    si = idx+1;
  }
  return score;
}

export default function CollectionsTab(){
  const coll = useCollections();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [query, setQuery] = useState("");              // 🔎 search

  const { show, Toast } = useScreenToast();

  // ❶ Merge topics by title (case-insensitive).
  const topics: Topic[] = useMemo(()=>{
    const src: Topic[] = (coll.topics || []) as any;
    const map = new Map<string, Topic>(); // key by normalized title
    for(const t of src){
      const key = String(t?.title ?? "").trim().toLowerCase();
      const existing = map.get(key);
      if(existing){
        const seen = new Set(existing.cards.map(c=>String(c.id)));
        for(const c of (t.cards||[])){
          const cid = String(c.id);
          if(!seen.has(cid)){ existing.cards.push(c); seen.add(cid); }
        }
      }else{
        map.set(key, { id: String(t.id || key), title: String(t.title || "Untitled"), cards: [...(t.cards||[])] });
      }
    }
    return Array.from(map.values());
  }, [coll.topics]);

  const active = useMemo(()=> (activeId ? topics.find(t=>t.id===activeId) || null : topics[0] || null), [topics, activeId]);

  // 🔎 Fuzzy filter the active set's cards on front+back
  const cards = useMemo(()=>{
    const src = active?.cards ?? [];
    const q = query.trim();
    if(!q) return src;
    const scored = src.map(c=>{
      const s1 = fuzzyScore(c.front||"", q);
      const s2 = fuzzyScore(c.back||"", q);
      const s = Math.max(s1, s2);
      return { c, s };
    }).filter(x=>x.s >= 0);
    scored.sort((a,b)=> b.s - a.s);
    return scored.map(x=>x.c);
  }, [active, query]);

  const totals = useMemo(()=> ({ sets: topics.length, cards: topics.reduce((n,t)=> n+(t.cards?.length||0),0) }), [topics]);

  function addCard(){
    const f = front.trim(), b = back.trim();
    if(!f || !b) return;
    const targetId = active?.id || "user-my-flashcards";
    const targetTitle = active?.title || "My Flashcards";
    coll.addCard({ front:f, back:b } as any, targetId, targetTitle);
    setFront(""); setBack("");
    show("Saved to Collections");
  }

  // Header = title + search + chips + creator
  const Header = (
    <View>
      <Text style={S.h1}>Collections</Text>
      <Text style={S.sub}>{totals.sets} set{totals.sets===1?"":"s"} • {totals.cards} cards</Text>

      {/* 🔎 Search */}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search cards…"
        placeholderTextColor="rgba(255,255,255,0.6)"
        style={S.search}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      {/* Sets (horizontal) */}
      <FlatList
        horizontal
        data={topics}
        keyExtractor={(t,i)=> `${t?.id ?? "set"}-${i}`}
        contentContainerStyle={{paddingVertical:8}}
        showsHorizontalScrollIndicator={false}
        ListEmptyComponent={<Text style={S.note}>No sets yet — add a card below to create your first set.</Text>}
        renderItem={({item})=>(
          <Pressable style={[S.setChip, active?.id===item.id && S.setActive]} onPress={()=>setActiveId(item.id)}>
            <Text style={S.setTxt}>{item.title}</Text>
            <Text style={S.setCount}>{item.cards?.length||0}</Text>
          </Pressable>
        )}
      />

      {/* Creator */}
      <View style={S.editor}>
        <Text style={S.h2}>Create Flashcards {active ? `– ${active.title}` : ""}</Text>
        <TextInput style={S.input} value={front} onChangeText={setFront} placeholder="Front (question/prompt)" placeholderTextColor="rgba(255,255,255,0.6)" />
        <TextInput style={S.input} value={back} onChangeText={setBack} placeholder="Back (answer)" placeholderTextColor="rgba(255,255,255,0.6)" />
        <View style={S.row}>
          <Pressable style={[S.btn, (front.trim()&&back.trim())?S.ready:S.disabled]} disabled={!(front.trim()&&back.trim())} onPress={addCard}>
            <Text style={S.btnTxt}>Add Card</Text>
          </Pressable>
          <View style={{width:10}}/>
          <Pressable style={[S.btn,S.outline]} onPress={()=>{ setFront(""); setBack(""); }}>
            <Text style={S.btnTxt}>Clear</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={["#000", "#0B2239"]} style={{flex:1}}>
      <View style={S.wrap}>
        <FlatList
          data={cards}
          keyExtractor={(c,i)=> `${c?.id ?? "k"}-${i}`}
          ListHeaderComponent={Header}
          contentContainerStyle={{padding:16, paddingBottom:100}}
          ItemSeparatorComponent={()=> <View style={{height:8}}/>}
          renderItem={({item})=>(
            <CardRow
              item={item}
              onRemove={()=> active && coll.removeCard(item.id, active.id)}
            />
          )}
          ListEmptyComponent={<View />}
        />
        {Toast}
      </View>
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  wrap:{ flex:1 },
  h1:{ color:CYAN, fontSize:22, fontWeight:"800" },
  h2:{ color:"#fff", fontSize:16, fontWeight:"800", marginBottom:6, marginTop:8 },
  sub:{ color:"#cfe", marginBottom:6 },
  note:{ color:"#cfe", opacity:0.8 },

  search:{ marginTop:8, marginBottom:10, paddingHorizontal:12, paddingVertical:10, borderRadius:10,
           borderWidth:1.5, borderColor:"rgba(0,229,255,0.35)", color:"#fff", backgroundColor:"rgba(0,0,0,0.35)" },

  setChip:{ borderWidth:1, borderColor:"rgba(0,229,255,0.35)", borderRadius:999, paddingVertical:6, paddingHorizontal:12, marginRight:8, backgroundColor:"rgba(0,0,0,0.35)", flexDirection:"row", gap:8, alignItems:"center" },
  setActive:{ borderColor:NEON, backgroundColor:"rgba(57,255,20,0.15)" },
  setTxt:{ color:"#fff", fontWeight:"700" }, setCount:{ color:"#9fe", fontWeight:"700" },

  editor:{ borderWidth:1, borderColor:"rgba(0,229,255,0.35)", borderRadius:12, padding:12, marginTop:10, backgroundColor:"rgba(0,0,0,0.35)" },
  input:{ borderWidth:1.5, borderColor:"rgba(0,229,255,0.35)", borderRadius:10, paddingHorizontal:12, paddingVertical:10, color:"#fff", backgroundColor:"rgba(0,0,0,0.35)", marginBottom:8 },

  card:{ borderWidth:1, borderColor:"rgba(0,229,255,0.25)", borderRadius:12, padding:12, backgroundColor:"rgba(0,0,0,0.35)" },

  layer:{ position:"relative" },
  faceLabel:{ color:"#9fe", fontSize:12, marginBottom:6, opacity:0.9 },
  frontTxt:{ color:CYAN, fontWeight:"800", fontSize:16, paddingRight:2 },
  backTxt:{ color:"#fff", fontSize:16, paddingRight:2 },

  row:{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginTop:12 },
  btn:{ flex:1, paddingVertical:12, borderRadius:10, alignItems:"center", borderWidth:1.5 },
  btnTxt:{ color:"#fff", fontWeight:"800" },
  ready:{ borderColor:NEON, backgroundColor:"rgba(57,255,20,0.15)" },
  disabled:{ borderColor:"rgba(255,255,255,0.2)", backgroundColor:"rgba(255,255,255,0.08)" },
  outline:{ borderColor:CYAN },

  small:{ paddingVertical:6, paddingHorizontal:12, borderRadius:999, borderWidth:1 },
  danger:{ borderColor:"#ff6b6b", backgroundColor:"rgba(255,107,107,0.12)" },
  smallTxt:{ color:"#fff", fontWeight:"700" },

  toast:{ position:"absolute", left:16, right:16, bottom:16, paddingVertical:12, paddingHorizontal:16, borderRadius:12,
          backgroundColor:"rgba(0,0,0,0.8)", borderWidth:1, borderColor:"rgba(0,229,255,0.7)" },
  toastTxt:{ color:"#fff", fontWeight:"700", textAlign:"center" },
});
