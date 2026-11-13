// app/hooks/useLegendaryCompanions.ts

import { useCallback, useMemo } from "react";

import { canonId } from "../_lib/canonId";
import { useCompanion } from "../context/CompanionContext";

export const LEGENDARY_IDS = {
  mechaOwl: canonId("companion:mecha_owl"),
  chronoFox: canonId("companion:chrono_fox"),
  celestra: canonId("companion:celestra"),
  axolotlOracle: canonId("companion:axolotl_oracle"),
  astralNova: canonId("companion:astral_nova"),
  aetherwyrm: canonId("companion:aetherwyrm"),
} as const;

export type LegendaryRewardType =
  | "standard"
  | "quiz_correct"
  | "achievement"
  | "streak_achievement"
  | "streak_milestone"
  | "certificate"
  | "brainteaser"
  | "brainteaser_perfect";

export type LegendaryRewardResult = {
  baseCoins: number;
  specialistBonus: number;
  aetherwyrmBonus: number;
  totalCoins: number;
  appliedCompanions: string[];
};

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function safeCoins(value: unknown): number {
  const amount = Math.round(Number(value));

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(0, amount);
}

export function useLegendaryCompanions() {
  const {
    ownedCompanions,
    ready,
  } = useCompanion();

  const ownedTokens = useMemo(() => {
    const tokens = new Set<string>();

    for (const rawId of ownedCompanions || []) {
      const canonicalId = canonId(String(rawId || ""));

      tokens.add(normalizeToken(rawId));
      tokens.add(normalizeToken(canonicalId));
    }

    return tokens;
  }, [ownedCompanions]);

  const owns = useCallback(
    (id: string): boolean => {
      const canonicalId = canonId(id);

      return (
        ownedTokens.has(normalizeToken(id)) ||
        ownedTokens.has(normalizeToken(canonicalId))
      );
    },
    [ownedTokens]
  );

  const hasMechaOwl = owns(LEGENDARY_IDS.mechaOwl);
  const hasChronoFox = owns(LEGENDARY_IDS.chronoFox);
  const hasCelestra = owns(LEGENDARY_IDS.celestra);
  const hasAxolotlOracle = owns(LEGENDARY_IDS.axolotlOracle);
  const hasAstralNova = owns(LEGENDARY_IDS.astralNova);
  const hasAetherwyrm = owns(LEGENDARY_IDS.aetherwyrm);

  const ownedLegendaryIds = useMemo(
    () =>
      Object.values(LEGENDARY_IDS).filter((id) =>
        owns(id)
      ),
    [owns]
  );

  const ownedLegendaryTokens = useMemo(
    () =>
      ownedLegendaryIds.map((id) =>
        normalizeToken(id)
      ),
    [ownedLegendaryIds]
  );

  const calculateCoinReward = useCallback(
    (
      baseValue: number,
      rewardType: LegendaryRewardType
    ): LegendaryRewardResult => {
      const baseCoins = safeCoins(baseValue);

      let amount = baseCoins;
      let specialistBonus = 0;
      let aetherwyrmBonus = 0;

      const appliedCompanions: string[] = [];

      const markApplied = (id: string) => {
        if (!appliedCompanions.includes(id)) {
          appliedCompanions.push(id);
        }
      };

      const applyPercentBonus = (
        percent: number,
        companionId: string
      ) => {
        if (amount <= 0) {
          return;
        }

        const nextAmount = Math.round(
          amount * (1 + percent)
        );

        specialistBonus += nextAmount - amount;
        amount = nextAmount;
        markApplied(companionId);
      };

      const isAchievement =
        rewardType === "achievement" ||
        rewardType === "streak_achievement";

      const isStreakReward =
        rewardType === "streak_achievement" ||
        rewardType === "streak_milestone";

      const isBrainteaser =
        rewardType === "brainteaser" ||
        rewardType === "brainteaser_perfect";

      /*
       * Astral Nova:
       * - Certificate reward: +500 flat coins.
       * - Perfect brainteaser pair: +5 flat coins.
       * - All brainteaser rewards: +50%.
       */
      if (
        rewardType === "certificate" &&
        hasAstralNova
      ) {
        amount += 500;
        specialistBonus += 500;
        markApplied(LEGENDARY_IDS.astralNova);
      }

      if (
        rewardType === "brainteaser_perfect" &&
        hasAstralNova
      ) {
        amount += 5;
        specialistBonus += 5;
        markApplied(LEGENDARY_IDS.astralNova);
      }

      if (isBrainteaser && hasAstralNova) {
        applyPercentBonus(
          0.5,
          LEGENDARY_IDS.astralNova
        );
      }

      /*
       * Mecha Owl:
       * +10% achievement rewards.
       */
      if (isAchievement && hasMechaOwl) {
        applyPercentBonus(
          0.1,
          LEGENDARY_IDS.mechaOwl
        );
      }

      /*
       * Celestra:
       * +25% streak rewards.
       */
      if (isStreakReward && hasCelestra) {
        applyPercentBonus(
          0.25,
          LEGENDARY_IDS.celestra
        );
      }

      /*
       * Aetherwyrm:
       * +20% after specialist bonuses.
       */
      if (hasAetherwyrm && amount > 0) {
        const nextAmount = Math.round(
          amount * 1.2
        );

        aetherwyrmBonus = nextAmount - amount;
        amount = nextAmount;
        markApplied(LEGENDARY_IDS.aetherwyrm);
      }

      return {
        baseCoins,
        specialistBonus,
        aetherwyrmBonus,
        totalCoins: amount,
        appliedCompanions,
      };
    },
    [
      hasMechaOwl,
      hasCelestra,
      hasAstralNova,
      hasAetherwyrm,
    ]
  );

  return {
    ready,

    ownedLegendaryIds,
    ownedLegendaryTokens,

    hasMechaOwl,
    hasChronoFox,
    hasCelestra,
    hasAxolotlOracle,
    hasAstralNova,
    hasAetherwyrm,

    chronoExtraMinutes: hasChronoFox ? 2 : 0,
    chronoExtraSeconds: hasChronoFox ? 120 : 0,
    astralCertificateBaseBonus:
      hasAstralNova ? 500 : 0,
    axolotlCooldownDays:
      hasAxolotlOracle ? 7 : 0,

    calculateCoinReward,
  };
}
