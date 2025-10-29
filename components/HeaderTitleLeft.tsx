import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

function useUserSafe(){ try{ return require("../app/context/UserContext").useUser?.(); }catch{ return null; } }
function useCoinsSafe(){ try{ return require("../app/context/CoinsContext").useCoins?.(); }catch{ return null; } }

export default function HeaderTitleLeft(){
  const u = useUserSafe();
  const k = useCoinsSafe();
  const name = u?.user?.name ?? "Nova Student";
  const avatar = u?.user?.avatar;
  const coins = (k?.coins ?? k?.balance ?? k?.amount ?? 6000) as number;

  return (
    <View style={S.row}>
      <View style={S.avatarWrap}>
        {avatar
          ? <Image source={{ uri: avatar }} style={S.avatar} />
          : <View style={[S.avatar, S.fallback]}><Text style={S.initial}>{name.slice(0,1)}</Text></View>}
      </View>
      <Text style={S.name} numberOfLines={1}>{name}</Text>
      <View style={S.coinPill}><Text style={S.coinTxt}>⦿ {coins.toLocaleString()}</Text></View>
    </View>
  );
}

const S = StyleSheet.create({
  row:{ flexDirection:"row", alignItems:"center" },
  avatarWrap:{ marginRight:8 },
  avatar:{ width:28, height:28, borderRadius:20 },
  fallback:{ backgroundColor:"#0b2030", alignItems:"center", justifyContent:"center" },
  initial:{ color:"#e8fbff", fontWeight:"800" },
  name:{ color:"#e8fbff", fontWeight:"800", marginRight:8, maxWidth:160 },
  coinPill:{ paddingVertical:6, paddingHorizontal:10, borderRadius:999, backgroundColor:"#0b2030",
             borderWidth:1, borderColor:"rgba(0,229,255,0.3)" },
  coinTxt:{ color:"#cfeff6", fontWeight:"800" },
});
