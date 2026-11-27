import React, {useState} from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import {useTheme} from "../context/ThemeContext";
import {practiceFor, recallFor, evaluatePractice} from "../_lib/discoveryPractice";

export default function DiscoveryPractice({discoveryId}:{discoveryId:string}) {
 const {tokens}=useTheme();
 const [mode,setMode]=useState<"closed"|"recall"|"apply">("closed");
 const [revealed,setRevealed]=useState(false);
 const [selected,setSelected]=useState<number|null>(null);
 const recall=recallFor(discoveryId);
 const practice=practiceFor(discoveryId);
 const result=selected===null?undefined:evaluatePractice(discoveryId,selected);
 if (!recall || !practice) return null;
 const ink={color:tokens.text};
 const action=(label:string,run:()=>void,chosen=false)=><Pressable accessibilityRole="button" accessibilityState={{selected:chosen}} onPress={run} style={[s.button,{backgroundColor:tokens.bg,borderColor:chosen?tokens.accent:tokens.border}]}>
   <Text style={[s.label,ink]}>{label}</Text>
 </Pressable>;
 return <View style={[s.panel,{borderColor:tokens.border}]}>
   <Text accessibilityRole="header" style={[s.heading,ink]}>Put your curiosity to work</Text>
   <Text style={[s.body,ink]}>Try a quick memory card or apply your discovery to a new situation. Completely optional.</Text>
   {mode==="closed"?action("Explore practice",()=>setMode("apply")):<>
     <View style={s.row}>{action("Memory card",()=>setMode("recall"),mode==="recall")}{action("Try a challenge",()=>setMode("apply"),mode==="apply")}</View>
     {mode==="recall"?<View style={s.content}>
       <Text style={[s.heading,ink]}>{recall.front}</Text>
       {action(revealed?"Hide answer":"Reveal answer",()=>setRevealed(x=>!x))}
       {revealed&&<Text accessibilityLiveRegion="polite" style={[s.body,ink]}>{recall.back}</Text>}
     </View>:<View style={s.content}>
       <Text style={[s.heading,ink]}>{practice.question}</Text>
       {practice.options.map((option,index)=><View key={option}>{action(option,()=>setSelected(index),selected===index)}</View>)}
       {result&&<View accessibilityLiveRegion="polite" style={[s.feedback,{borderColor:tokens.border}]}>
         <Text style={[s.label,ink]}>{result.correct?"That fits!":"Here's another way to think about it."}</Text>
         <Text style={[s.body,ink]}>{result.explanation}</Text>
         {action("Try again",()=>setSelected(null))}
       </View>}
     </View>}
     {action("Close practice",()=>{setMode("closed");setSelected(null);setRevealed(false);})}
   </>}
   <Text style={[s.small,ink]}>No grades, timers, coins or daily requirements.</Text>
 </View>;
}
const s=StyleSheet.create({
 panel:{gap:10,borderTopWidth:1,paddingTop:12},
 row:{flexDirection:"row",flexWrap:"wrap",gap:8},
 content:{gap:10},feedback:{borderWidth:1,borderRadius:12,padding:12,gap:8},
 button:{minHeight:44,justifyContent:"center",borderWidth:1,borderRadius:10,padding:12},
 heading:{fontSize:17,fontWeight:"700"},body:{fontSize:15,lineHeight:22},label:{fontWeight:"700"},small:{fontSize:12,lineHeight:18}
});
