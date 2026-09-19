// app/components/DailyWelcomeModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useDailyDeal } from "../context/DailyDealContext";
import { useUser } from "../context/UserContext";

const PREFIX = "@nova/dailyGreeting.v1:";

function dateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function hello() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DailyWelcomeModal() {
  const router = useRouter();
  const { supabaseUserId, username, user } = useUser();
  const { ready, deal } = useDailyDeal();
  const [visible, setVisible] = useState(false);
  const owner = supabaseUserId || "guest";
  const name = useMemo(
    () => String(username || user?.displayName || user?.name || "Student").trim() || "Student",
    [username, user?.displayName, user?.name]
  );

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        try {
          const day = dateKey();
          const key = `${PREFIX}${owner}`;
          if (await AsyncStorage.getItem(key) === day || cancelled) return;
          await AsyncStorage.setItem(key, day);
          if (!cancelled) setVisible(true);
        } catch (e) {
          console.warn("[DailyWelcome] state failed", e);
        }
      })();
    }, 700);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [ready, owner]);

  const openDeal = () => {
    setVisible(false);
    setTimeout(() => router.push("/shop" as any), 120);
  };

  const openQuests = () => {
    setVisible(false);
    setTimeout(() => router.push("/daily-quests" as any), 120);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={s.backdrop}>
        <LinearGradient colors={["#06121A","#0D2230","#181237"]} style={s.card}>
          <Text style={s.kicker}>NOVA DAILY</Text>
          <Text style={s.title}>{hello()}, {name}</Text>
          <Text style={s.body}>Ready for another day of learning?</Text>

          {deal ? (
            <View style={s.deal}>
              <Text style={s.dealKicker}>TODAY'S NOVA DEAL</Text>
              <Text style={s.dealTitle}>{deal.title}</Text>
              <View style={s.row}>
                <Text style={s.old}>{deal.originalCoinPrice.toLocaleString()} coins</Text>
                <Text style={s.newPrice}>{deal.discountedCoinPrice.toLocaleString()} coins</Text>
              </View>
              <Text style={s.discount}>{deal.discountPercent}% OFF WITH NOVA COINS · TODAY ONLY</Text>
              <Pressable onPress={openDeal} style={({pressed}) => [s.primary, pressed && s.pressed]}>
                <Text style={s.primaryText}>View Today's Deal</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.deal}>
              <Text style={s.dealKicker}>YOU'RE CAUGHT UP</Text>
              <Text style={s.body}>You already own every item in today's deal pool.</Text>
            </View>
          )}

          <Pressable
            onPress={openQuests}
            style={({pressed}) => [s.questButton, pressed && s.pressed]}
          >
            <Text style={s.questButtonText}>View Daily Quests</Text>
          </Pressable>

          <Pressable onPress={() => setVisible(false)} style={({pressed}) => [s.secondary, pressed && s.pressed]}>
            <Text style={s.secondaryText}>Maybe Later</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:{flex:1,alignItems:"center",justifyContent:"center",padding:22,backgroundColor:"rgba(0,0,0,0.72)"},
  card:{width:"100%",maxWidth:430,borderRadius:24,borderWidth:1,borderColor:"#22D3EE",padding:22},
  kicker:{color:"#67E8F9",fontSize:11,fontWeight:"900",letterSpacing:2,textAlign:"center"},
  title:{color:"#FFF",fontSize:25,fontWeight:"900",textAlign:"center",marginTop:8},
  body:{color:"#CBD5E1",fontSize:14,lineHeight:20,textAlign:"center",marginTop:8},
  deal:{marginTop:20,borderRadius:18,borderWidth:1,borderColor:"rgba(250,204,21,0.65)",backgroundColor:"rgba(250,204,21,0.08)",padding:16},
  dealKicker:{color:"#FDE047",fontSize:10,fontWeight:"900",letterSpacing:1.2,textAlign:"center"},
  dealTitle:{color:"#FFF",fontSize:18,fontWeight:"900",textAlign:"center",marginTop:7},
  row:{marginTop:10,flexDirection:"row",justifyContent:"center",alignItems:"baseline",columnGap:10,flexWrap:"wrap"},
  old:{color:"#94A3B8",fontSize:13,fontWeight:"700",textDecorationLine:"line-through"},
  newPrice:{color:"#FDE047",fontSize:18,fontWeight:"900"},
  discount:{color:"#FACC15",fontSize:10,fontWeight:"900",textAlign:"center",marginTop:7},
  primary:{marginTop:14,borderRadius:14,paddingVertical:12,alignItems:"center",backgroundColor:"#0891B2"},
  primaryText:{color:"#FFF",fontSize:14,fontWeight:"900"},
  questButton:{marginTop:12,borderRadius:14,paddingVertical:11,alignItems:"center",borderWidth:1,borderColor:"rgba(103,232,249,0.55)",backgroundColor:"rgba(8,145,178,0.12)"},
  questButtonText:{color:"#CFFAFE",fontSize:13,fontWeight:"900"},
  secondary:{marginTop:12,borderRadius:14,paddingVertical:11,alignItems:"center",borderWidth:1,borderColor:"rgba(148,163,184,0.45)"},
  secondaryText:{color:"#CBD5E1",fontSize:13,fontWeight:"800"},
  pressed:{opacity:0.78},
});
