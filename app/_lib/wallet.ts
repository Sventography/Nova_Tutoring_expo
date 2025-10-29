import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY="coins:balance:v1";
export async function getWallet(){ const raw=await AsyncStorage.getItem(KEY); const n=Number(raw); return Number.isFinite(n)?n:0; }
export async function addCoins(n:number){ const cur=await getWallet(); const next=Math.max(0,cur+Math.max(0,Math.floor(n||0))); await AsyncStorage.setItem(KEY,String(next)); return next; }
export default { getWallet, addCoins };
