import { useEffect, useRef } from "react";
function useCoinsSafe(){ try{ return require("../context/CoinsContext").useCoins?.(); }catch{ return null; } }
function useUserSafe(){ try{ return require("../context/UserContext").useUser?.(); }catch{ return null; } }
export default function CoinsMirror(){
  const coinsCtx = useCoinsSafe(); const userCtx = useUserSafe();
  const last = useRef<number | null>(null);
  useEffect(() => {
    const coins = coinsCtx?.coins ?? null;
    const u = userCtx?.user ?? null;
    if (coins == null || !u?.id) return;
    if (coins === last.current) return;
    last.current = coins;
    import("../services/leaderboard").then(({ lbUpsert }) => {
      lbUpsert({ user_id: u.id, display_name: u.name || "Nova Student", avatar_url: u.avatar, coins: Number(coins)||0 })
        .catch(()=>{});
    });
  }, [coinsCtx?.coins, userCtx?.user?.id, userCtx?.user?.name, userCtx?.user?.avatar]);
  return null;
}
