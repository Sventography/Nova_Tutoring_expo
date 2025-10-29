import * as FileSystem from "expo-file-system";
import { api } from "./api";
export async function uploadAudio(uri:string){
  const info: any = await FileSystem.getInfoAsync(uri);
  const payload = { uri, size: info && info.size ? info.size : 0 };
  await api("/voice", { method:"POST", body: JSON.stringify(payload) });
  return { ok:true };
}
