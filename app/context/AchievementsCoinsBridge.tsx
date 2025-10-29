import React, { useEffect } from "react";
import { AchieveEmitter, ACHIEVEMENT_EVENT } from "./AchievementsContext";
import { useCoins } from "./CoinsContext";
import { DeviceEventEmitter } from "react-native";

const AWARDS: Record<string, number> = {
  daily_login_1: 25,
  streak_7: 100,
  streak_30: 300,
  quiz_score_80: 100,
  quiz_fast_120: 75,
  quiz_fast_60: 125,
  flashcards_saved_10: 50,
  flashcards_saved_50: 150,
  flashcards_saved_100: 400,
  flashcards_created_10: 50,
  flashcards_created_50: 200,
  first_voice_input: 25,
  voice_25: 75,
  ask_50: 100,
  ask_100: 250,
  brainteaser_solved_1: 25,
  brainteaser_solved_10: 150,
  brainteaser_solved_50: 600
};

export default function AchievementsCoinsBridge() {
  const coinsApi = (() => { try { return useCoins(); } catch { return null as any; } })();

  useEffect(() => {
    const award = (amt: number, reason: string) => {
      if (!coinsApi) return;
      const addFn =
        (coinsApi as any).addCoins ||
        (coinsApi as any).grantCoins ||
        (coinsApi as any).add ||
        (coinsApi as any).credit;

      try {
        if (typeof addFn === "function") {
          addFn.call(coinsApi, amt, reason);
        } else if (typeof (coinsApi as any).setCoins === "function" && Number.isFinite((coinsApi as any).coins)) {
          (coinsApi as any).setCoins(((coinsApi as any).coins || 0) + amt);
        }
      } catch {}

      try { AchieveEmitter.emit("celebrate", `💎 +${amt}c — ${reason}`); } catch {}
    };

    const onUnlock = (p?: any) => {
      const id = p?.id || p?.achievementId || p?.key || (typeof p === "string" ? p : undefined);
      if (!id) return;
      const amt = AWARDS[id] ?? 25;
      award(amt, `achievement:${id}`);
    };

    const onCoinsAward = (p?: any) => {
      const amt = Number(p?.amount ?? p?.coins ?? 0);
      const reason = String(p?.reason ?? "manual");
      if (amt > 0) award(amt, `event:${reason}`);
    };

    const onBrainteaserSolved = (p?: any) => {
      const count = Number(p?.count ?? p?.total ?? 1);
      award(25, "brainteaser:solve");
      if (count >= 50) AchieveEmitter.emit(ACHIEVEMENT_EVENT, { id: "brainteaser_solved_50" });
      else if (count >= 10) AchieveEmitter.emit(ACHIEVEMENT_EVENT, { id: "brainteaser_solved_10" });
      else AchieveEmitter.emit(ACHIEVEMENT_EVENT, { id: "brainteaser_solved_1" });
    };

    const subs = [
      AchieveEmitter.addListener(ACHIEVEMENT_EVENT, onUnlock),
      DeviceEventEmitter.addListener("unlock", onUnlock),
      DeviceEventEmitter.addListener("achieve:unlock", onUnlock),
      DeviceEventEmitter.addListener("coins:award", onCoinsAward),
      DeviceEventEmitter.addListener("brainteasers:solved", onBrainteaserSolved),
    ];
    return () => subs.forEach(s => { try { (s as any)?.remove?.(); } catch {} });
  }, [coinsApi?.addCoins, (coinsApi as any)?.grantCoins, (coinsApi as any)?.setCoins, (coinsApi as any)?.coins]);

  return null;
}
