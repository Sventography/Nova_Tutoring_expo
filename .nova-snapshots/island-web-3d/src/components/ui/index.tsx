import React from "react";
import { View, Text, Pressable, ViewStyle, TextStyle, PressableProps } from "react-native";
export function NeonScreen({ children, style }:{ children:any; style?:ViewStyle }){ return <View style={[{ flex:1, backgroundColor:"#000008", padding:20 }, style]}>{children}</View>; }
export function SectionTitle({ children, style }:{ children:any; style?:TextStyle }){ return <Text style={[{ color:"#e6faff", fontSize:22, fontWeight:"900" }, style]}>{children}</Text>; }
export function NeonText({ children, style }:{ children:any; style?:TextStyle }){ return <Text style={[{ color:"#e6faff" }, style]}>{children}</Text>; }
export function NeonSub({ children, style, numberOfLines }:{ children:any; style?:TextStyle; numberOfLines?:number }){ return <Text numberOfLines={numberOfLines} style={[{ color:"#8aa7c4" }, style]}>{children}</Text>; }
export function NeonCard({ children, style }:{ children:any; style?:ViewStyle }){ return <View style={[{ backgroundColor:"#0b1020", borderRadius:16, borderColor:"#22d3ee66", borderWidth:1, padding:14 }, style]}>{children}</View>; }
export function NeonButton({ children, style, onPress, disabled }:{ children:any; style?:ViewStyle; onPress?:PressableProps["onPress"]; disabled?:boolean }){ return <Pressable onPress={onPress} disabled={disabled} style={[{ backgroundColor: disabled?"#0b2b44":"#22d3ee", paddingVertical:12, borderRadius:14, alignItems:"center" }, style]}><Text style={{ color:"#001318", fontWeight:"900" }}>{children}</Text></Pressable>; }
export default { NeonScreen, SectionTitle, NeonText, NeonSub, NeonCard, NeonButton };
