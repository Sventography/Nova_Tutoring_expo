import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
export default function NewCustomCard(){
  const [q,setQ]=useState(""); const [a,setA]=useState("");
  const onSave=async()=>{};
  const canSave = q.trim().length>0 && a.trim().length>0;
  return (
    <View style={s.screen}>
      <Text style={s.title}>New Custom Card</Text>
      <Text style={s.sub}>Create your own flashcard</Text>
      <TextInput value={q} onChangeText={setQ} placeholder="Question" placeholderTextColor="#6b7280" style={s.input}/>
      <TextInput value={a} onChangeText={setA} placeholder="Answer" placeholderTextColor="#6b7280" style={[s.input,{height:100,textAlignVertical:"top"}]} multiline/>
      <Pressable onPress={onSave} disabled={!canSave} style={[s.btn,{opacity:canSave?1:0.6}]}><Text style={s.btnTxt}>Save</Text></Pressable>
    </View>
  );
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:"#071422",padding:16,paddingTop:24},title:{color:"#e6f0ff",fontSize:20,fontWeight:"900"},sub:{color:"#9bb7e0",marginTop:6,marginBottom:12},input:{borderColor:"#1f2937",borderWidth:1,borderRadius:10,paddingHorizontal:12,paddingVertical:10,color:"#e5e7eb",backgroundColor:"#0a1220",marginBottom:10},btn:{alignSelf:"flex-start",backgroundColor:"#0ea5e9",borderColor:"#38bdf8",borderWidth:1,paddingHorizontal:16,paddingVertical:10,borderRadius:12},btnTxt:{color:"#001318",fontWeight:"900"}});
