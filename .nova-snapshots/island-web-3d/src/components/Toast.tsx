import React, { createContext, useCallback, useContext, useState } from "react";
import { View, Text } from "react-native";
type ToastOpts={ type?:"success"|"error"|"info"; text1?:string; text2?:string }|string;
type CtxT={ show:(msg:ToastOpts)=>void };
const Ctx=createContext<CtxT|undefined>(undefined);
export function ToastProvider({ children }:{children:any}){ const [items,set]=useState<{id:string; text:string}[]>([]); const show=useCallback((m:ToastOpts)=>{ const text=typeof m==="string"?m:(m.text1||""); const id=Math.random().toString(36).slice(2); set(x=>[...x,{id,text}]); setTimeout(()=>set(x=>x.filter(i=>i.id!==id)),1500); },[]); return(<Ctx.Provider value={{show}}>{children}<View pointerEvents="box-none" style={{position:"absolute",left:0,right:0,bottom:40,alignItems:"center"}}>{items.map(it=>(<View key={it.id} style={{backgroundColor:"#001018",borderColor:"#0aaad1",borderWidth:1,paddingHorizontal:12,paddingVertical:8,borderRadius:12,marginTop:8}}><Text style={{color:"#e6faff",fontWeight:"800"}}>{it.text}</Text></View>))}</View></Ctx.Provider>); }
export function useContextSafe(){ const v=useContext(Ctx); if(!v) return { show:(_m:ToastOpts)=>{} }; return v; }
export default function Toast(){ return null; }
