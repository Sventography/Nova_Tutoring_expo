import React, { useState } from "react";
import { View, TextInput } from "react-native";
import { NeonButton, NeonSub, NeonText } from "@/components/ui";
type Props={ defaultTopic?:string };
export default function CustomCardBuilder({ defaultTopic="My Cards" }:Props){
  const [q,setQ]=useState(""); const [a,setA]=useState("");
  return(<View style={{ gap:10 }}>
    <NeonText>{defaultTopic}</NeonText>
    <TextInput placeholder="Front" placeholderTextColor="#557" value={q} onChangeText={setQ} style={{ color:"#e6faff", borderColor:"#22d3ee66", borderWidth:1, borderRadius:12, padding:10 }} />
    <TextInput placeholder="Back" placeholderTextColor="#557" value={a} onChangeText={setA} style={{ color:"#e6faff", borderColor:"#22d3ee66", borderWidth:1, borderRadius:12, padding:10 }} />
    <NeonButton onPress={()=>{}} disabled={!q||!a}><NeonSub style={{ color:"#001318", fontWeight:"900" }}>Save</NeonSub></NeonButton>
  </View>);
}
