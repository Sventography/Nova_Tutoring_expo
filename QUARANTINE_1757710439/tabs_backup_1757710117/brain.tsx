import React from "react";
import { View, Text } from "react-native";
export default function Brain(){ return(<View style={{ flex:1, backgroundColor:"black", alignItems:"center", justifyContent:"center", padding:20 }}><Text style={{ color:"white", fontSize:22, fontWeight:"800", marginBottom:8 }}>Brain Teaser</Text><Text style={{ color:"#ddd", textAlign:"center" }}>I speak without a mouth and hear without ears. I have nobody, but I come alive with wind. What am I?</Text><Text style={{ color:"#7ff", marginTop:10 }}>An echo.</Text></View>); }
