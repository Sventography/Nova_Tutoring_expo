import { incrFlashSaved } from "../_lib/collectionsStats";
export async function recordFlashSave(by:number=1){ try{ await incrFlashSaved(by); }catch{} }
