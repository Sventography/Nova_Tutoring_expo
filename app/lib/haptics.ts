import { useMemo } from "react";
let Haptics:any=null; try{ Haptics=require("expo-haptics"); }catch{}
const impact=async(l:"light"|"medium"|"heavy")=>{ if(!Haptics?.impactAsync||!Haptics?.ImpactFeedbackStyle)return; const s=Haptics.ImpactFeedbackStyle; const st=l==="light"?s.Light:l==="medium"?s.Medium:s.Heavy; try{await Haptics.impactAsync(st);}catch{} };
const selection=async()=>{ if(!Haptics?.selectionAsync)return; try{await Haptics.selectionAsync();}catch{} };
const notify=async(k:"success"|"warning"|"error")=>{ if(!Haptics?.notificationAsync||!Haptics?.NotificationFeedbackType)return; const t=Haptics.NotificationFeedbackType; const ty=k==="success"?t.Success:k==="warning"?t.Warning:t.Error; try{await Haptics.notificationAsync(ty);}catch{} };
export function useHaptics(){ return useMemo(()=>({ light:()=>impact("light"), medium:()=>impact("medium"), heavy:()=>impact("heavy"), selection:()=>selection(), success:()=>notify("success"), warning:()=>notify("warning"), error:()=>notify("error") }),[]); }
export const haptics={ light:()=>impact("light"), medium:()=>impact("medium"), heavy:()=>impact("heavy"), selection:()=>selection(), success:()=>notify("success"), warning:()=>notify("warning"), error:()=>notify("error") };
export default haptics;
