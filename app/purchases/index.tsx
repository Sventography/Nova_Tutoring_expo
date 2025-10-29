import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Image, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { catalog, CATEGORY_BORDER } from "../_lib/catalog";
import { useRouter } from "expo-router";

const COINS_KEY = "@nova/coins";
const PURCHASES_KEY = "@nova/purchases";
const COIN_LOG_KEY = "@nova/coin_log";

type PurchaseMap = Record<string, true>;
type CoinEvent = { ts: number; delta: number; note: string };

export default function Purchases() {
  const router = useRouter();
  const [coins, setCoins] = useState(0);
  const [purchases, setPurchases] = useState<PurchaseMap>({});
  const [coinLog, setCoinLog] = useState<CoinEvent[]>([]);

  useEffect(() => {
    (async () => {
      const [c, p, log] = await Promise.all([
        AsyncStorage.getItem(COINS_KEY),
        AsyncStorage.getItem(PURCHASES_KEY),
        AsyncStorage.getItem(COIN_LOG_KEY),
      ]);
      setCoins(c ? parseInt(c, 10) : 0);
      setPurchases(p ? JSON.parse(p) : {});
      setCoinLog(log ? JSON.parse(log) : []);
    })();
  }, []);

  const owned = useMemo(() => catalog.filter((it) => purchases[it.id]), [purchases]);

  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <Text style={{ color:"#cfeaf0", fontSize:24, fontWeight:"800" }}>Purchases</Text>
        <Pressable
          onPress={() => router.back()}
          style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:999, borderWidth:1, borderColor:"#00e5ff" }}>
          <Text style={{ color:"#00e5ff", fontWeight:"700" }}>Back</Text>
        </Pressable>
      </View>

      <View style={{ marginBottom:18, padding:12, borderRadius:12, borderWidth:1, borderColor:"#0b2a36" }}>
        <Text style={{ color:"#9fd7e2" }}>Coins balance</Text>
        <Text style={{ color:"#eaf7fb", fontSize:20, fontWeight:"800" }}>{coins.toLocaleString()} coins</Text>
      </View>

      <Text style={{ color:"#cfeaf0", fontSize:16, fontWeight:"800", marginBottom:10 }}>Owned items</Text>
      <View style={{ flexDirection:"row", flexWrap:"wrap", justifyContent:"space-between", rowGap:12 }}>
        {owned.length === 0 ? (
          <Text style={{ color:"#9fd7e2" }}>Nothing owned yet—go treat yourself in the shop ✨</Text>
        ) : owned.map((it) => (
          <View key={it.id} style={{
            width:"48%", borderRadius:14, padding:12, borderWidth:1,
            borderColor:CATEGORY_BORDER[it.category], backgroundColor:"rgba(255,255,255,0.03)"
          }}>
            {it.image ? (
              <View style={{ width:"100%", height:110, borderRadius:10, overflow:"hidden", borderWidth:1,
                             borderColor:CATEGORY_BORDER[it.category], marginBottom:8 }}>
                <Image source={it.image} style={{ width:"100%", height:"100%" }} resizeMode="contain" />
              </View>
            ) : null}
            <Text style={{ color:"#eaf7fb", fontSize:14, fontWeight:"700" }}>{it.title}</Text>
            {it.desc ? <Text style={{ color:"#9fd7e2", marginTop:4, fontSize:12 }}>{it.desc}</Text> : null}
          </View>
        ))}
      </View>

      <View style={{ height:20 }} />
      <Text style={{ color:"#cfeaf0", fontSize:16, fontWeight:"800", marginBottom:10 }}>Coin history</Text>
      {coinLog.length === 0 ? (
        <Text style={{ color:"#9fd7e2" }}>No coin activity yet.</Text>
      ) : coinLog.slice().reverse().map((e, i) => (
        <View key={i} style={{ paddingVertical:8, borderBottomWidth:1, borderBottomColor:"#0b2a36" }}>
          <Text style={{ color:"#eaf7fb" }}>
            {e.delta>0?"+":""}{e.delta} — <Text style={{ color:"#9fd7e2" }}>{e.note}</Text>
          </Text>
          <Text style={{ color:"#6aa6b4", fontSize:12 }}>{new Date(e.ts).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
