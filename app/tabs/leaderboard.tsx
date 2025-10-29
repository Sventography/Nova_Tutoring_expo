import React, { useEffect, useState } from "react";
import { View, Text, Image, FlatList, StyleSheet, RefreshControl } from "react-native";
import { lbTop } from "../services/leaderboard";

export default function Leaderboard() {
  const [rows, setRows] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  async function load(){ setRefreshing(true); const { data } = await lbTop(50); setRows(data||[]); setRefreshing(false); }
  useEffect(() => { load(); }, []);
  return (
    <View style={S.screen}>
      <Text style={S.title}>Top Coins</Text>
      <FlatList
        data={rows}
        keyExtractor={(x) => String(x.user_id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        renderItem={({ item, index }) => (
          <View style={S.row}>
            <Text style={S.rank}>{index+1}</Text>
            {item.avatar_url ? <Image source={{uri:item.avatar_url}} style={S.ava}/> : <View style={[S.ava,S.avaFallback]}/>}
            <View style={{flex:1}}><Text style={S.name} numberOfLines={1}>{item.display_name}</Text></View>
            <Text style={S.coins}>{Number(item.coins).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}
export const S = StyleSheet.create({
  screen:{ flex:1, backgroundColor:"#06121a", padding:16 },
  title:{ color:"#eaf7fb", fontSize:22, fontWeight:"800", marginBottom:12 },
  row:{ flexDirection:"row", alignItems:"center", paddingVertical:8, borderBottomWidth:1, borderColor:"rgba(0,229,255,0.06)" },
  rank:{ width:28, color:"#5cfcc8", fontWeight:"800", textAlign:"center" },
  ava:{ width:28, height:28, borderRadius:16, marginRight:8, borderWidth:1, borderColor:"rgba(0,229,255,0.25)" },
  avaFallback:{ backgroundColor:"#0b2030" },
  name:{ color:"#cfeaf0", fontWeight:"700" },
  coins:{ color:"#cfeaf0", fontWeight:"800" },
});
