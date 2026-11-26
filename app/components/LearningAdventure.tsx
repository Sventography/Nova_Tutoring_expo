import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { choosePath, startAdventure, advanceAdventure, type Adventure } from "../_lib/adventureModel";

export default function LearningAdventure({ adventure, onExit, onComplete, completed, saving, ready, saveStatus, onRetryLoad }: { adventure: Adventure; onExit: () => void; onComplete: () => void; completed: boolean; saving: boolean; ready: boolean; saveStatus: string; onRetryLoad: () => void }) {
  const { tokens } = useTheme();
  const [run,setRun] = useState(()=>startAdventure(adventure));
  const [selected,setSelected] = useState<number | null>(null);
  const sceneId=run.sceneId;
  const scene = adventure.scenes[sceneId];
  const response=selected===null?undefined:choosePath(adventure,sceneId,selected);
  const ink = { color: tokens.text };
  const action = (label: string, run: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={run} style={[s.button,{borderColor:tokens.border,backgroundColor:tokens.card,opacity:disabled ? .5 : 1}]}>
      <Text style={[s.label,ink]}>{label}</Text>
    </Pressable>
  );
  function reset() { setRun(startAdventure(adventure)); setSelected(null); }
  function continueStory() {
    if(selected===null)return;
    const next=advanceAdventure(adventure,run,selected);
    if(next===run)return;
    setRun(next);setSelected(null);
    if(!adventure.scenes[next.sceneId].choices.length&&!completed)onComplete();
  }
  if (!scene) return <View>{action("Return to Discover",onExit)}</View>;
  return <View style={[s.panel,{borderColor:tokens.border,backgroundColor:tokens.card}]}>
    <Text style={[s.kicker,ink]}>LEARNING ADVENTURE · {adventure.title}</Text>
    <Text accessibilityRole="header" style={[s.title,ink]}>{scene.title}</Text>
    <Text style={[s.body,ink]}>{scene.story}</Text>
    {response ? <View style={s.feedback}>
      <Text style={[s.kicker,ink]}>YOUR CHOICE</Text>
      <Text style={[s.label,ink]}>{response.label}</Text>
      <Text accessibilityLiveRegion="polite" style={[s.body,ink]}>{response.feedback}</Text>
      {action("Continue the story",continueStory)}
      {action("Try another choice",()=>setSelected(null))}
    </View> : scene.choices.length ? scene.choices.map((choice,index)=>
      <Pressable key={index} accessibilityRole="button" onPress={()=>{if(choosePath(adventure,sceneId,index))setSelected(index);}}
        style={[s.button,{borderColor:tokens.border,backgroundColor:tokens.bg}]}>
        <Text style={[s.label,ink]}>{choice.label}</Text>
      </Pressable>
    ) : <>
      <Text accessibilityRole="header" style={[s.label,ink]}>How your choices shaped this ending</Text>
      {run.steps.map((step,i)=><View key={i} style={s.feedback}>
        <Text style={[s.kicker,ink]}>{i+1}. {adventure.scenes[step.sceneId].title}</Text>
        <Text style={[s.body,ink]}>{choosePath(adventure,step.sceneId,step.choiceIndex)?.label}</Text>
      </View>)}
      {!completed && <>
        <Text accessibilityLiveRegion="polite" style={ink}>{!ready ? "Your journey is not loaded. Your ending is still here." : saving ? "Saving your journey…" : saveStatus || "This adventure is not saved yet."}</Text>
        {!ready ? action("Retry loading journey",onRetryLoad) : action(saving ? "Saving…" : "Save this adventure to my journey",onComplete,saving)}
      </>}
      {completed && <Text style={ink}>Saved to your learning journey.</Text>}
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
