import React,{useState} from "react";
import {Pressable,Text,View} from "react-native";
import {useTheme} from "../../app/context/ThemeContext";
import {floor,limit,trace,type Instruction} from "./robot";
export default function RobotWorkshop(){
 const {tokens:t}=useTheme();
 const [code,setCode]=useState<Instruction[]>([]),[cursor,setCursor]=useState(0);
 const steps=trace(code),at=steps[Math.min(cursor,steps.length-1)];
 function edit(next:Instruction[]){setCode(next);setCursor(0);}
 function control(label:string,fn:()=>void,disabled=false){return <Pressable key={label} accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={fn}
 style={{padding:12,minHeight:44,borderWidth:1,borderColor:t.border,borderRadius:9,opacity:disabled?.5:1}}><Text style={{color:t.text}}>{label}</Text></Pressable>;}
 return <View style={{gap:10,padding:14,backgroundColor:t.card}}>
  <Text accessibilityRole="header" style={{fontWeight:"700",fontSize:20,color:t.text}}>Circuit Commons robot workshop</Text>
  <Text style={{color:t.text}}>Program a delivery robot to carry a seedling to the greenhouse. Turns rotate in place. Use up to ten commands, then step through your route.</Text>
  <View accessible accessibilityLabel="Four by four grid. Dock at row four, column one. Greenhouse at row one, column three. Rocks at row two column two and row three column three.">
  {floor.map((row,y)=><View key={y} style={{flexDirection:"row"}}>{row.split("").map((tile,x)=><View key={x} style={{width:40,height:40,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:t.border,backgroundColor:tile==="#"?"#44505a":"#e4e7cf"}}><Text style={{color:"#172b24",fontSize:21}}>{x===at.x&&y===at.y?["→","↓","←","↑"][at.heading]:tile==="#"?"◆":tile==="G"?"✿":tile==="S"?"⌂":"·"}</Text></View>)}</View>)}</View>
  <Text style={{color:t.text}}>Program · {code.join(" → ")||"Empty"}</Text>
  <View style={{flexDirection:"row",flexWrap:"wrap",gap:6}}>{(["Forward","Left","Right"] as const).map(k=>control(k,()=>edit([...code,k]),code.length>=limit))}
  {control("Undo last command",()=>edit(code.slice(0,-1)),!code.length)}
  {control("Step robot",()=>setCursor(cursor+1),cursor>=steps.length-1)}
  {control("Replay route",()=>setCursor(0),!cursor)}
  {control("Clear program",()=>edit([]),!code.length)}</View>
  <Text accessibilityLiveRegion="polite" style={{color:t.text}}>Step {cursor}. Row {at.y+1}, column {at.x+1}, facing {["east","south","west","north"][at.heading]}. {at.message}</Text>
 </View>;
}
