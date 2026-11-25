import React,{useState} from "react";
import {Pressable,StyleSheet,Text,View} from "react-native";
import Svg,{Rect,Polygon,Line} from "react-native-svg";
import {useTheme} from "../context/ThemeContext";
import {SCALE_FACTORS,DEPTH_LEVELS,squareScale,mountainPalette} from "../_lib/discoveryLabs";

function Choices({values,selected,onChange,labels}:{values:readonly number[];selected:number;onChange:(n:number)=>void;labels:readonly string[]}){
 const {tokens}=useTheme();
 return <View style={s.row}>{values.map((v,i)=><Pressable key={v} accessibilityRole="button" accessibilityState={{selected:v===selected}} onPress={()=>onChange(v)} style={[s.button,{borderColor:v===selected?tokens.accent:tokens.border,backgroundColor:tokens.bg}]}><Text style={{color:tokens.text,fontWeight:v===selected?"700":"400"}}>{labels[i]}</Text></Pressable>)}</View>;
}

function ScaleLab(){
 const {tokens}=useTheme();
 const [factor,setFactor]=useState(1);
 const result=squareScale(factor);
 const cells=Array.from({length:result.length+1},(_,i)=>i);
 const width=result.length*14;
 return <View style={s.panel}>
   <Text style={[s.title,{color:tokens.text}]}>Resize a miniature canvas</Text>
   <Text style={{color:tokens.text}}>Predict the area before changing the side length. Does doubling a side double the area?</Text>
   <Choices values={SCALE_FACTORS} selected={factor} onChange={setFactor} labels={["1×","2×","3×","4×"]}/>
   <Svg width="100%" height={156} viewBox="0 0 200 156" accessibilityLabel={result.length+" by "+result.length+" square grid"}>
     <Rect x={(200-width)/2} y={20} width={width} height={width} fill={tokens.accent} fillOpacity={0.16} stroke={tokens.accent}/>
     {cells.map(i=><React.Fragment key={i}><Line x1={(200-width)/2+i*14} x2={(200-width)/2+i*14} y1={20} y2={20+width} stroke={tokens.accent}/><Line x1={(200-width)/2} x2={(200+width)/2} y1={20+i*14} y2={20+i*14} stroke={tokens.accent}/></React.Fragment>)}
   </Svg>
   <Text accessibilityLiveRegion="polite" style={[s.title,{color:tokens.text}]}>{result.length} × {result.length} = {result.area} square units</Text>
   <Text style={{color:tokens.text}}>Length: {factor}× · Area: {result.areaFactor}× · Volume of a similarly scaled cube: {result.volumeFactor}×</Text>
 </View>;
}

function PerspectiveLab(){
 const {tokens}=useTheme();
 const [level,setLevel]=useState(0);
 const palette=mountainPalette(level);
 return <View style={s.panel}>
   <Text style={[s.title,{color:tokens.text}]}>Paint distance with color</Text>
   <Text style={{color:tokens.text}}>Change the atmospheric haze without changing the shapes. Observe how the mountain layers appear to separate.</Text>
   <Choices values={DEPTH_LEVELS} selected={level} onChange={setLevel} labels={["None","Light","Moderate","Strong"]}/>
   <Svg width="100%" height={160} viewBox="0 0 320 160" accessibilityLabel={"Illustrative landscape, haze level "+level+" of 3"}>
     <Rect x={0} y={0} width={320} height={160} rx={8} fill="#d5e3ec"/>
     <Polygon points="0,105 60,36 87,63 148,18 218,81 261,41 320,93 320,160 0,160" fill={palette.far}/>
     <Polygon points="0,120 58,79 104,112 176,57 250,106 290,70 320,105 320,160 0,160" fill={palette.middle}/>
     <Polygon points="0,142 47,111 100,137 163,101 231,141 280,103 320,134 320,160 0,160" fill={palette.near}/>
   </Svg>
   <Text accessibilityLiveRegion="polite" style={{color:tokens.text}}>{level===0?"All layers have strong color.":"Farther layers become lighter and closer to the sky color."} Shapes and positions remain unchanged.</Text>
   <Text style={{color:tokens.text}}>This is an artistic approximation. Real atmospheric perspective also depends on lighting, distance and weather.</Text>
 </View>;
}
export default function DiscoveryLabs({discoveryId}:{discoveryId:string}){
 if(discoveryId==="math-scale")return <ScaleLab/>;
 if(discoveryId==="art-depth")return <PerspectiveLab/>;
 return null;
}
const s=StyleSheet.create({panel:{gap:10},row:{flexDirection:"row",flexWrap:"wrap",gap:8},button:{padding:10,minHeight:44,borderWidth:1,borderRadius:10,justifyContent:"center"},title:{fontSize:17,fontWeight:"700"}});
