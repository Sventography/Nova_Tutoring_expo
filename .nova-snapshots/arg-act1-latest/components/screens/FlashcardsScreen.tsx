import React, { useMemo, useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, SectionList, StyleSheet } from "react-native";
import RAW_INDEX from "../../app/_data/flashcard_index.json";
import RAW_BY_ID from "../../app/_data/flashcards_data_by_id.json";

function unwrap<T>(m:any):T { return (m && (m as any).default) ? (m as any).default as T : (m as T); }
type Topic = { id:string; title:string; group:string; count:number };
type AnyCard = any;

const INDEX: Topic[] = unwrap<Topic[]>(RAW_INDEX) ?? [];
const BY_ID: Record<string, AnyCard[]> = unwrap<Record<string, AnyCard[]>>(RAW_BY_ID) ?? {};

const GROUP_COLORS: Record<string,string> = {
  AP:"#00e5ff", Math:"#8ef", Science:"#7dffb0", "Social Studies":"#ffd27d",
  English:"#f7a6ff", CS:"#b4fffb", Languages:"#ffe18e", Other:"#cfeff6"
};

const norm = (c:any)=>{
  if (!c) return null;
  if (Array.isArray(c)) {
    if (c.length>=2) return {front:String(c[0]??""), back:String(c[1]??"")};
    if (c.length===1) return {front:String(c[0]??""), back:""};
    return null;
  }
  const front = c.front ?? c.q ?? c.term ?? c.question ?? c.word ?? c.text ?? "";
  const back  = c.back  ?? c.a ?? c.answer ?? c.definition ?? c.explanation ?? "";
  const f = String(front??"").trim(); const b = String(back??"").trim();
  if (!f && !b) return null;
  return { front:f, back:b };
};

function smartMatch(title:string, q:string){
  if (!q) return true;
  const t = title.toLowerCase();
  const qq = q.toLowerCase().trim();
  if (t.includes(qq)) return true;
  const toks = qq.split(/\s+/).filter(Boolean);
  if (!toks.length) return true;
  if (toks.every(k=>t.includes(k))) return true;
  const ac = title.split(/\s+/).map(w=>w[0]||"").join("").toLowerCase();
  const qqac = toks.map(w=>w[0]).join("");
  return ac.startsWith(qqac);
}

export default function FlashcardsScreen(){
  const [query, setQuery] = useState("");
  const [topicId, setTopicId] = useState<string | null>(null);

  const sections = useMemo(()=>{
    const filtered = INDEX.filter(t=>smartMatch(t.title, query));
    const byGroup: Record<string, Topic[]> = {};
    for (const t of filtered) {
      byGroup[t.group] ||= [];
      byGroup[t.group].push(t);
    }
    return Object.keys(byGroup).sort().map(g=>({
      title:g,
      data: byGroup[g].sort((a,b)=>a.title.localeCompare(b.title))
    }));
  },[query]);

  useEffect(()=>{ if (!topicId && INDEX.length) setTopicId(INDEX[0].id); },[]);
  useEffect(()=>{
    if (sections.length && !sections.some(s=>s.data.find(t=>t.id===topicId))){
      const first = sections[0]?.data[0];
      if (first) setTopicId(first.id);
    }
  },[sections, topicId]);

  const cards = useMemo(()=>{
    const raw = Array.isArray(topicId ? BY_ID[topicId] : null) ? BY_ID[topicId!] : [];
    return (raw || []).map(norm).filter(Boolean) as {front:string;back:string}[];
  },[topicId]);

  const [i,setI] = useState(0);
  const [show,setShow] = useState(false);
  useEffect(()=>{ setI(0); setShow(false); },[topicId]);

  const total = cards.length;
  const card = total ? cards[i] : null;

  return (
    <View style={S.container}>
      {/* Page title below the top bar */}
      <Text style={S.pageTitle}>Flashcards</Text>

      {/* search */}
      <TextInput
        placeholder="Search topics (e.g., ap env, algorithms)…"
        placeholderTextColor="#6aaaba"
        value={query}
        onChangeText={setQuery}
        style={S.search}
      />

      {/* sectioned topics list */}
      <SectionList
        sections={sections}
        keyExtractor={(item)=>item.id}
        style={{ maxHeight: 180, marginBottom: 10 }}
        renderSectionHeader={({section})=>(
          <Text style={S.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({item})=>(
          <Pressable
            onPress={()=>setTopicId(item.id)}
            style={[
              S.chip,
              { borderColor: topicId===item.id ? "rgba(0,229,255,0.7)" : "transparent",
                backgroundColor:"#0b2030" }
            ]}
          >
            <Text style={[S.chipTxt,{ color: GROUP_COLORS[item.group] || "#cfeff6"}]}>
              {item.title}
            </Text>
            <Text style={S.countDot}>{item.count}</Text>
          </Pressable>
        )}
      />

      {total===0 && (
        <View style={S.empty}>
          <Text style={S.emptyTxt}>No cards in this topic.</Text>
        </View>
      )}

      {card && (
        <View style={S.cardWrap}>
          <Pressable style={S.plusBtn} onPress={()=>{ /* add card */ }}>
            <Text style={S.plusTxt}>+</Text>
          </Pressable>

          <View style={S.cardBox}>
            <Text style={S.cardLabel}>{show ? "Answer" : "Question"}</Text>
            <Text style={S.cardText}>{show ? card.back : card.front}</Text>

            <View style={S.row}>
              <Pressable style={[S.btn,S.btnGhost]} onPress={()=>setShow(s=>!s)}>
                <Text style={S.btnGhostTxt}>{show?"Hide":"Reveal"}</Text>
              </Pressable>
              <Pressable
                style={S.btn}
                onPress={()=>{
                  const next = i+1; setI(next<total?next:0); setShow(false);
                }}
              >
                <Text style={S.btnTxt}>Next</Text>
              </Pressable>
            </View>

            <Text style={S.meta}>{i+1}/{total}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container:{ flex:1, padding:16, backgroundColor:"#06121a" },
  pageTitle:{ color:"#cfeff6", fontSize:22, fontWeight:"800", marginBottom:8 },

  search:{ backgroundColor:"#0b2030", borderWidth:1, borderColor:"rgba(0,229,255,0.25)",
           borderRadius:10, color:"#e8fbff", paddingVertical:10, paddingHorizontal:12, marginBottom:8 },

  sectionTitle:{ color:"#6aaaba", fontWeight:"800", marginTop:6, marginBottom:4 },
  chip:{ flexDirection:"row", alignItems:"center", gap:8, alignSelf:"flex-start",
         paddingVertical:6, paddingHorizontal:10, borderRadius:999, borderWidth:1, marginRight:8, marginBottom:8 },
  chipTxt:{ fontWeight:"800" },
  countDot:{ color:"#98c7d1", fontWeight:"800" },

  empty:{ padding:16, borderRadius:10, backgroundColor:"#09202d", borderWidth:1, borderColor:"rgba(0,229,255,0.2)" },
  emptyTxt:{ color:"#98c7d1" },

  cardWrap:{ marginTop:4, borderRadius:16, padding:2, shadowColor:"#00e5ff",
             shadowOpacity:0.5, shadowRadius:14, shadowOffset:{width:0,height:0}, elevation:6,
             backgroundColor:"rgba(0,229,255,0.12)" },

  cardBox:{ borderRadius:14, backgroundColor:"#0b2030", padding:16, borderWidth:1, borderColor:"rgba(0,229,255,0.35)" },
  plusBtn:{ position:"absolute", right:10, top:10, zIndex:5, backgroundColor:"rgba(0,229,255,0.15)",
            borderWidth:1, borderColor:"rgba(0,229,255,0.4)", borderRadius:999, width:28, height:28,
            alignItems:"center", justifyContent:"center" },
  plusTxt:{ color:"#00e5ff", fontWeight:"900" },

  cardLabel:{ color:"#98c7d1", fontSize:12, marginBottom:6 },
  cardText:{ color:"#e8fbff", fontSize:16, lineHeight:22 },

  row:{ flexDirection:"row", gap:8, marginTop:12 },
  btn:{ backgroundColor:"#073042", paddingVertical:10, paddingHorizontal:14, borderRadius:10 },
  btnTxt:{ color:"#00e5ff", fontWeight:"800" },
  btnGhost:{ backgroundColor:"transparent", borderColor:"rgba(0,229,255,0.4)", borderWidth:1 },
  btnGhostTxt:{ color:"#00e5ff", fontWeight:"800" },

  meta:{ color:"#6aaaba", marginTop:12, textAlign:"center", fontWeight:"700" },
});
