import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

type Props = { state:any; descriptors:any; navigation:any };

const ALLOWED = new Set([
  "ask",
  "flashcards",
  "quiz",
  "brainteasers",
  "shop",
  "achievements",
  "history",
  "relax",
  "account",
  "certificates",
  "collections",
  "purchases"
]);

export default function ScrollableTabBar({ state, descriptors, navigation }:Props){
  const items = state.routes.filter(
    (r:any) => ALLOWED.has(r.name) && descriptors[r.key]?.options?.href !== null
  );

  return (
    <View style={S.wrap}>
      <ScrollView horizontal bounces showsHorizontalScrollIndicator={false} contentContainerStyle={S.row}>
        {items.map((route:any, idx:number)=>{
          const isFocused = state.index === state.routes.indexOf(route);
          const { options } = descriptors[route.key] || {};
          const raw = options?.tabBarLabel ?? options?.title ?? route.name ?? "";
          const label = typeof raw === "string" ? raw.toUpperCase() : String(raw);
          const onPress = async ()=>{
            const ev = navigation.emit({ type:"tabPress", target:route.key, canPreventDefault:true });
            if(!isFocused && !ev.defaultPrevented){
              try{ await Haptics.selectionAsync(); }catch{}
              navigation.navigate(route.name);
            }
          };
          const icon = typeof options?.tabBarIcon === "function"
            ? options.tabBarIcon({ focused:isFocused, color: isFocused ? "#00e5ff" : "rgba(0,229,255,0.7)", size:22 })
            : null;

          return (
            <Pressable key={route.key} onPress={onPress} style={[S.item, isFocused && S.itemActive]} hitSlop={10}>
              <View style={S.iconBox}>{icon}</View>
              <Text style={[S.label,{color:isFocused?"#00e5ff":"rgba(0,229,255,0.7)"}]} numberOfLines={1}>{label}</Text>
              {isFocused && <View style={S.underline} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const S = StyleSheet.create({
  wrap:{ backgroundColor:"#000", paddingVertical:6 },
  row:{ paddingHorizontal:8, alignItems:"center" },
  item:{ minWidth:84, alignItems:"center", justifyContent:"center", paddingHorizontal:10, paddingVertical:6, marginHorizontal:2, borderRadius:10 },
  itemActive:{ shadowColor:"#00e5ff", shadowOpacity:0.45, shadowRadius:10, shadowOffset:{width:0,height:6}, borderWidth:1, borderColor:"rgba(0,229,255,0.5)" },
  iconBox:{ height:24, justifyContent:"center" },
  label:{ fontSize:11, fontWeight:"700", marginTop:4, letterSpacing:0.5 },
  underline:{ marginTop:6, height:2, width:36, borderRadius:2, backgroundColor:"#00e5ff" },
});
