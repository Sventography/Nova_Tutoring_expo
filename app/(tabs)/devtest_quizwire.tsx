import React from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { logQuizResult } from "../utils/log-quiz-result";
import { useAchievements } from "../context/AchievementsContext";

export default function DevTestQuizWire(){
  const ach = (()=>{ try{ return useAchievements(); }catch{ return null; } })();
  async function addSample(){ await logQuizResult({ title:"Sample Algebra", total:10, correct:9, percent:90 }); Alert.alert("History", "Sample quiz saved"); }
  async function trigger80(){ try{ await ach?.onQuizFinished(95, "Algebra"); Alert.alert("Achievement","95% sent"); }catch(e){ Alert.alert("Error", String(e)); } }
  return (
    <View style={S.wrap}>
      <Text style={S.h1}>Quiz Wire Test</Text>
      <Pressable onPress={addSample} style={S.btn}><Text style={S.bt}>Save Sample History</Text></Pressable>
      <Pressable onPress={trigger80} style={S.btn}><Text style={S.bt}>Trigger 95% Achievement</Text></Pressable>
    </View>
  );
}
const S=StyleSheet.create({wrap:{flex:1,backgroundColor:"transparent",padding:16,gap:12},h1:{color:"#00E5FF",fontWeight:"800",fontSize:22},btn:{padding:12,borderRadius:12,borderWidth:1.5,borderColor:"#00E5FF",backgroundColor:"rgba(0,229,255,0.12)",alignItems:"center"},bt:{color:"#e6f7ff",fontWeight:"800"}});
