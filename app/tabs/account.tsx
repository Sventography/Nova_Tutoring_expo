import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Image, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "../context/UserContext";
import { showToast } from "../utils/toast";

const CYAN = "#00E5FF";

export default function AccountScreen(){
  const { user, ready, setUsername, setAvatar, updateProfile, signIn, signOut } = useUser();
  const [name, setName] = useState("");
  const [avatar, setAvatarLocal] = useState<string | null>(null);
  useEffect(()=>{ if(ready){ setName(user?.username || ""); setAvatarLocal(user?.avatarUri ?? null); } },[ready, user?.username, user?.avatarUri]);

  async function onPickAvatar(){
    try{
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") { Alert.alert("Permission required","Media access needed"); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.Images, allowsEditing: true, quality: 0.9 });
      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri || null;
      if (uri){ setAvatarLocal(uri); await setAvatar(uri); showToast("Avatar updated"); }
    }catch(e){ Alert.alert("Error", String(e)); }
  }
  async function onSave(){
    const newName = name.trim() || "Student";
    await updateProfile({ username: newName, avatarUri: avatar });
    showToast("Profile saved");
  }
  async function onQuickLogin(){
    const newName = name.trim() || "Student";
    await signIn({ id: "local", username: newName, avatarUri: avatar });
    showToast("Signed in");
  }
  async function onSignOut(){ await signOut(); setName(""); setAvatarLocal(null); showToast("Signed out"); }

  return (
    <LinearGradient colors={["#000","#0B2239"]} style={{flex:1}}>
      <View style={S.wrap}>
        <Text style={S.h1}>Account</Text>
        <View style={S.row}>
          <Pressable onPress={onPickAvatar} style={S.avatarWrap}>
            {avatar ? <Image source={{uri:avatar}} style={S.avatar}/> : <View style={[S.avatar, S.avatarPlaceholder]}><Text style={S.avatarInitial}>{(name||"S").slice(0,1).toUpperCase()}</Text></View>}
          </Pressable>
          <View style={{flex:1}}>
            <Text style={S.label}>Username</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="rgba(255,255,255,0.5)" style={S.input}/>
          </View>
        </View>
        <View style={S.rowBtns}>
          <Pressable style={[S.btn, S.primary]} onPress={onSave}><Text style={S.btnt}>Save</Text></Pressable>
          <Pressable style={[S.btn, S.secondary]} onPress={onQuickLogin}><Text style={S.btnt}>Sign In</Text></Pressable>
          <Pressable style={[S.btn, S.danger]} onPress={onSignOut}><Text style={S.btnt}>Sign Out</Text></Pressable>
        </View>
        <View style={S.card}>
          <Text style={S.k}>Current</Text>
          <Text style={S.v}>Name: {user?.username || "—"}</Text>
          <Text style={S.v}>Email: {user?.email || "—"}</Text>
          <Text style={S.v}>Avatar: {user?.avatarUri ? "Set" : "None"}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  wrap:{ padding:16, gap:12, flex:1 },
  h1:{ color:CYAN, fontWeight:"800", fontSize:22 },
  row:{ flexDirection:"row", gap:12, alignItems:"center" },
  avatarWrap:{ width:96, height:96, borderRadius:48, overflow:"hidden", borderWidth:2, borderColor:"rgba(0,229,255,0.4)" },
  avatar:{ width:96, height:96 },
  avatarPlaceholder:{ alignItems:"center", justifyContent:"center", backgroundColor:"rgba(0,229,255,0.15)" },
  avatarInitial:{ color:"#fff", fontWeight:"800", fontSize:32 },
  label:{ color:"#9fe", marginBottom:6 },
  input:{ borderWidth:1.5, borderColor:"rgba(0,229,255,0.35)", borderRadius:12, paddingHorizontal:12, paddingVertical:10, color:"#fff", backgroundColor:"rgba(0,0,0,0.35)", minWidth:160 },
  rowBtns:{ flexDirection:"row", gap:10 },
  btn:{ flex:1, paddingVertical:12, borderRadius:12, alignItems:"center", borderWidth:1.5 },
  primary:{ borderColor:CYAN, backgroundColor:"rgba(0,229,255,0.15)" },
  secondary:{ borderColor:"rgba(255,255,255,0.35)", backgroundColor:"rgba(255,255,255,0.1)" },
  danger:{ borderColor:"rgba(255,107,107,0.6)", backgroundColor:"rgba(255,107,107,0.15)" },
  btnt:{ color:"#fff", fontWeight:"800" },
  card:{ padding:12, borderRadius:12, borderWidth:1.5, borderColor:"rgba(0,229,255,0.35)", backgroundColor:"rgba(0,0,0,0.35)", marginTop:8 },
  k:{ color:"#9fe", marginBottom:6 },
  v:{ color:"#fff" }
});
