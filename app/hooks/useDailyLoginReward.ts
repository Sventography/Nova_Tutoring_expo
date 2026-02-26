// app/hooks/useDailyLoginReward.ts
import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useCoins } from "../context/CoinsContext";
import { useUser } from "../context/UserContext";
import { showToast } from "../utils/toast";

const BASE_STORAGE_KEY = "@nova/dailyLoginReward.v1";

type StoredState = {
  lastAwardDate: string | null; // "YYYY-MM-DD"
  count: number; // how many daily rewards this user has received
};

function getTodayKey() {
  const now = new Date();
  // Use local date; streak logic already anchors to ET elsewhere if needed
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function useDailyLoginReward() {
  const { coins, setCoins } = useCoins();
  const { ready, supabaseUserId } = useUser() as any;

  const hasRunRef = useRef(false);

  useEffect(() => {
    // Wait until UserContext is hydrated so we can scope by user id
    if (!ready) return;
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const storageKey = supabaseUserId
      ? `${BASE_STORAGE_KEY}:${supabaseUserId}`
      : `${BASE_STORAGE_KEY}:guest`;

    const today = getTodayKey();

    (async () => {
      try {
        const raw = (await AsyncStorage.getItem(storageKey)) || "{}";
        let parsed: StoredState;
        try {
          parsed = JSON.parse(raw) as StoredState;
        } catch {
          parsed = { lastAwardDate: null, count: 0 };
        }

        const lastDate = parsed.lastAwardDate;
        const prevCount = typeof parsed.count === "number" ? parsed.count : 0;

        // Already awarded today → nothing to do
        if (lastDate === today) {
          return;
        }

        const nextCount = prevCount + 1;

        // Every 7th login day → 20 coins, otherwise 5
        const isSeventhDay = nextCount % 7 === 0;
        const reward = isSeventhDay ? 20 : 5;

        const currentCoins = coins ?? 0;
        const nextCoins = currentCoins + reward;

        // Update local coins
        await setCoins(nextCoins);

        // Persist new daily-login state
        const nextState: StoredState = {
          lastAwardDate: today,
          count: nextCount,
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(nextState));

        // Little friendly toast
        const msg = isSeventhDay
          ? "Daily login bonus: +20 coins!"
          : "Thanks for checking in today: +5 coins!";
        showToast(msg);
      } catch (err) {
        console.log("[useDailyLoginReward] error", err);
        // Failing silently is fine; we just skip the bonus if something breaks
      }
    })();
  }, [ready, supabaseUserId, coins, setCoins]);
}
