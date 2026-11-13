import AsyncStorage from "@react-native-async-storage/async-storage";
export type Certificate = { id:string; name:string; topic:string; score:number; total:number; earnedAt:number; style?:string };
const KEY="certificates_v1";
export async function saveCertificate(c:Certificate){
  const raw=(await AsyncStorage.getItem(KEY))||"[]";
  const arr:Certificate[]=JSON.parse(raw);
  const i=arr.findIndex(x=>x.id===c.id);
  if(i>=0) arr[i]=c; else arr.unshift(c);
  await AsyncStorage.setItem(KEY, JSON.stringify(arr.slice(0,200)));
}
export async function listCertificates(): Promise<Certificate[]>{
  const raw=(await AsyncStorage.getItem(KEY))||"[]";
  return JSON.parse(raw);
}

