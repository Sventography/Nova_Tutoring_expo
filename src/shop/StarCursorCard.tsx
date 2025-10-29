import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
const PRICE = 250;
export default function StarCursorCard(){
  const [loading,setLoading]=useState(false); const [owned,setOwned]=useState(false); const [error,setError]=useState<string|null>(null);
  const onBuy=async()=>{ setLoading(true); setTimeout(()=>{ setOwned(true); setLoading(false); },400); };
  const onEquip=()=>{};
  return (
    <View style={s.card}>
      <Text style={s.title}>Cyan Star Cursor</Text>
      <Text style={s.sub}>Glowing cyan star that matches any theme.</Text>
      <Pressable onPress={onBuy} disabled={loading} style={s.buyBtn}>
        {loading ? <ActivityIndicator/> : <Text style={s.buyTxt}>Unlock — {PRICE} coins</Text>}
      </Pressable>
      {owned ? <Pressable onPress={onEquip} style={s.equipBtn}><Text style={s.equipTxt}>Equip</Text></Pressable> : null}
      {error ? <Text style={s.err}>Error: {error}</Text> : null}
    </View>
  );
}
const s=StyleSheet.create({
  card:{padding:16,borderRadius:16,backgroundColor:"#00000080",borderWidth:1,borderColor:"#22d3ee66"},
  title:{color:"#a5f3fc",fontSize:18,fontWeight:"700"},
  sub:{color:"#cffafe",opacity:0.8,marginTop:4},
  buyBtn:{marginTop:12,paddingHorizontal:16,paddingVertical:10,borderRadius:16,backgroundColor:"#06b6d4"},
  buyTxt:{color:"#001318",fontWeight:"700"},
  equipBtn:{marginTop:12,paddingHorizontal:16,paddingVertical:10,borderRadius:16,backgroundColor:"#67e8f9"},
  equipTxt:{color:"#001318",fontWeight:"700"},
  err:{color:"#f87171",marginTop:8}
});
