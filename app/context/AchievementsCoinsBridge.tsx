import React, { useEffect } from "react";
import { AchieveEmitter, ACHIEVEMENT_EVENT } from "./AchievementsContext";
import { useCoins } from "./CoinsContext";
import { DeviceEventEmitter } from "react-native";

// 🔹 Coin rewards per achievement id
// (1 coin = 0.001 USD in your shop)
const AWARDS: Record<string, number> = {
  // Onboarding
  first_login: 25,
  set_avatar: 25,

  // Streaks (these match streak_{d} ids from ACHIEVEMENTS)
  streak_7: 100,
  streak_30: 300,

  // Quiz performance (global)
  quiz_80: 100,
  quiz_100: 250,

  // Quiz volume
  quiz_taken_1: 25,
  quiz_taken_5: 40,
  quiz_taken_10: 60,

  // Voice / ask / brainteasers / shop can be expanded later
  first_voice_input: 25,
  voice_25: 75,
  ask_50: 100,
  ask_100: 250,
  brain_pair_1: 25,
  brain_pair_10: 150,
  brain_pair_50: 600,
};

export default function AchievementsCoinsBridge() {
  const coinsApi = (() => {
    try {
      return useCoins();
    } catch {
      return null as any;
    }
  })();

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
        } else if (
          typeof (coinsApi as any).setCoins === "function" &&
          Number.isFinite((coinsApi as any).coins)
        ) {
          (coinsApi as any).setCoins(((coinsApi as any).coins || 0) + amt);
        }
      } catch {}

      try {
        AchieveEmitter.emit("celebrate", `💎 +${amt} coins — ${reason}`);
      } catch {}
    };

    const onUnlock = (p?: any) => {
      const id =
        p?.id ||
        p?.achievementId ||
        p?.key ||
        (typeof p === "string" ? p : undefined);
      if (!id) return;

      const amt = AWARDS[id] ?? 25; // default 25 coins if not mapped
      if (amt > 0) {
        award(amt, `achievement:${id}`);
      }
    };

    const onCoinsAward = (p?: any) => {
      const amt = Number(p?.amount ?? p?.coins ?? 0);
      const reason = String(p?.reason ?? "manual");
      if (amt > 0) award(amt, `event:${reason}`);
    };

    const onBrainteaserSolved = (p?: any) => {
      const count = Number(p?.count ?? p?.total ?? 1);
      award(25, "brainteaser:solve");
      if (count >= 50)
        AchieveEmitter.emit(ACHIEVEMENT_EVENT, {
          id: "brain_pair_50",
        });
      else if (count >= 10)
        AchieveEmitter.emit(ACHIEVEMENT_EVENT, {
          id: "brain_pair_10",
        });
      else
        AchieveEmitter.emit(ACHIEVEMENT_EVENT, {
          id: "brain_pair_1",
        });
    };

    const subs = [
      AchieveEmitter.addListener(ACHIEVEMENT_EVENT, onUnlock),
      DeviceEventEmitter.addListener("unlock", onUnlock),
      DeviceEventEmitter.addListener("achieve:unlock", onUnlock),
      DeviceEventEmitter.addListener("coins:award", onCoinsAward),
      DeviceEventEmitter.addListener(
        "brainteasers:solved",
        onBrainteaserSolved
      ),
    ];
    return () =>
      subs.forEach((s) => {
        try {
          (s as any)?.remove?.();
        } catch {}
      });
  }, [
    coinsApi?.addCoins,
    (coinsApi as any)?.grantCoins,
    (coinsApi as any)?.setCoins,
    (coinsApi as any)?.coins,
  ]);

  return null;
}
