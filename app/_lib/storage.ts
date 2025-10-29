import AsyncStorage from "@react-native-async-storage/async-storage";
export type CertificateMeta={id:string;topic:string;score:number;correct:number;total:number;createdAt:string;};
const CERTS_KEY="@certificates:v1",ACHIEVE_KEY="@achievements:v1";
export async function saveCertificate(meta:CertificateMeta){const raw=(await AsyncStorage.getItem(CERTS_KEY))||"[]";const arr=JSON.parse(raw) as CertificateMeta[];arr.unshift(meta);await AsyncStorage.setItem(CERTS_KEY,JSON.stringify(arr));}
export async function bumpAchievement(topic:string,score:number){const raw=(await AsyncStorage.getItem(ACHIEVE_KEY))||"{}";const obj=JSON.parse(raw) as Record<string,{best:number;count:number}>;const rec=obj[topic]||{best:0,count:0};rec.best=Math.max(rec.best,score);rec.count+=1;obj[topic]=rec;await AsyncStorage.setItem(ACHIEVE_KEY,JSON.stringify(obj));}
