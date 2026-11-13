import AsyncStorage from "@react-native-async-storage/async-storage";

type CoinsHook = { addCoins?: (n: number)=>void } | null | undefined;
type ToastHook = { show?: (msg: string)=>void, success?: (msg: string)=>void, warn?: (msg: string)=>void } | null | undefined;

function useCoinsSafe(): CoinsHook {
  try { return require("../context/CoinsContext").useCoins?.(); } catch { return null; }
}
function useToastSafe(): ToastHook {
  try { return require("../context/ToastContext").useToast?.(); } catch { return null; }
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `riddles:${y}-${m}-${day}:count`;
}

export function useBrainTeaserRewards() {
  const coins = useCoinsSafe();
  const toast = useToastSafe();

  async function canAttemptToday(maxPerDay = 2): Promise<boolean> {
    const key = todayKey();
    const raw = await AsyncStorage.getItem(key);
    const n = raw ? parseInt(raw,10) : 0;
    return n < maxPerDay;
  }

  async function markAttempt() {
    const key = todayKey();
    const raw = await AsyncStorage.getItem(key);
    const n = raw ? parseInt(raw,10) : 0;
    await AsyncStorage.setItem(key, String(n+1));
  }

  async function rewardCorrectAnswer() {
    coins?.addCoins?.(2);
    toast?.success?.("Nice! +2 coins");
  }

  async function rewardBonusIfAllCorrect(allCorrect: boolean) {
    if (allCorrect) {
      coins?.addCoins?.(10);
      toast?.success?.("Perfect run! +10 bonus");
    }
  }

  function showCapReached() {
    (toast?.warn ?? toast?.show)?.("You’ve done today’s 2 riddles. Come back tomorrow! ✨");
  }

  return { canAttemptToday, markAttempt, rewardCorrectAnswer, rewardBonusIfAllCorrect, showCapReached };
}
