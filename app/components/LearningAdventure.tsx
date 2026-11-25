import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { choosePath, type Adventure, type Choice } from "../_lib/adventureModel";

export default function LearningAdventure({ adventure, onExit }: { adventure: Adventure; onExit: () => void }) {
  const { tokens } = useTheme();
  const [sceneId,setSceneId] = useState(adventure.start);
  const [response,setResponse] = useState<Choice | null>(null);
  const scene = adventure.scenes[sceneId];
  const ink = { color: tokens.text };
  const action = (label: string, run: () => void) => (
    <Pressable accessibilityRole="button" onPress={run} style={[s.button,{borderColor:tokens.border,backgroundColor:tokens.card}]}>
      <Text style={[s.label,ink]}>{label}</Text>
    </Pressable>
  );
  function reset() { setSceneId(adventure.start); setResponse(null); }
  if (!scene) return <View>{action("Return to Discover",onExit)}</View>;
  return <View style={[s.panel,{borderColor:tokens.border,backgroundColor:tokens.card}]}>
    <Text style={[s.kicker,ink]}>LEARNING ADVENTURE · {adventure.title}</Text>
    <Text accessibilityRole="header" style={[s.title,ink]}>{scene.title}</Text>
    <Text style={[s.body,ink]}>{scene.story}</Text>
    {response ? <View style={s.feedback}>
      <Text style={[s.kicker,ink]}>YOUR CHOICE</Text>
      <Text style={[s.label,ink]}>{response.label}</Text>
      <Text accessibilityLiveRegion="polite" style={[s.body,ink]}>{response.feedback}</Text>
      {action("Continue the story",()=>{setSceneId(response.next);setResponse(null);})}
      {action("Try another choice",()=>setResponse(null))}
    </View> : scene.choices.length ? scene.choices.map((choice,index)=>
      <Pressable key={index} accessibilityRole="button" onPress={()=>setResponse(choosePath(adventure,sceneId,index) ?? null)}
        style={[s.button,{borderColor:tokens.border,backgroundColor:tokens.bg}]}>
        <Text style={[s.label,ink]}>{choice.label}</Text>
      </Pressable>
    ) : <>
      {action("Replay and experiment",reset)}
      {action("Back to Discover",onExit)}
    </>}
    {scene.choices.length > 0 && action("Leave adventure",onExit)}
    <Text style={[s.kicker,ink]}>Free to explore · no scores, timers or penalties</Text>
  </View>;
}
const s=StyleSheet.create({
  panel:{padding:16,gap:12,borderWidth:1,borderRadius:16},
  title:{fontSize:23,fontWeight:"800"},kicker:{fontSize:12,fontWeight:"700"},
  body:{fontSize:16,lineHeight:24},label:{fontSize:15,fontWeight:"600"},
  button:{padding:12,borderWidth:1,borderRadius:10,minHeight:44,justifyContent:"center"},
  feedback:{gap:10}
});
