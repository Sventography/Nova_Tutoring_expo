import React, {useState} from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import Svg, {Circle, Line, Polygon, Rect} from "react-native-svg";
import {useTheme} from "../context/ThemeContext";
import {ORBIT_RADII, ORBIT_STEPS, orbitAt} from "../_lib/orbitLab";

export default function OrbitLab() {
  const {tokens} = useTheme();
  const [radius,setRadius] = useState<number>(2);
  const [step,setStep] = useState(0);
  const [prediction,setPrediction] = useState<"faster"|"same"|"slower"|null>(null);
  const result=orbitAt(radius,step);
  const reference=orbitAt(1,step);
  const expected=radius<1?"faster":radius>1?"slower":"same";
  const cx=160,cy=130,unit=49;
  const x=cx+result.x*unit,y=cy-result.y*unit;
  function arrow(dx:number,dy:number,length:number,color:string) {
    const ex=x+dx*length,ey=y-dy*length;
    const bx=ex-dx*6,by=ey+dy*6;
    return <><Line x1={x} y1={y} x2={ex} y2={ey} stroke={color} strokeWidth={2.5}/><Polygon points={ex+","+ey+" "+(bx+dy*3.5)+","+(by+dx*3.5)+" "+(bx-dy*3.5)+","+(by-dx*3.5)} fill={color}/></>;
  }
  function control(label:string,onPress:()=>void,selected?:boolean,disabled=false) {
    return <Pressable key={label} accessibilityRole="button" accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={[s.button,{borderColor:selected?tokens.accent:tokens.border,backgroundColor:tokens.bg,opacity:disabled ? 0.5 : 1}]}><Text style={{color:tokens.text,fontWeight:selected?"700":"400"}}>{label}</Text></Pressable>;
  }
  return <View style={s.panel}>
    <Text accessibilityRole="header" style={[s.title,{color:tokens.text}]}>Build an orbit</Text>
    <Text style={{color:tokens.text}}>Choose a planet's distance from a star. Predict whether it will take less or more time to complete an orbit than the reference planet.</Text>
    <View style={s.row}>{ORBIT_RADII.map(r=>control(r+" AU",()=>{setRadius(r);setStep(0);setPrediction(null);},r===radius))}</View>
    <View style={s.row}>{(["faster","same","slower"] as const).map(p=>control(p==="faster"?"Less time":p==="same"?"Same time":"More time",()=>setPrediction(p),prediction===p))}</View>
    <Svg width="100%" height={260} viewBox="0 0 320 260" accessibilityLabel={"Two circular orbits at "+radius+" and 1 astronomical unit. Time "+result.elapsed.toFixed(2)+" reference years."}>
      <Rect width={320} height={260} rx={12} fill="#182638"/>
      <Circle cx={cx} cy={cy} r={unit} stroke="#8199b6" strokeWidth={1.5} strokeDasharray="5 4" fill="none"/>
      <Circle cx={cx} cy={cy} r={radius*unit} stroke="#77cbbd" strokeWidth={2} fill="none"/>
      <Circle cx={cx} cy={cy} r={13} fill="#f7b95a" fillOpacity={.2}/>
      <Circle cx={cx} cy={cy} r={8} fill="#ffd377"/>
      <Circle cx={cx+reference.x*unit} cy={cy-reference.y*unit} r={8} stroke="#adc7e9" strokeWidth={2} fill="none"/>
      <Circle cx={x} cy={y} r={5} fill="#77cbbd"/>
      {arrow(result.tangentX,result.tangentY,17,"#b9e6ff")}
      {arrow(result.inwardX,result.inwardY,15,"#ffc47b")}
    </Svg>
    <Text style={{color:tokens.text}}>Teal: your planet · Dashed orbit and hollow marker: reference planet · Blue arrow: motion · Gold arrow: inward gravity (directions only).</Text>
    <View style={s.row}>{control("Back one month",()=>setStep(v=>Math.max(0,v-1)),undefined,step===0)}{control("Advance one month",()=>setStep(v=>Math.min(ORBIT_STEPS,v+1)),undefined,step===ORBIT_STEPS)}{control("Reset time",()=>setStep(0),undefined,step===0)}</View>
    <Text accessibilityLiveRegion="polite" style={{color:tokens.text,fontWeight:"700"}}>Elapsed: {step} of 12 reference months · Your planet: {result.turns.toFixed(2)} orbits · Reference: {reference.turns.toFixed(2)} orbits</Text>
    {step>0 && <Text style={{color:tokens.text}}>One full orbit takes {result.period.toFixed(2)} reference years. Orbital speed is {result.speed.toFixed(2)} times the reference speed.</Text>}
    {step>0 && prediction && <Text style={{color:tokens.text}}>{prediction===expected?"Your prediction matches this model.":"Compare the two orbital periods and try another prediction."} {expected==="same"?"At the same distance, the periods are equal.":expected==="faster"?"A closer circular orbit is shorter and faster.":"A farther circular orbit is longer and slower."}</Text>}
    <Text style={{color:tokens.text}}>This simplified model assumes circular orbits, negligible planet masses, and a fixed Sun-like star. One AU is approximately Earth's average orbital distance from the Sun. Planets and star are not drawn to scale; real orbits are usually elliptical.</Text>
  </View>;
}
const s=StyleSheet.create({panel:{gap:10},row:{flexDirection:"row",flexWrap:"wrap",gap:8},button:{minHeight:44,padding:10,borderWidth:1,borderRadius:10,justifyContent:"center"},title:{fontSize:17,fontWeight:"700"}});
