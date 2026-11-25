import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Image, FlatList, StyleSheet, RefreshControl } from "react-native";
import { lbTop } from "../services/leaderboard";
import { useUser } from "../context/UserContext";

export default function Leaderboard() {
  const { ready, session } = useUser();
  const ownerId = session?.user?.id ?? null;
  const [result, setResult] = useState<{ ownerId: string; rows: any[] } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failedOwner, setFailedOwner] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    if (!ready || !ownerId) return;
    const version = ++requestVersion.current;
    setRefreshing(true);
    setFailedOwner(null);
    try {
      const { data, error } = await lbTop(50);
      if (error) throw error;
      if (version === requestVersion.current) {
        setResult({ ownerId, rows: data ?? [] });
      }
    } catch {
      if (version === requestVersion.current) setFailedOwner(ownerId);
    } finally {
      if (version === requestVersion.current) setRefreshing(false);
    }
  }, [ready, ownerId]);

  useEffect(() => {
    setResult(null);
    setRefreshing(false);
    setFailedOwner(null);
    void load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  if (!ready || !ownerId) {
    return (
      <View style={S.screen}>
        <Text style={S.title}>Top Coins</Text>
        <Text style={S.name}>{ready ? "Sign in to view the leaderboard." : "Loading your account…"}</Text>
      </View>
    );
  }
  const rows = result?.ownerId === ownerId ? result.rows : [];
  return (
    <View style={S.screen}>
      <Text style={S.title}>Top Coins</Text>
      <FlatList
        data={rows}
        keyExtractor={(x) => String(x.user_id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListHeaderComponent={failedOwner === ownerId ? <Text accessibilityRole="alert" style={S.name}>Could not load rankings. Pull down to retry.</Text> : null}
        ListEmptyComponent={!refreshing && failedOwner !== ownerId && result?.ownerId === ownerId ? <Text style={S.name}>No rankings yet.</Text> : null}
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
