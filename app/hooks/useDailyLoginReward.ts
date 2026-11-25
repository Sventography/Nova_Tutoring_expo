// app/hooks/useDailyLoginReward.ts
import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useCoins } from "../context/CoinsContext";
import { useUser } from "../context/UserContext";
import { showToast } from "../utils/toast";

const GUEST_KEY = "@nova/dailyLoginReward.v1:guest";
type StoredState = { lastAwardDate: string | null; count: number };
function getTodayKey() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2,"0"), String(now.getDate()).padStart(2,"0")].join("-");
}

export default function useDailyLoginReward() {
  const wallet = useCoins();
  const { ready, supabaseUserId } = useUser() as any;
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  const completedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !wallet.ready) return;
    const owner = supabaseUserId ?? "guest";
    if (completedRef.current === owner) return;
    let cancelled = false;
    const run = async () => {
      try {
        if (supabaseUserId) {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || cancelled || sessionData.session?.user?.id !== supabaseUserId) return;
          const { data, error } = await supabase.rpc("nova_claim_daily_login");
          if (error) throw error;
          if (cancelled) return;
          completedRef.current = owner;
          const amount = Number(data?.coins_awarded);
          if (data?.awarded === true && (amount === 5 || amount === 20)) {
            showToast(amount === 20 ? "Daily login bonus: +20 coins!" : "Thanks for checking in today: +5 coins!");
          }
          await walletRef.current.refreshCoins();
          return;
        }
        const raw = await AsyncStorage.getItem(GUEST_KEY);
        let stored: StoredState = { lastAwardDate: null, count: 0 };
        try { if (raw) stored = JSON.parse(raw) ?? stored; } catch {}
        if (cancelled) return;
        const today = getTodayKey();
        if (stored.lastAwardDate === today) { completedRef.current = owner; return; }
        const count = (Number.isSafeInteger(stored.count) && stored.count >= 0 ? stored.count : 0) + 1;
        const reward = count % 7 === 0 ? 20 : 5;
        await walletRef.current.setCoins(previous => previous + reward);
        if (cancelled) return;
        await AsyncStorage.setItem(GUEST_KEY, JSON.stringify({lastAwardDate:today,count}));
        if (cancelled) return;
        completedRef.current = owner;
        showToast(reward === 20 ? "Daily login bonus: +20 coins!" : "Thanks for checking in today: +5 coins!");
      } catch (error) { console.warn("[useDailyLoginReward] reward unavailable:", error); }
    };
    void run();
    return () => { cancelled = true; };
  }, [ready, supabaseUserId, wallet.ready]);
}
