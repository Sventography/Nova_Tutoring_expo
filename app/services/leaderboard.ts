import { supabase } from "./supabase";
export async function lbUpsert(p:{user_id:string;display_name:string;avatar_url?:string;coins:number}) {
  return await supabase.from("coins_leaderboard").upsert(p, { onConflict: "user_id" });
}
export async function lbTop(limit=50){
  return await supabase.from("coins_leaderboard")
    .select("user_id, display_name, avatar_url, coins")
    .order("coins", { ascending:false })
    .limit(limit);
}
