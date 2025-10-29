import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getAll as getQuizHistory } from "../_lib/quizHistory";
import { getFlashSavedTotal } from "../_lib/collectionsStats";

const CYAN = "#00E5FF";
type Entry = { topicId:string; title:string; total:number; correct:number; percent:number; finishedAt:string };

export default function HistoryScreen(){
  const [items,setItems]=useState<Entry[]>([]);
  const [flashSaved,setFlashSaved]=useState(0);

  useEffect(()=>{
    let on = true;
    (async()=>{
      try{ const arr = await getQuizHistory(); if(on) setItems(arr as Entry[]);}catch{ if(on) setItems([]); }
      try{ const n = await getFlashSavedTotal(); if(on) setFlashSaved(n);}catch{}
    })();
    return ()=>{ on=false; };
  },[]);

  const quizzesCompleted = items.length;
  const avgScore = useMemo(()=>{
    if(!items.length) return 0;
    const sum = items.reduce((n,e)=> n + (Number(e.percent)||0), 0);
    return Math.round(sum / items.length);
  },[items]);

  return (
    <LinearGradient colors={["#000","#0B2239"]} style={{flex:1}}>
      <FlatList
        data={items}
        keyExtractor={(e,i)=> `${e.topicId}-${e.finishedAt}-${i}`}
        contentContainerStyle={{padding:16,paddingBottom:120}}
        ListHeaderComponent={
          <View>
            <Text style={S.h1}>Quiz History</Text>
            <View style={S.card}><Text style={S.k}>Quizzes completed</Text><Text style={S.v}>{quizzesCompleted}</Text></View>
            <View style={S.card}><Text style={S.k}>Average quiz score</Text><Text style={S.v}>{avgScore}%</Text></View>
            <View style={S.card}><Text style={S.k}>Flashcards saved</Text><Text style={S.v}>{flashSaved}</Text></View>
            <Text style={[S.h2,{marginTop:14}]}>Recent attempts</Text>
            {!items.length && (
              <View style={[S.empty]}>
                <Text style={S.emptyIcon}>⏳</Text>
                <Text style={S.emptyTxt}>No finished quizzes yet{"\n"}Finish a quiz to see it here.</Text>
              </View>
            )}
          </View>
        }
        renderItem={({item})=>(
          <View style={S.row}>
            <View style={{flex:1}}>
              <Text style={S.title}>{item.title || item.topicId}</Text>
              <Text style={S.meta}>{new Date(item.finishedAt).toLocaleString()}</Text>
            </View>
            <Text style={[S.badge, (item.percent>=80)&&S.good]}>{item.correct}/{item.total} • {item.percent}%</Text>
          </View>
        )}
        ItemSeparatorComponent={()=> <View style={{height:8}}/>}
      />
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  h1:{ color:CYAN, fontSize:22, fontWeight:"800", marginBottom:8 },
  h2:{ color:"#cfe", fontSize:16, fontWeight:"800" },
  card:{ padding:12, borderRadius:12, borderWidth:1.5, borderColor:"rgba(0,229,255,0.35)", backgroundColor:"rgba(0,0,0,0.35)", marginBottom:8 },
  k:{ color:"#9fe" }, v:{ color:"#fff", fontSize:18, fontWeight:"800" },
  empty:{ alignItems:"center", paddingVertical:28, borderRadius:12, borderWidth:1.5, borderColor:"rgba(0,229,255,0.25)", backgroundColor:"rgba(0,0,0,0.2)", marginTop:6 },
  emptyIcon:{ fontSize:28, color:"#9fe", marginBottom:6 }, emptyTxt:{ color:"#cfe", textAlign:"center" },
  row:{ padding:12, borderRadius:12, borderWidth:1.5, borderColor:"rgba(0,229,255,0.25)", backgroundColor:"rgba(0,0,0,0.35)", flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  title:{ color:"#fff", fontWeight:"800" },
  meta:{ color:"#cfe" },
  badge:{ color:"#fff", fontWeight:"800" },
  good:{ color:"#39FF14" },
});
