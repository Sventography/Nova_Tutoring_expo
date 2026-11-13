import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAchievementsEngine } from "../context/AchievementEngineContext";
import { Ionicons } from "@expo/vector-icons";

export default function AchievementToasts(){
  const { catalog, announce, popAnnounce } = useAchievementsEngine();
  const [visible, setVisible] = useState<{ id: string; name: string; points: number } | null>(null);

  const lookup = useMemo(() => {
    const map: Record<string, any> = {};
    if (catalog) for (const a of catalog.achievements) map[a.id] = a;
    return map;
  }, [catalog]);

  useEffect(() => {
    if (visible || announce.length === 0) return;
    const { id } = announce[0];
    const a = lookup[id];
    if (!a) { popAnnounce(); return; }
    setVisible({ id, name: a.name, points: a.points || 0 });

    const t = setTimeout(() => {
      setVisible(null);
      popAnnounce();
    }, 1400);
    return () => clearTimeout(t);
  }, [announce, popAnnounce, visible, lookup]);

  if (!visible) return null;

  return (
    <View style={S.wrap}>
      <View style={S.toast}>
        <Ionicons name="sparkles-outline" size={16} color="#00e5ff" style={{ marginRight: 6 }} />
        <Text style={S.txt}>Achievement Unlocked: <Text style={S.name}>{visible.name}</Text> (+{visible.points})</Text>
      </View>
    </View>
  );
}

export const S = StyleSheet.create({
  wrap:{ position:"absolute", bottom:22, alignSelf:"center", zIndex: 9999 },
  toast:{
    flexDirection:"row", alignItems:"center",
    backgroundColor:"#0b2030", borderWidth:1, borderColor:"rgba(0,229,255,0.45)",
    paddingHorizontal:14, paddingVertical:10, borderRadius:999, shadowColor:"#00e5ff",
    shadowOffset:{width:0,height:0}, shadowOpacity:0.6, shadowRadius:10
  },
  txt:{ color:"#cfeff6", fontWeight:"900" },
  name:{ color:"#00e5ff" }
});
