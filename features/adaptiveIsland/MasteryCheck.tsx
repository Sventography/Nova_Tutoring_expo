import React, { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../../app/lib/supabase";
import { useTheme } from "../../app/context/ThemeContext";

const feedback: Record<string,string> = {
  closed:"Learning checks are closed.",unavailable:"This check is unavailable.",
  already_credited:"You already earned this lesson’s reward.",
  expired:"This check expired.",incorrect:"That answer didn’t match. Revisit the discovery and try another day.",
  daily_limit:"You have used today’s two checks.",try_another_day:"Try this lesson again another day."
};
export default function MasteryCheck({lesson}:{lesson:string}) {
  const {tokens}=useTheme();
  const [question,setQuestion]=useState<{id:string; prompt:string}|null>(null);
  const [answer,setAnswer]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  if (process.env.EXPO_PUBLIC_GARDEN_CHECKS !== "true" ||
      process.env.EXPO_PUBLIC_SUPABASE_URL !== "https://gouhhltupxaycuysdtrw.supabase.co" ||
      !["music-octave","space-light","art-depth"].includes(lesson)) return null;
  async function submit() {
    if(lock.current) return;
    lock.current=true;setBusy(true);
    try {
      const {data,error}=question
        ? await supabase.rpc("nova_garden_answer",{p_attempt:question.id,p_answer:Number(answer)})
        : await supabase.rpc("nova_garden_begin",{p_lesson:lesson});
      if(error || !data) throw Error();
      if(data.status==="question"){setQuestion({id:data.attempt,prompt:data.prompt});setNotice("");}
      else {setQuestion(null);setAnswer("");setNotice(data.status==="credited"?
        `Earned ${data.xp} Island XP and ${data.coins} Nova Coins. Island level ${data.island_level}. Nova Coins balance: ${data.balance}.`:
        feedback[data.status]||"This check is unavailable.");}
    } catch {setNotice("Could not confirm the result. Retry this check.");}
    finally{lock.current=false;setBusy(false);}
  }
  const disabled=busy||Boolean(question&&!/^\d{1,4}$/.test(answer));
  return <View style={{gap:8}}>
    <Text style={{color:tokens.text}}>Optional mastery check · 4 Island XP and 5 Nova Coins on first success. Two checks per Eastern day.</Text>
    {question && <><Text style={{color:tokens.text}}>{question.prompt}</Text><TextInput accessibilityLabel="Your numeric answer" value={answer} onChangeText={setAnswer} keyboardType="number-pad" maxLength={4} style={{color:tokens.text,borderWidth:1,borderColor:tokens.border,padding:8}}/></>}
    <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={submit} style={{padding:10,backgroundColor:tokens.card}}><Text style={{color:tokens.text}}>{question?"Check answer":"Start mastery check"}</Text></Pressable>
    {!!notice && <Text accessibilityLiveRegion="polite" style={{color:tokens.text}}>{notice}</Text>}
  </View>;
}
