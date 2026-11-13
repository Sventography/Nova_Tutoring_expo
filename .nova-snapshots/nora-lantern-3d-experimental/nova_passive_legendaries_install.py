#!/usr/bin/env python3
# Nova Tutoring passive legendary installer.
#
# Run from the project root:
#   python3 nova_passive_legendaries_install.py
#
# It creates timestamped backups, creates the shared hook, and patches the
# current complete quiz, achievements, brainteasers, and streak files.

from __future__ import annotations

import re
import shutil
import sys
from datetime import datetime
from pathlib import Path


ROOT = Path.cwd()

HOOK_PATH = ROOT / "app/hooks/useLegendaryCompanions.ts"
QUIZ_PATH = ROOT / "app/(tabs)/quiz/[topic].tsx"
ACHIEVEMENTS_PATH = ROOT / "app/context/AchievementsContext.tsx"
BRAINTEASERS_PATH = ROOT / "app/(tabs)/brainteasers.tsx"
STREAK_PATH = ROOT / "app/context/StreakContext.tsx"

TARGETS = [
    QUIZ_PATH,
    ACHIEVEMENTS_PATH,
    BRAINTEASERS_PATH,
    STREAK_PATH,
]

HOOK_SOURCE = r'''// app/hooks/useLegendaryCompanions.ts

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
'''


class PatchError(RuntimeError):
    pass


def read(path: Path) -> str:
    if not path.exists():
        raise PatchError(f"Required file was not found: {path}")
    return path.read_text(encoding="utf-8")


def replace_once(
    text: str,
    old: str,
    new: str,
    label: str,
    *,
    already_marker: str | None = None,
) -> str:
    if old in text:
        return text.replace(old, new, 1)

    if already_marker and already_marker in text:
        return text

    raise PatchError(f"Could not locate {label}.")


def regex_replace_once(
    text: str,
    pattern: str,
    replacement: str,
    label: str,
    *,
    already_marker: str | None = None,
) -> str:
    match = re.search(pattern, text, flags=re.DOTALL)

    if match:
        return (
            text[: match.start()]
            + replacement
            + text[match.end() :]
        )

    if already_marker and already_marker in text:
        return text

    raise PatchError(f"Could not locate {label}.")


def patch_quiz(text: str) -> str:
    if 'from "../../hooks/useLegendaryCompanions"' not in text:
        text = replace_once(
            text,
            'import { useCompanion } from "../../context/CompanionContext";',
            'import { useLegendaryCompanions } from "../../hooks/useLegendaryCompanions";',
            "the quiz CompanionContext import",
        )

    legendary_block = '''  const {
    hasChronoFox,
    hasAstralNova,
    chronoExtraMinutes,
    calculateCoinReward,
  } = useLegendaryCompanions();

  const certificateReward = useMemo(
    () =>
      calculateCoinReward(
        0,
        "certificate"
      ),
    [calculateCoinReward]
  );

  const astralCertificateBonus =
    certificateReward.totalCoins;

  const quizTotalTime = useMemo(
    () =>
      BASE_TOTAL_TIME +
      Math.round(
        chronoExtraMinutes * 60
      ),
    [chronoExtraMinutes]
  );

'''

    text = regex_replace_once(
        text,
        r'''  const \{\s*activeCompanion\s*\} = useCompanion\(\);\n.*?(?=  const \[loading, setLoading\])''',
        legendary_block,
        "the quiz equipped-companion legendary block",
        already_marker="const certificateReward = useMemo(",
    )

    old_correct_reward = '''        void addCoins(5, "quiz_correct", {
          topicId: String(id),
          questionIndex: idx,
          question: current.question,
        });'''

    new_correct_reward = '''        const reward =
          calculateCoinReward(
            5,
            "quiz_correct"
          );

        void addCoins(
          reward.totalCoins,
          "quiz_correct",
          {
            topicId: String(id),
            questionIndex: idx,
            question:
              current.question,
            baseCoins:
              reward.baseCoins,
            specialistBonus:
              reward.specialistBonus,
            aetherwyrmBonus:
              reward.aetherwyrmBonus,
            appliedCompanions:
              reward.appliedCompanions,
          }
        );'''

    text = replace_once(
        text,
        old_correct_reward,
        new_correct_reward,
        "the quiz correct-answer coin award",
        already_marker='"quiz_correct"\n          );',
    )

    old_toast = '''        showToast({
          title: "+5 coins",
          message: "Correct answer!",
          type: "success",
          icon: "🪙",
        });'''

    new_toast = '''        showToast({
          title: `+${reward.totalCoins} coins`,
          message:
            reward.aetherwyrmBonus > 0
              ? `Correct answer! Aetherwyrm added +${reward.aetherwyrmBonus}.`
              : "Correct answer!",
          type: "success",
          icon: "🪙",
        });'''

    text = replace_once(
        text,
        old_toast,
        new_toast,
        "the quiz correct-answer toast",
        already_marker="Aetherwyrm added +${reward.aetherwyrmBonus}",
    )

    new_certificate_call = '''          await addCoins(
            certificateReward.totalCoins,
            "astral_nova_certificate_bonus",
            {
              topicId,
              title: headerTitle,
              percent: pct,
              baseCoins:
                certificateReward.baseCoins,
              specialistBonus:
                certificateReward.specialistBonus,
              aetherwyrmBonus:
                certificateReward.aetherwyrmBonus,
              appliedCompanions:
                certificateReward.appliedCompanions,
            }
          );'''

    if "certificateReward.appliedCompanions" not in text:
        text = regex_replace_once(
            text,
            r'''          await addCoins\(\s*astralCertificateBonus,\s*"astral_nova_certificate_bonus",\s*\{\s*topicId,\s*title: headerTitle,\s*percent: pct,.*?\s*\}\s*\);''',
            new_certificate_call,
            "the Astral Nova certificate award",
        )

    text = replace_once(
        text,
        '''          setLegendaryNotice(
            `Astral Nova awakened · +${astralCertificateBonus} bonus coins`
          );''',
        '''          setLegendaryNotice(
            certificateReward.aetherwyrmBonus > 0
              ? `Astral Nova awakened · +${certificateReward.totalCoins} coins with Aetherwyrm`
              : `Astral Nova awakened · +${certificateReward.totalCoins} bonus coins`
          );''',
        "the Astral Nova result notice",
        already_marker="coins with Aetherwyrm",
    )

    text = replace_once(
        text,
        '''              message: `Certificate bonus: +${astralCertificateBonus} coins`,''',
        '''              message: `Certificate bonus: +${certificateReward.totalCoins} coins`,''',
        "the Astral Nova certificate toast",
        already_marker="Certificate bonus: +${certificateReward.totalCoins}",
    )

    text = text.replace(
        '''    activeCompanion?.id,
    activeAbilityType,
''',
        '''    certificateReward,
''',
        1,
    )

    return text


def patch_achievements(text: str) -> str:
    if 'from "../hooks/useLegendaryCompanions"' not in text:
        text = replace_once(
            text,
            'import { useCompanion } from "./CompanionContext";',
            'import { useLegendaryCompanions } from "../hooks/useLegendaryCompanions";',
            "the achievements CompanionContext import",
        )

    text = text.replace(
        'import { canonId } from "../_lib/canonId";\n',
        "",
        1,
    )

    text = regex_replace_once(
        text,
        r'''  const \{[^}]*activeCompanionId[^}]*\} = useCompanion\(\);\n''',
        '''  const {
    calculateCoinReward,
  } = useLegendaryCompanions();
''',
        "the achievements companion hook call",
        already_marker="} = useLegendaryCompanions();",
    )

    reward_helper = '''  // All owned legendary companion powers remain active passively.
  const computeAchievementReward =
    useCallback(
      (
        base: number,
        id: string
      ) => {
        const rewardType =
          ACH_MAP[id]?.group ===
          "streaks"
            ? "streak_achievement"
            : "achievement";

        return calculateCoinReward(
          base,
          rewardType
        );
      },
      [calculateCoinReward]
    );

'''

    text = regex_replace_once(
        text,
        r'''  // Active companion(?: and ability\.| & legendary flags).*?(?=  // ─────────────── HYDRATE PER USER)''',
        reward_helper,
        "the achievements equipped-companion calculation block",
        already_marker="const computeAchievementReward",
    )

    reward_block = '''            const base =
              ach.coins;

            const reward =
              computeAchievementReward(
                base,
                id
              );

            coinsAwarded =
              reward.totalCoins;

            if (coinsAwarded > 0) {
              console.log(
                "[Achievements] awarding coins",
                coinsAwarded,
                "for",
                id
              );

              void addCoins(
                coinsAwarded,
                "achievement",
                {
                  achievementId:
                    id,
                  baseCoins:
                    reward.baseCoins,
                  specialistBonus:
                    reward.specialistBonus,
                  aetherwyrmBonus:
                    reward.aetherwyrmBonus,
                  awardedCoins:
                    reward.totalCoins,
                  appliedCompanions:
                    reward.appliedCompanions,
                }
              );
            }'''

    text = regex_replace_once(
        text,
        r'''            const base = ach\.coins;\s*coinsAwarded = computeAchievementCoins\(base, id\);\s*if \(coinsAwarded > 0\) \{.*?              \}\);\s*            \}''',
        reward_block,
        "the achievement coin-award block",
        already_marker="reward.appliedCompanions",
    )

    text = text.replace(
        "computeAchievementCoins",
        "computeAchievementReward",
    )

    return text


def patch_brainteasers(text: str) -> str:
    if 'from "../hooks/useLegendaryCompanions"' not in text:
        text = replace_once(
            text,
            'import { useCompanion } from "../context/CompanionContext";',
            'import { useLegendaryCompanions } from "../hooks/useLegendaryCompanions";',
            "the brainteasers CompanionContext import",
        )

    replacement = '''  const {
    calculateCoinReward,
  } = useLegendaryCompanions();
  const { addIslandXp } =
    useIsland();

'''

    text = regex_replace_once(
        text,
        r'''  const \{ activeCompanionId \} = useCompanion\(\);\n  const \{ addIslandXp \} = useIsland\(\);\n.*?(?=  const pairRef)''',
        replacement,
        "the brainteasers equipped-companion reward block",
        already_marker="} = useLegendaryCompanions();",
    )

    if "canonId(" not in text:
        text = text.replace(
            'import { canonId } from "../_lib/canonId";\n',
            "",
            1,
        )

    text = replace_once(
        text,
        '''      const baseReward = 2;
      const reward = applyBrainteaserCoins(baseReward);
      coins?.addCoins?.(reward);
      const label = `Correct! +${reward} coins`;''',
        '''      const reward =
        calculateCoinReward(
          2,
          "brainteaser"
        );

      coins?.addCoins?.(
        reward.totalCoins
      );

      const label =
        `Correct! +${reward.totalCoins} coins`;''',
        "the brainteaser correct-answer award",
        already_marker='"brainteaser"\n        );',
    )

    text = replace_once(
        text,
        '''          const baseBonus = 10;
          let bonus = baseBonus;

          // Astral Nova: extra flat +5 on perfect pair before multipliers
          if (hasAstralNova) {
            bonus += 5;
          }

          bonus = applyBrainteaserCoins(bonus);

          coins?.addCoins?.(bonus);
          await AsyncStorage.setItem(STORAGE_BONUS, "1");
          const label = `Perfect! +${bonus} bonus`;''',
        '''          const reward =
            calculateCoinReward(
              10,
              "brainteaser_perfect"
            );

          coins?.addCoins?.(
            reward.totalCoins
          );

          await AsyncStorage.setItem(
            STORAGE_BONUS,
            "1"
          );

          const label =
            `Perfect! +${reward.totalCoins} bonus`;''',
        "the perfect brainteaser-pair award",
        already_marker='"brainteaser_perfect"',
    )

    return text


def patch_streak(text: str) -> str:
    if 'from "../hooks/useLegendaryCompanions"' not in text:
        text = replace_once(
            text,
            'import { useCompanion } from "./CompanionContext";',
            'import { useLegendaryCompanions } from "../hooks/useLegendaryCompanions";',
            "the streak CompanionContext import",
        )

    text = regex_replace_once(
        text,
        r'''  const \{\s*activeCompanionId,\s*activeCompanion,\s*\} = useCompanion\(\);\n''',
        '''  const {
    hasAxolotlOracle:
      hasAxolotl,
    ownedLegendaryTokens,
  } = useLegendaryCompanions();
''',
        "the streak companion hook call",
        already_marker="ownedLegendaryTokens",
    )

    text = regex_replace_once(
        text,
        r'''  const activeCompanionToken =\s*useMemo\(.*?(?=  const hydrate = useCallback)''',
        '''  /*
   * Keep the old debug field names so the existing hidden
   * development test screen continues to work.
   */
  const activeCompanionToken =
    ownedLegendaryTokens.join("|");

  const activeAbilityType =
    hasAxolotl
      ? "streak_shield"
      : null;

''',
        "the streak equipped-Axolotl detection block",
        already_marker="ownedLegendaryTokens.join",
    )

    return text


def main() -> int:
    try:
        originals = {path: read(path) for path in TARGETS}

        patched = {
            QUIZ_PATH: patch_quiz(originals[QUIZ_PATH]),
            ACHIEVEMENTS_PATH: patch_achievements(
                originals[ACHIEVEMENTS_PATH]
            ),
            BRAINTEASERS_PATH: patch_brainteasers(
                originals[BRAINTEASERS_PATH]
            ),
            STREAK_PATH: patch_streak(originals[STREAK_PATH]),
        }

        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_dir = (
            ROOT / "backups" / f"passive-legendaries-{stamp}"
        )

        for path in TARGETS:
            relative = path.relative_to(ROOT)
            backup_path = backup_dir / relative
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, backup_path)

        if HOOK_PATH.exists():
            hook_backup = backup_dir / HOOK_PATH.relative_to(ROOT)
            hook_backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(HOOK_PATH, hook_backup)

        HOOK_PATH.parent.mkdir(parents=True, exist_ok=True)
        HOOK_PATH.write_text(HOOK_SOURCE, encoding="utf-8")

        for path, content in patched.items():
            path.write_text(content, encoding="utf-8")

        print()
        print("✅ Passive legendary stacking installed.")
        print(f"✅ Backups: {backup_dir}")
        print()
        print("Updated:")
        print(f"  - {HOOK_PATH.relative_to(ROOT)}")
        for path in TARGETS:
            print(f"  - {path.relative_to(ROOT)}")
        print()
        print("Next: npx expo start -c")
        return 0

    except PatchError as error:
        print()
        print("❌ Nothing was written.")
        print(f"Reason: {error}")
        return 1

    except Exception as error:
        print()
        print("❌ Installer stopped.")
        print(f"{type(error).__name__}: {error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
