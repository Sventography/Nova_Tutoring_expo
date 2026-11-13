import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function forceTheme(id: string) {
  try {
    await AsyncStorage.setItem("@nova/themeId", id);
    console.log("[ThemeProbe] wrote", id);
  } catch (e) { console.log("write err", e); }
}

export default function ThemeProbe() {
  const [storeId, setStoreId] = useState<string>("(loading)");
  useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        const v = (await AsyncStorage.getItem("@nova/themeId")) || "(null)";
        if (live) setStoreId(v);
      } catch {}
    };
    poll();
    const t = setInterval(poll, 800);
    return () => { live = false; clearInterval(t); };
  }, []);
  const Btn = ({id,label}:{id:string;label:string}) => (
    <Pressable onPress={() => forceTheme(id)} style={{ paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: "#0ef", borderRadius: 8, marginRight: 8 }}>
      <Text style={{ color: "#0ef", fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ position:"absolute", zIndex:9999, bottom:12, right:12, backgroundColor:"rgba(0,0,0,0.55)", borderRadius:10, padding:10, borderWidth:1, borderColor:"rgba(255,255,255,0.2)" }}>
      <Text style={{ color:"#fff", fontWeight:"800", marginBottom:6 }}>ThemeProbe</Text>
      <Text style={{ color:"#fff", marginBottom:8 }}>store: {String(storeId)}</Text>
      <View style={{ flexDirection:"row" }}>
        <Btn id="theme:neon" label="Neon" />
        <Btn id="theme:starry" label="Starry" />
        <Btn id="theme:pink" label="Pink" />
      </View>
    </View>
  );
}
