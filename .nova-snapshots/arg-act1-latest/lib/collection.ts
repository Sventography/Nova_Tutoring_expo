import AsyncStorage from "@react-native-async-storage/async-storage";
export type SavedCard={id:string;topic:string;front:string;back:string};
const KEY="collection:v1";
export async function getCollection():Promise<SavedCard[]>{try{const v=await AsyncStorage.getItem(KEY);return v?JSON.parse(v):[]}catch{return[]}}
export async function setCollection(arr:SavedCard[]){await AsyncStorage.setItem(KEY,JSON.stringify(arr))}
export async function saveToCollectionWithEvent(card:{topic:string;front:string;back:string}){const item:SavedCard={id:String(Date.now()),...card};const arr=await getCollection();arr.unshift(item);await setCollection(arr);return item}
export async function removeFromCollection(id:string){const next=(await getCollection()).filter(x=>x.id!==id);await setCollection(next)}
