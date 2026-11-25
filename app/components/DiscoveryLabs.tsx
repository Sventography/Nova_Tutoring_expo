import RobotWorkshop from "../../features/adaptiveIsland/RobotWorkshop";
import React,{useState} from "react";
import {Pressable,StyleSheet,Text,View} from "react-native";
import Svg,{Rect,Polygon,Line,Circle,Path} from "react-native-svg";
import {useTheme} from "../context/ThemeContext";
import HarmonyPlayback from "./HarmonyPlayback";
import {SCALE_FACTORS,DEPTH_LEVELS,squareScale,mountainPalette,EDIT_CONTEXTS,editContext,COIN_BATCHES,simulateCoins,PIXEL_RESOLUTIONS,PIXEL_SHAPES,PIXEL_COLORS,pixelMask,KEY_NOTES,CHORD_ROOTS,triad,noteFrequency,STORY_SHOTS,shotReading,moveShot,VIEWPOINTS,viewpoint,SETUPS,storyPayoff} from "../_lib/discoveryLabs";

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
   <ShotOrderLab/>
 </View>;
}
function ProbabilityLab(){
 const {tokens}=useTheme();
 const [batch,setBatch]=useState(10);
 const [prediction,setPrediction]=useState<number|null>(null);
 const [result,setResult]=useState<{heads:number;tails:number}|null>(null);
 const selectBatch=(n:number)=>{setBatch(n);setPrediction(null);setResult(null);};
 const run=()=>setResult(simulateCoins(batch));
 const total=result?result.heads+result.tails:0;
 const percent=result?Math.round(100*result.heads/total):0;
 return <View style={s.panel}>
  <Text style={[s.title,{color:tokens.text}]}>The probability lab</Text>
  <Text style={{color:tokens.text}}>Predict the number of heads, then simulate independent fair coin flips. Try the same prediction more than once.</Text>
  <Choices values={COIN_BATCHES} selected={batch} onChange={selectBatch} labels={["10 flips","50 flips","100 flips"]}/>
  <Text style={{color:tokens.text}}>My prediction:</Text>
  <Choices values={[0,1,2]} selected={prediction??-1} onChange={n=>{setPrediction(n);setResult(null);}} labels={["Fewer than half","Exactly half","More than half"]}/>
  <Pressable accessibilityRole="button" accessibilityState={{disabled:prediction===null}} disabled={prediction===null} onPress={run} style={[s.button,{borderColor:tokens.border,backgroundColor:tokens.bg,opacity:prediction===null?0.5:1}]}><Text style={{color:tokens.text,fontWeight:"700"}}>{result?"Run another experiment":"Run experiment"}</Text></Pressable>
  {result&&<>
   <View style={{height:22,flexDirection:"row",borderRadius:6,overflow:"hidden",borderWidth:1,borderColor:tokens.border}}>
    <View style={{flex:result.heads,backgroundColor:"#286ba7"}}/><View style={{flex:result.tails,backgroundColor:"#b67b2e"}}/>
   </View>
   <Text accessibilityLiveRegion="polite" style={[s.title,{color:tokens.text}]}>{result.heads} heads · {result.tails} tails ({percent}% heads)</Text>
   <Text style={{color:tokens.text}}>{(result.heads<total/2?0:result.heads===total/2?1:2)===prediction?"Your prediction matched this run.":"This run differed from your prediction."} Every flip still had a 50% chance of heads.</Text>
  </>}
  <Text style={{color:tokens.text}}>Larger samples tend to have proportions closer to 50%, but no individual run is guaranteed to land exactly there. This is a simulation, not a physical coin.</Text>
 </View>;
}

function PixelLab(){
 const {tokens}=useTheme();
 const [resolution,setResolution]=useState(8);
 const [shape,setShape]=useState(0);
 const [color,setColor]=useState(0);
 const mask=pixelMask(resolution,PIXEL_SHAPES[shape]);
 const cell=192/resolution;
 return <View style={s.panel}>
  <Text style={[s.title,{color:tokens.text}]}>The pixel art laboratory</Text>
  <Text style={{color:tokens.text}}>Make a tiny digital picture. Change its shape, color and resolution. The displayed picture stays the same size, but its pixel grid changes.</Text>
  <Choices values={PIXEL_RESOLUTIONS} selected={resolution} onChange={setResolution} labels={["8 × 8","16 × 16","32 × 32"]}/>
  <Choices values={[0,1,2]} selected={shape} onChange={setShape} labels={["Circle","Diamond","Heart"]}/>
  <Choices values={[0,1,2]} selected={color} onChange={setColor} labels={PIXEL_COLORS.map(c=>c.label)}/>
  <Svg width="100%" height={204} viewBox="0 0 204 204" accessibilityLabel={resolution+" by "+resolution+" pixel "+PIXEL_COLORS[color].label+" "+PIXEL_SHAPES[shape]}>
    <Rect x={6} y={6} width={192} height={192} fill="#f3f4f6"/>
    {mask.map((filled,i)=>filled?<Rect key={i} x={6+(i%resolution)*cell} y={6+Math.floor(i/resolution)*cell} width={cell} height={cell} fill={PIXEL_COLORS[color].value}/>:null)}
    {Array.from({length:resolution+1},(_,i)=><React.Fragment key={i}><Line x1={6+i*cell} x2={6+i*cell} y1={6} y2={198} stroke="#68717d" strokeOpacity={0.45} strokeWidth={0.5}/><Line x1={6} x2={198} y1={6+i*cell} y2={6+i*cell} stroke="#68717d" strokeOpacity={0.45} strokeWidth={0.5}/></React.Fragment>)}
  </Svg>
  <Text accessibilityLiveRegion="polite" style={[s.title,{color:tokens.text}]}>{resolution} × {resolution} = {resolution*resolution} pixels</Text>
  <Text style={{color:tokens.text}}>Each square stores a color. Doubling both dimensions gives four times as many pixels. More pixels can represent finer edges, although image quality also depends on the original image and compression.</Text>
 </View>;
}
function HarmonyLab(){
 const {tokens}=useTheme();
 const [root,setRoot]=useState(0);
 const [minor,setMinor]=useState(0);
 const notes=triad(root,minor===1);
 const white=[0,2,4,5,7,9,11,12];
 const black=[{key:1,x:27},{key:3,x:67},{key:6,x:147},{key:8,x:187},{key:10,x:227}];
 return <View style={s.panel}>
   <Text style={[s.title,{color:tokens.text}]}>Build a chord</Text>
   <Text style={{color:tokens.text}}>Choose the root and change the middle note by one semitone. Compare the major and minor triads on this visual keyboard.</Text>
   <Choices values={CHORD_ROOTS} selected={root} onChange={setRoot} labels={["C","D","F"]}/>
   <Choices values={[0,1]} selected={minor} onChange={setMinor} labels={["Major","Minor"]}/>
   <Svg width="100%" height={132} viewBox="0 0 320 132" accessibilityLabel={"Keyboard highlighting "+notes.map(n=>KEY_NOTES[n]).join(", ")}>
    {white.map((key,i)=><Rect key={key} x={i*40+1} y={3} width={38} height={126} rx={3} stroke="#374151" fill={notes.includes(key)?"#f5c76a":"#ffffff"}/>)}
    {black.map(({key,x})=><Rect key={key} x={x} y={3} width={26} height={77} rx={3} stroke="#374151" fill={notes.includes(key)?"#f5c76a":"#252b35"}/>)}
   </Svg>
   <Text accessibilityLiveRegion="polite" style={[s.title,{color:tokens.text}]}>{KEY_NOTES[root].slice(0,-1)} {minor?"minor":"major"}: {notes.map(n=>KEY_NOTES[n]).join(" · ")}</Text>
   <Text style={{color:tokens.text}}>Root to third: {minor?3:4} semitones · Root to fifth: 7 semitones.</Text>
   <Text style={{color:tokens.text}}>Frequencies (A4 = 440 Hz): {notes.map(n=>noteFrequency(n).toFixed(1)+" Hz").join(" · ")}</Text>
   <Text style={{color:tokens.text}}>Major and minor harmony can suggest different moods, but tempo, context and culture matter too.</Text>
   <HarmonyPlayback notes={notes}/>
 </View>;
}

function LabButton({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}){
 const {tokens}=useTheme();
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,{borderColor:tokens.border,backgroundColor:tokens.bg,opacity:disabled?0.5:1}]}><Text style={{color:tokens.text,fontWeight:"700"}}>{title}</Text></Pressable>;
}

function ShotOrderLab(){
 const {tokens}=useTheme();
 const [order,setOrder]=useState([0,1,2]);
 return <View style={s.panel}>
  <Text style={[s.title,{color:tokens.text}]}>Your editing room</Text>
  <Text style={{color:tokens.text}}>Rearrange these three original storyboard shots. The footage stays the same; its order changes.</Text>
  {order.map((id,i)=><View key={id} style={{borderWidth:1,borderColor:tokens.border,borderRadius:8,padding:10,gap:8}}>
    <Text style={{color:tokens.text,fontWeight:"700"}}>{i+1}. {STORY_SHOTS[id].label}</Text>
    <View style={s.row}>
     <LabButton title={"Move shot "+(i+1)+" earlier"} disabled={i===0} onPress={()=>setOrder(old=>moveShot(old,i,-1))}/>
     <LabButton title={"Move shot "+(i+1)+" later"} disabled={i===order.length-1} onPress={()=>setOrder(old=>moveShot(old,i,1))}/>
    </View>
  </View>)}
  <Text accessibilityLiveRegion="polite" style={{color:tokens.text}}>{shotReading(order)}</Text>
  <LabButton title="Reset shot order" onPress={()=>setOrder([0,1,2])}/>
  <Text style={{color:tokens.text}}>These are possible readings, not the only correct interpretations. Imagine what a different soundtrack would add.</Text>
 </View>;
}

function ViewpointLab(){
 const {tokens}=useTheme();
 const [index,setIndex]=useState(0);
 const selected=viewpoint(index);
 return <View style={s.panel}>
   <Text style={[s.title,{color:tokens.text}]}>Whose story is it?</Text>
   <Text style={{color:tokens.text}}>Read the same missed call through three different perspectives. Notice what the narrator allows you to know.</Text>
   <Choices values={[0,1,2]} selected={index} onChange={setIndex} labels={VIEWPOINTS.map(v=>v.label)}/>
   <Text style={{color:tokens.text,lineHeight:23}}>{selected.passage}</Text>
   <Text accessibilityLiveRegion="polite" style={{color:tokens.text,fontWeight:"700"}}>{selected.feedback}</Text>
   <Text style={{color:tokens.text}}>Try writing a fourth version from someone else's point of view in your own notes.</Text>
 </View>;
}
function PayoffLab(){
 const {tokens}=useTheme();
 const [setup,setSetup]=useState(0);
 const [ending,setEnding]=useState(0);
 const result=storyPayoff(setup,ending);
 return <View style={s.panel}>
  <Text style={[s.title,{color:tokens.text}]}>The story workshop</Text>
  <Text style={{color:tokens.text}}>Choose an ordinary detail to introduce at the beginning of a story. Then decide how it matters later.</Text>
  <Choices values={[0,1,2]} selected={setup} onChange={n=>{setSetup(n);setEnding(0);}} labels={SETUPS.map(v=>v.label)}/>
  <Choices values={[0,1]} selected={ending} onChange={setEnding} labels={["Payoff 1","Payoff 2"]}/>
  <Text style={{color:tokens.text,fontWeight:"700"}}>Setup: {result.setup}</Text>
  <Text style={{color:tokens.text}}>Payoff: {result.ending}</Text>
  <Text accessibilityLiveRegion="polite" style={{color:tokens.text}}>{result.feedback}</Text>
  <Text style={{color:tokens.text}}>Invent your own setup and payoff. Neither ending is automatically better: choose the one that fits your theme.</Text>
 </View>;
}
export default function DiscoveryLabs({discoveryId}:{discoveryId:string}){
 if(discoveryId==="tech-algorithm")return <RobotWorkshop/>;
 if(discoveryId==="music-mood")return <HarmonyLab/>;
 if(discoveryId==="writing-pov")return <ViewpointLab/>;
 if(discoveryId==="writing-payoff")return <PayoffLab/>;
 if(discoveryId==="math-chance")return <ProbabilityLab/>;
 if(discoveryId==="tech-pixels")return <PixelLab/>;
 if(discoveryId==="film-cut")return <EditingLab/>;
 if(discoveryId==="math-scale")return <ScaleLab/>;
 if(discoveryId==="art-depth")return <PerspectiveLab/>;
 return null;
}
const s=StyleSheet.create({panel:{gap:10},row:{flexDirection:"row",flexWrap:"wrap",gap:8},button:{padding:10,minHeight:44,borderWidth:1,borderRadius:10,justifyContent:"center"},title:{fontSize:17,fontWeight:"700"}});
