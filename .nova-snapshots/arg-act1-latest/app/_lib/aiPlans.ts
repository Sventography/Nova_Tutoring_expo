// app/_lib/aiPlans.ts
//
// Nova Tutoring v1.3
// Shared AI plan definitions and Apple subscription product IDs.
//
// Personalities remain separate permanent Shop purchases.
// Existing v1.2 Ask Memory purchases remain grandfathered for memory only.

export type AiPlanId =
  | "free"
  | "basic"
  | "plus"
  | "pro"
  | "ultimate";

export type PaidAiPlanId = Exclude<AiPlanId, "free">;

export type AiPlanDefinition = {
  id: AiPlanId;
  displayName: string;
  shortName: string;
  appleProductId: string | null;

  monthlyQuestionLimit: number;
  memoryMessageLimit: number;

  /**
   * Display fallback only.
   * Apple's localized StoreKit price should be used whenever available.
   */
  fallbackPriceUSD: number | null;

  sortOrder: number;
  accentColor: string;

  voiceEnabled: boolean;
  imageEnabled: boolean;
  documentsEnabled: boolean;

  /**
   * Emergency protection against bots or automated abuse.
   * General backend rate limiting will still apply separately.
   */
  dailyEmergencyLimit: number | null;
};

export const GUEST_TRIAL_QUESTION_LIMIT = 2;

export const AI_PLAN_IDS: readonly AiPlanId[] = [
  "free",
  "basic",
  "plus",
  "pro",
  "ultimate",
] as const;

export const PAID_AI_PLAN_IDS: readonly PaidAiPlanId[] = [
  "basic",
  "plus",
  "pro",
  "ultimate",
] as const;

export const AI_PLANS: Record<AiPlanId, AiPlanDefinition> = {
  free: {
    id: "free",
    displayName: "Nova AI Free",
    shortName: "Free",
    appleProductId: null,
    monthlyQuestionLimit: 5,
    memoryMessageLimit: 5,
    fallbackPriceUSD: null,
    sortOrder: 0,
    accentColor: "#94a3b8",
    voiceEnabled: false,
    imageEnabled: false,
    documentsEnabled: false,
    dailyEmergencyLimit: null,
  },

  basic: {
    id: "basic",
    displayName: "Nova AI Basic",
    shortName: "Basic",
    appleProductId: "nova_ai_basic_monthly",
    monthlyQuestionLimit: 25,
    memoryMessageLimit: 25,
    fallbackPriceUSD: 2.99,
    sortOrder: 1,
    accentColor: "#38bdf8",
    voiceEnabled: false,
    imageEnabled: false,
    documentsEnabled: false,
    dailyEmergencyLimit: null,
  },

  plus: {
    id: "plus",
    displayName: "Nova AI Plus",
    shortName: "Plus",
    appleProductId: "nova_ai_plus_monthly",
    monthlyQuestionLimit: 75,
    memoryMessageLimit: 75,
    fallbackPriceUSD: 5.99,
    sortOrder: 2,
    accentColor: "#818cf8",
    voiceEnabled: false,
    imageEnabled: false,
    documentsEnabled: false,
    dailyEmergencyLimit: null,
  },

  pro: {
    id: "pro",
    displayName: "Nova AI Pro",
    shortName: "Pro",
    appleProductId: "nova_ai_pro_monthly",
    monthlyQuestionLimit: 200,
    memoryMessageLimit: 200,
    fallbackPriceUSD: 9.99,
    sortOrder: 3,
    accentColor: "#c084fc",
    voiceEnabled: false,
    imageEnabled: false,
    documentsEnabled: false,
    dailyEmergencyLimit: null,
  },

  ultimate: {
    id: "ultimate",
    displayName: "Nova AI Ultimate",
    shortName: "Ultimate",
    appleProductId: "nova_ai_ultimate_monthly",
    monthlyQuestionLimit: 500,
    memoryMessageLimit: 500,
    fallbackPriceUSD: 14.99,
    sortOrder: 4,
    accentColor: "#f59e0b",
    voiceEnabled: false,
    imageEnabled: false,
    documentsEnabled: false,
    dailyEmergencyLimit: null,
  },
};

export const AI_PLAN_LIST: readonly AiPlanDefinition[] = AI_PLAN_IDS.map(
  (id) => AI_PLANS[id]
);

export const PAID_AI_PLAN_LIST: readonly AiPlanDefinition[] =
  PAID_AI_PLAN_IDS.map((id) => AI_PLANS[id]);

export const AI_SUBSCRIPTION_PRODUCT_IDS: readonly string[] =
  PAID_AI_PLAN_LIST.map((plan) => plan.appleProductId).filter(
    (value): value is string => Boolean(value)
  );

export const AI_PLAN_BY_APPLE_PRODUCT_ID: Readonly<
  Record<string, AiPlanDefinition>
> = Object.freeze(
  PAID_AI_PLAN_LIST.reduce<Record<string, AiPlanDefinition>>((acc, plan) => {
    if (plan.appleProductId) {
      acc[plan.appleProductId] = plan;
    }

    return acc;
  }, {})
);

export function isAiPlanId(value: unknown): value is AiPlanId {
  return (
    typeof value === "string" &&
    (AI_PLAN_IDS as readonly string[]).includes(value)
  );
}

export function isPaidAiPlanId(value: unknown): value is PaidAiPlanId {
  return (
    typeof value === "string" &&
    (PAID_AI_PLAN_IDS as readonly string[]).includes(value)
  );
}

export function getAiPlan(value: unknown): AiPlanDefinition {
  return isAiPlanId(value) ? AI_PLANS[value] : AI_PLANS.free;
}

export function getAiPlanFromAppleProductId(
  productId: string | null | undefined
): AiPlanDefinition | null {
  const normalized = String(productId || "").trim();

  return normalized
    ? AI_PLAN_BY_APPLE_PRODUCT_ID[normalized] ?? null
    : null;
}

export function getQuestionsRemaining(
  monthlyQuestionLimit: number,
  questionsUsed: number
): number {
  const safeLimit = Math.max(
    0,
    Math.trunc(Number(monthlyQuestionLimit) || 0)
  );

  const safeUsed = Math.max(
    0,
    Math.trunc(Number(questionsUsed) || 0)
  );

  return Math.max(0, safeLimit - safeUsed);
}

export function getUsagePercent(
  questionsUsed: number,
  monthlyQuestionLimit: number
): number {
  const safeLimit = Math.max(0, Number(monthlyQuestionLimit) || 0);
  const safeUsed = Math.max(0, Number(questionsUsed) || 0);

  if (safeLimit <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, (safeUsed / safeLimit) * 100)
  );
}

/**
 * v1.2 sold permanent Ask Memory upgrades.
 *
 * They must not be removed from customers in v1.3.
 *
 * The subscription determines monthly question allowance.
 * Effective memory becomes whichever is larger:
 *
 * subscription memory or previously purchased permanent memory.
 */
export type LegacyAskMemoryTier =
  | "tier1"
  | "tier2"
  | "tier3"
  | "tier4";

export const LEGACY_ASK_MEMORY_LIMITS: Readonly<
  Record<LegacyAskMemoryTier, number>
> = Object.freeze({
  tier1: 20,
  tier2: 50,
  tier3: 100,
  tier4: 250,
});

export function getEffectiveMemoryLimit(
  subscriptionMemoryLimit: number,
  legacyMemoryLimit: number | null | undefined
): number {
  const subscriptionLimit = Math.max(
    0,
    Math.trunc(Number(subscriptionMemoryLimit) || 0)
  );

  const grandfatheredLimit = Math.max(
    0,
    Math.trunc(Number(legacyMemoryLimit) || 0)
  );

  return Math.max(subscriptionLimit, grandfatheredLimit);
}
