import React from "react";
import { View, Text } from "react-native";
export default function HeaderBar({ title="Nova" }:{ title?:string }){ return <View style={{ padding:14, borderBottomWidth:1, borderColor:"#111827" }}><Text style={{ color:"#e6faff", fontWeight:"900", fontSize:18 }}>{title}</Text></View>; }
