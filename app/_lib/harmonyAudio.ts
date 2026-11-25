// Original synthesized teaching tones. No recorded music or remote audio.
export const TONE_SAMPLE_RATE = 16000;
export const TONE_SECONDS = 0.8;
export function harmonyWave(keys: readonly number[]): Uint8Array {
 if(keys.length<1||keys.length>3||new Set(keys).size!==keys.length||!keys.every(k=>Number.isInteger(k)&&k>=0&&k<=12))throw new Error("Invalid tone keys");
 const samples=Math.round(TONE_SAMPLE_RATE*TONE_SECONDS);
 const bytes=new Uint8Array(44+samples*2);
 const view=new DataView(bytes.buffer);
 const tag=(at:number,s:string)=>{for(let i=0;i<s.length;i++)bytes[at+i]=s.charCodeAt(i);};
 tag(0,"RIFF");view.setUint32(4,bytes.length-8,true);tag(8,"WAVE");
 tag(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);
 view.setUint16(22,1,true);view.setUint32(24,TONE_SAMPLE_RATE,true);
 view.setUint32(28,TONE_SAMPLE_RATE*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
 tag(36,"data");view.setUint32(40,samples*2,true);
 const frequencies=keys.map(k=>440*Math.pow(2,(k-9)/12));
 for(let i=0;i<samples;i++){
  const t=i/TONE_SAMPLE_RATE;
  const attack=Math.min(1,t/0.025);
  const release=Math.min(1,(samples-1-i)/(TONE_SAMPLE_RATE*0.10));
  const value=frequencies.reduce((sum,f)=>sum+Math.sin(2*Math.PI*f*t),0)/frequencies.length;
  view.setInt16(44+i*2,Math.round(32767*0.18*attack*release*value),true);
 }
 return bytes;
}
export function waveBase64(bytes: Uint8Array): string {
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
 let result="";
 for(let i=0;i<bytes.length;i+=3){
  const x=bytes[i],y=bytes[i+1]??0,z=bytes[i+2]??0;
  result+=alphabet[x>>2]+alphabet[((x&3)<<4)|(y>>4)]+(i+1<bytes.length?alphabet[((y&15)<<2)|(z>>6)]:"=")+(i+2<bytes.length?alphabet[z&63]:"=");
 }
 return result;
}
