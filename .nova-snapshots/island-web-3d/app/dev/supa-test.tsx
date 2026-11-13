import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { supabase } from "../services/supabase";
export default function SupaTest(){
  const [ok,setOk]=useState<string>("checking…");
  useEffect(()=>{(async()=>{
    const { data, error } = await supabase.from("coins_leaderboard").select("*").limit(1);
    setOk(error ? "error: "+error.message : "ok: "+JSON.stringify(data));
  })();},[]);
  return <View style={{padding:20}}><Text style={{color:"#eaf7fb"}}>{ok}</Text></View>;
}
