import React,{useState} from "react";
import {Pressable,StyleSheet,Text,View} from "react-native";
import Svg,{Rect,Polygon,Line,Circle,Path} from "react-native-svg";
import {useTheme} from "../context/ThemeContext";
import {SCALE_FACTORS,DEPTH_LEVELS,squareScale,mountainPalette,EDIT_CONTEXTS,editContext} from "../_lib/discoveryLabs";

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
function EditingLab(){
 const {tokens}=useTheme();
 const [index,setIndex]=useState(0);
 const context=editContext(EDIT_CONTEXTS[index].id)!;
 return <View style={s.panel}>
   <Text style={[s.title,{color:tokens.text}]}>Change the story with a cut</Text>
   <Text style={{color:tokens.text}}>Keep the first shot unchanged. Choose the next shot and imagine what the person might be thinking.</Text>
   <Svg width="100%" height={145} viewBox="0 0 320 145" accessibilityLabel={"Neutral face followed by "+context.label}>
     <Rect x={3} y={5} width={151} height={135} rx={8} fill="#dbe3ed"/>
     <Circle cx={78} cy={57} r={32} fill="#c7926b"/>
     <Circle cx={67} cy={53} r={3} fill="#29313b"/><Circle cx={89} cy={53} r={3} fill="#29313b"/>
     <Line x1={69} y1={70} x2={87} y2={70} stroke="#29313b" strokeWidth={2}/>
     <Path d="M25 140 Q25 93 78 93 Q131 93 131 140" fill="#52677e"/>
     <Rect x={166} y={5} width={151} height={135} rx={8} fill="#dce5d8"/>
     {context.symbol==="gift"?<>
       <Rect x={202} y={50} width={79} height={67} fill="#ad455d" rx={3}/>
       <Rect x={198} y={44} width={87} height={18} fill="#c65c75"/>
       <Rect x={237} y={44} width={10} height={73} fill="#f4cb71"/>
       <Path d="M242 44 Q213 12 217 34 Q221 46 242 44 Q272 12 269 34 Q264 46 242 44" fill="none" stroke="#aa7838" strokeWidth={4}/>
     </>:context.symbol==="bench"?<>
       <Rect x={185} y={99} width={114} height={9} fill="#876344"/>
       <Rect x={185} y={74} width={114} height={14} rx={2} fill="#876344"/>
       <Line x1={197} y1={87} x2={197} y2={124} stroke="#4c5154" strokeWidth={6}/>
       <Line x1={287} y1={87} x2={287} y2={124} stroke="#4c5154" strokeWidth={6}/>
     </>:<>
       <Rect x={209} y={25} width={69} height={110} fill="#44505d"/>
       <Polygon points="211,26 257,42 257,122 211,134" fill="#a47c54"/>
       <Circle cx={249} cy={84} r={3} fill="#f4cb71"/>
     </>}
   </Svg>
   <Choices values={[0,1,2]} selected={index} onChange={setIndex} labels={EDIT_CONTEXTS.map(item=>item.label)}/>
   <Text accessibilityLiveRegion="polite" style={[s.title,{color:tokens.text}]}>{context.interpretation}</Text>
   <Text style={{color:tokens.text}}>{context.explanation}</Text>
   <Text style={{color:tokens.text}}>The expression never changes. Context can influence interpretation, but different viewers may read it differently. Try inventing your own next shot.</Text>
 </View>;
}
export default function DiscoveryLabs({discoveryId}:{discoveryId:string}){
 if(discoveryId==="film-cut")return <EditingLab/>;
 if(discoveryId==="math-scale")return <ScaleLab/>;
 if(discoveryId==="art-depth")return <PerspectiveLab/>;
 return null;
}
const s=StyleSheet.create({panel:{gap:10},row:{flexDirection:"row",flexWrap:"wrap",gap:8},button:{padding:10,minHeight:44,borderWidth:1,borderRadius:10,justifyContent:"center"},title:{fontSize:17,fontWeight:"700"}});
