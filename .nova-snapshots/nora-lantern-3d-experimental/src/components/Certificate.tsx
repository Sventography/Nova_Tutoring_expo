import React from "react";
import { View, Text } from "react-native";
type Props={ rec:any };
export default function Certificate({ rec }:Props){ return <View><Text style={{color:"#e6faff"}}>Certificate {rec?.id||""}</Text></View>; }
