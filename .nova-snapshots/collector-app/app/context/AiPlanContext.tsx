// app/context/AiPlanContext.tsx
//
// Nova Tutoring v1.3
//
// Read-only client context for Nova AI plans, allowances, usage,
// memory, and verified Apple subscription entitlement.
//
// SECURITY:
// - The client may DISPLAY subscription information.
// - The client must never grant itself a paid subscription.
// - Paid entitlement changes come from the trusted Flask backend
//   after Apple verification.
// - AI quota mutations also happen only through the backend.
// - Apple / StoreKit is authoritative for customer-facing pricing.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { supabase } from "../lib/supabase";
import { refreshNovaAiSubscriptionOnServer } from "../_lib/aiSubscriptionIap";
import { useUser } from "./UserContext";

import {
  AI_PLAN_LIST,
  AI_PLANS,
  GUEST_TRIAL_QUESTION_LIMIT,
  getEffectiveMemoryLimit,
  getQuestionsRemaining,
  isAiPlanId,
  type AiPlanDefinition,
  type AiPlanId,
} from "../_lib/aiPlans";

export type AiSubscriptionStatus =
  | "guest"
  | "free"
  | "active"
  | "grace_period"
  | "billing_retry"
  | "expired"
  | "revoked";

type AiPlanDatabaseRow = {
  id: string;
  display_name: string | null;
  apple_product_id: string | null;
  monthly_question_limit: number | string | null;
  memory_message_limit: number | string | null;
  sort_order: number | string | null;
  active: boolean | null;
  voice_enabled: boolean | null;
  image_enabled: boolean | null;
  documents_enabled: boolean | null;
};

type AiSubscriptionDatabaseRow = {
  user_id: string;
  plan_id: string | null;
  status: string | null;
  apple_product_id: string | null;
  original_transaction_id: string | null;
  latest_transaction_id: string | null;
  period_start: string | null;
  period_end: string | null;
  verified_at: string | null;
};

type AiUsagePeriodDatabaseRow = {
  id: string;
  user_id: string;
  plan_id: string;
  period_start: string;
  period_end: string;
  questions_used: number | string | null;
  questions_reserved: number | string | null;
  updated_at: string | null;
};

type AiUsageEventDatabaseRow = {
  status: string | null;
  created_at: string | null;
  finalized_at: string | null;
};

type ProfileMemoryRow = {
  ask_memory_limit?: number | string | null;
};

export type AiUsageSnapshot = {
  questionsUsed: number;
  questionsReserved: number;
  periodEnd?: string | null;
};

export type AiPlanContextValue = {
  ready: boolean;
  loading: boolean;
  error: string | null;

  isGuest: boolean;

  planId: AiPlanId;
  plan: AiPlanDefinition;
  plans: readonly AiPlanDefinition[];

  subscriptionStatus: AiSubscriptionStatus;

  monthlyQuestionLimit: number;
  questionsUsed: number;
  questionsReserved: number;
  questionsRemaining: number;

  subscriptionMemoryMessageLimit: number;
  legacyMemoryMessageLimit: number;
  effectiveMemoryMessageLimit: number;

  periodStart: string | null;
  periodEnd: string | null;
  lastQuestionAt: string | null;
  verifiedAt: string | null;

  guestTrialQuestionLimit: number;

  refresh: () => Promise<void>;
  applyUsageSnapshot:
    (snapshot: AiUsageSnapshot) => void;
};

const AiPlanContext =
  createContext<AiPlanContextValue | null>(null);

const PAID_ENTITLEMENT_STATUSES =
  new Set<AiSubscriptionStatus>([
    "active",
    "grace_period",
    "billing_retry",
  ]);

function safeInteger(
  value: unknown,
  fallback = 0
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(
    0,
    Math.trunc(parsed)
  );
}

function normalizeSubscriptionStatus(
  value: unknown,
  fallback: AiSubscriptionStatus
): AiSubscriptionStatus {
  const normalized = String(
    value || ""
  )
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "free":
    case "active":
    case "grace_period":
    case "billing_retry":
    case "expired":
    case "revoked":
      return normalized;

    default:
      return fallback;
  }
}

function isExpired(
  periodEnd: string | null | undefined
): boolean {
  if (!periodEnd) {
    return false;
  }

  const timestamp =
    Date.parse(periodEnd);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp <= Date.now();
}

function currentUtcMonthPeriod(): {
  start: string;
  end: string;
} {
  const now = new Date();

  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
      0,
      0,
      0,
      0
    )
  );

  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      1,
      0,
      0,
      0,
      0
    )
  );

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function mergePlanRow(
  row: AiPlanDatabaseRow
): AiPlanDefinition | null {
  if (!isAiPlanId(row.id)) {
    return null;
  }

  const fallback =
    AI_PLANS[row.id];

  return {
    ...fallback,

    displayName:
      typeof row.display_name === "string" &&
      row.display_name.trim()
        ? row.display_name.trim()
        : fallback.displayName,

    appleProductId:
      typeof row.apple_product_id === "string" &&
      row.apple_product_id.trim()
        ? row.apple_product_id.trim()
        : fallback.appleProductId,

    monthlyQuestionLimit:
      safeInteger(
        row.monthly_question_limit,
        fallback.monthlyQuestionLimit
      ),

    memoryMessageLimit:
      safeInteger(
        row.memory_message_limit,
        fallback.memoryMessageLimit
      ),

    // IMPORTANT:
    // Do NOT load a price from Supabase.
    // This remains only the local display fallback.
    // StoreKit localized pricing overrides it later.
    fallbackPriceUSD:
      fallback.fallbackPriceUSD,

    sortOrder:
      safeInteger(
        row.sort_order,
        fallback.sortOrder
      ),

    voiceEnabled:
      typeof row.voice_enabled === "boolean"
        ? row.voice_enabled
        : fallback.voiceEnabled,

    imageEnabled:
      typeof row.image_enabled === "boolean"
        ? row.image_enabled
        : fallback.imageEnabled,

    documentsEnabled:
      typeof row.documents_enabled === "boolean"
        ? row.documents_enabled
        : fallback.documentsEnabled,
  };
}

function fallbackPlans():
  AiPlanDefinition[] {
  return AI_PLAN_LIST
    .map((plan) => ({
      ...plan,
    }))
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder
    );
}

export function AiPlanProvider({
  children,
}: {
  children: ReactNode;
}) {
  const userContext =
    useUser() as any;

  const userReady =
    Boolean(userContext?.ready);

  const supabaseUserId =
    typeof userContext?.supabaseUserId ===
    "string"
      ? userContext.supabaseUserId
      : null;

  const [ready, setReady] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [plans, setPlans] =
    useState<AiPlanDefinition[]>(
      fallbackPlans()
    );

  const [planId, setPlanId] =
    useState<AiPlanId>("free");

  const [
    subscriptionStatus,
    setSubscriptionStatus,
  ] =
    useState<AiSubscriptionStatus>(
      "guest"
    );

  const [
    questionsUsed,
    setQuestionsUsed,
  ] = useState(0);

  const [
    questionsReserved,
    setQuestionsReserved,
  ] = useState(0);

  const [
    legacyMemoryMessageLimit,
    setLegacyMemoryMessageLimit,
  ] = useState(0);

  const [
    periodStart,
    setPeriodStart,
  ] =
    useState<string | null>(null);

  const [
    periodEnd,
    setPeriodEnd,
  ] =
    useState<string | null>(null);

  const [
    lastQuestionAt,
    setLastQuestionAt,
  ] =
    useState<string | null>(null);

  const [
    verifiedAt,
    setVerifiedAt,
  ] =
    useState<string | null>(null);

  const requestVersionRef =
    useRef(0);

  const refresh =
    useCallback(async () => {
      if (!userReady) {
        return;
      }

      const requestVersion =
        requestVersionRef.current + 1;

      requestVersionRef.current =
        requestVersion;

      setLoading(true);
      setError(null);

      try {
        // --------------------------------------------------
        // Plan catalog
        // --------------------------------------------------

        const {
          data: planRows,
          error: planError,
        } = await supabase
          .from("ai_plans")
          .select(
            "id,display_name,apple_product_id,monthly_question_limit,memory_message_limit,sort_order,active,voice_enabled,image_enabled,documents_enabled"
          )
          .eq("active", true)
          .order("sort_order", {
            ascending: true,
          });

        if (
          requestVersion !==
          requestVersionRef.current
        ) {
          return;
        }

        let resolvedPlans =
          fallbackPlans();

        if (
          !planError &&
          Array.isArray(planRows)
        ) {
          const merged = (
            planRows as unknown as
              AiPlanDatabaseRow[]
          )
            .map(mergePlanRow)
            .filter(
              (
                plan
              ): plan is AiPlanDefinition =>
                Boolean(plan)
            )
            .sort(
              (a, b) =>
                a.sortOrder -
                b.sortOrder
            );

          if (merged.length > 0) {
            const planMap =
              new Map<
                AiPlanId,
                AiPlanDefinition
              >();

            fallbackPlans().forEach(
              (plan) => {
                planMap.set(
                  plan.id,
                  plan
                );
              }
            );

            merged.forEach((plan) => {
              planMap.set(
                plan.id,
                plan
              );
            });

            resolvedPlans =
              Array.from(
                planMap.values()
              ).sort(
                (a, b) =>
                  a.sortOrder -
                  b.sortOrder
              );
          }
        }

        setPlans(resolvedPlans);

        // --------------------------------------------------
        // Guest
        // --------------------------------------------------

        if (!supabaseUserId) {
          setPlanId("free");
          setSubscriptionStatus(
            "guest"
          );

          setQuestionsUsed(0);
          setQuestionsReserved(0);

          setLegacyMemoryMessageLimit(
            0
          );

          setPeriodStart(null);
          setPeriodEnd(null);
          setLastQuestionAt(null);
          setVerifiedAt(null);

          if (planError) {
            setError(
              "Nova AI plans could not be refreshed. Local plan defaults are being used."
            );
          }

          return;
        }

        // --------------------------------------------------
        // Entitlement + grandfathered memory
        // --------------------------------------------------

        const [
          subscriptionResult,
          profileResult,
        ] = await Promise.all([
          supabase
            .from(
              "ai_subscriptions"
            )
            .select(
              "user_id,plan_id,status,apple_product_id,original_transaction_id,latest_transaction_id,period_start,period_end,verified_at"
            )
            .eq(
              "user_id",
              supabaseUserId
            )
            .maybeSingle(),

          supabase
            .from("profiles")
            .select(
              "ask_memory_limit"
            )
            .eq(
              "id",
              supabaseUserId
            )
            .maybeSingle(),
        ]);

        if (
          requestVersion !==
          requestVersionRef.current
        ) {
          return;
        }

        let subscription =
          subscriptionResult.data as unknown as
            AiSubscriptionDatabaseRow | null;

        const profile =
          profileResult.data as unknown as
            ProfileMemoryRow | null;

        /*
         * Apple auto-renewals create newer transactions. If our saved paid
         * period has ended, do not demote the customer to Free until the
         * trusted backend asks Apple for the CURRENT subscription status.
         *
         * The client never supplies a transaction id to this endpoint and
         * never grants itself a paid plan.
         */
        const storedPlanId =
          isAiPlanId(
            subscription?.plan_id
          )
            ? subscription!.plan_id
            : "free";

        const storedStatus =
          normalizeSubscriptionStatus(
            subscription?.status,
            "free"
          );

        const shouldReconcileApple =
          storedPlanId !== "free" &&
          (
            storedStatus ===
              "expired" ||
            isExpired(
              subscription?.period_end
            )
          );

        if (shouldReconcileApple) {
          try {
            const refreshed =
              await refreshNovaAiSubscriptionOnServer();

            if (
              requestVersion !==
              requestVersionRef.current
            ) {
              return;
            }

            if (refreshed?.verified) {
              const refreshedPlanId =
                isAiPlanId(
                  refreshed?.purchased_plan_id
                )
                  ? refreshed
                      .purchased_plan_id
                  : isAiPlanId(
                      refreshed?.plan_id
                    )
                  ? refreshed.plan_id
                  : storedPlanId;

              subscription = {
                ...(subscription || {}),
                plan_id:
                  refreshedPlanId,
                status:
                  refreshed?.status ??
                  subscription?.status ??
                  null,
                apple_product_id:
                  refreshed?.product_id ??
                  subscription
                    ?.apple_product_id ??
                  null,
                original_transaction_id:
                  refreshed
                    ?.original_transaction_id ??
                  subscription
                    ?.original_transaction_id ??
                  null,
                latest_transaction_id:
                  refreshed
                    ?.latest_transaction_id ??
                  subscription
                    ?.latest_transaction_id ??
                  null,
                period_start:
                  refreshed?.period_start ??
                  subscription
                    ?.period_start ??
                  null,
                period_end:
                  refreshed?.period_end ??
                  subscription
                    ?.period_end ??
                  null,
                verified_at:
                  new Date()
                    .toISOString(),
                user_id:
                  subscription?.user_id ??
                  supabaseUserId,
              };

              if (__DEV__) {
                console.log(
                  "[AiPlanContext] Apple entitlement reconciled",
                  {
                    planId:
                      refreshedPlanId,
                    status:
                      refreshed?.status,
                    periodEnd:
                      refreshed?.period_end,
                    environment:
                      refreshed?.environment,
                  }
                );
              }
            }
          } catch (reconcileError) {
            console.warn(
              "[AiPlanContext] Apple entitlement reconciliation failed",
              reconcileError
            );
          }
        }

        const rawStatus =
          normalizeSubscriptionStatus(
            subscription?.status,
            "free"
          );

        const requestedPlanId =
          isAiPlanId(
            subscription?.plan_id
          )
            ? subscription!.plan_id
            : "free";

        const paidPeriodExpired =
          requestedPlanId !== "free" &&
          isExpired(
            subscription?.period_end
          );

        const hasPaidEntitlement =
          requestedPlanId !== "free" &&
          PAID_ENTITLEMENT_STATUSES.has(
            rawStatus
          ) &&
          !paidPeriodExpired;

        const resolvedPlanId:
          AiPlanId =
          hasPaidEntitlement
            ? requestedPlanId
            : "free";

        let resolvedStatus:
          AiSubscriptionStatus;

        if (
          requestedPlanId === "free"
        ) {
          resolvedStatus = "free";
        } else if (
          paidPeriodExpired
        ) {
          resolvedStatus =
            "expired";
        } else if (
          hasPaidEntitlement
        ) {
          resolvedStatus =
            rawStatus;
        } else if (
          rawStatus === "revoked"
        ) {
          resolvedStatus =
            "revoked";
        } else {
          resolvedStatus =
            "free";
        }

        setPlanId(
          resolvedPlanId
        );

        setSubscriptionStatus(
          resolvedStatus
        );

        setLegacyMemoryMessageLimit(
          safeInteger(
            profile?.ask_memory_limit,
            0
          )
        );

        setVerifiedAt(
          subscription?.verified_at ??
            null
        );

        // --------------------------------------------------
        // Resolve the period Nova's backend is using.
        //
        // Paid:
        // Apple entitlement period.
        //
        // Free:
        // Current UTC calendar month.
        // --------------------------------------------------

        const freePeriod =
          currentUtcMonthPeriod();

        const expectedPeriodStart =
          hasPaidEntitlement &&
          subscription?.period_start
            ? subscription.period_start
            : freePeriod.start;

        const expectedPeriodEnd =
          hasPaidEntitlement &&
          subscription?.period_end
            ? subscription.period_end
            : freePeriod.end;

        // --------------------------------------------------
        // Current usage period
        // --------------------------------------------------

        const nowIso =
          new Date().toISOString();

        const usageResult =
          await supabase
            .from(
              "ai_usage_periods"
            )
            .select(
              "id,user_id,plan_id,period_start,period_end,questions_used,questions_reserved,updated_at"
            )
            .eq(
              "user_id",
              supabaseUserId
            )
            .eq(
              "plan_id",
              resolvedPlanId
            )
            .lte(
              "period_start",
              nowIso
            )
            .gt(
              "period_end",
              nowIso
            )
            .order(
              "period_end",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle();

        if (
          requestVersion !==
          requestVersionRef.current
        ) {
          return;
        }

        const usagePeriod =
          usageResult.data as unknown as
            AiUsagePeriodDatabaseRow | null;

        setQuestionsUsed(
          safeInteger(
            usagePeriod
              ?.questions_used,
            0
          )
        );

        setQuestionsReserved(
          safeInteger(
            usagePeriod
              ?.questions_reserved,
            0
          )
        );

        setPeriodStart(
          usagePeriod?.period_start ??
            expectedPeriodStart
        );

        setPeriodEnd(
          usagePeriod?.period_end ??
            expectedPeriodEnd
        );

        // --------------------------------------------------
        // Most recent successful Ask
        // --------------------------------------------------

        const lastEventResult =
          await supabase
            .from(
              "ai_usage_events"
            )
            .select(
              "status,created_at,finalized_at"
            )
            .eq(
              "user_id",
              supabaseUserId
            )
            .eq(
              "status",
              "succeeded"
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle();

        if (
          requestVersion !==
          requestVersionRef.current
        ) {
          return;
        }

        const lastEvent =
          lastEventResult.data as unknown as
            AiUsageEventDatabaseRow | null;

        setLastQuestionAt(
          lastEvent?.finalized_at ??
            lastEvent?.created_at ??
            null
        );

        const errors = [
          planError?.message,
          subscriptionResult.error
            ?.message,
          profileResult.error
            ?.message,
          usageResult.error?.message,
          lastEventResult.error
            ?.message,
        ].filter(Boolean);

        if (errors.length > 0) {
          console.warn(
            "[AiPlanContext] partial refresh errors:",
            errors
          );

          setError(
            "Some Nova AI account information could not be refreshed."
          );
        }
      } catch (caughtError) {
        console.warn(
          "[AiPlanContext] refresh failed:",
          caughtError
        );

        setError(
          "Nova AI account information could not be refreshed."
        );

        setPlans(
          fallbackPlans()
        );

        setPlanId("free");

        setSubscriptionStatus(
          supabaseUserId
            ? "free"
            : "guest"
        );

        setQuestionsUsed(0);
        setQuestionsReserved(0);

        setLegacyMemoryMessageLimit(
          0
        );

        setPeriodStart(null);
        setPeriodEnd(null);
        setLastQuestionAt(null);
        setVerifiedAt(null);
      } finally {
        if (
          requestVersion ===
          requestVersionRef.current
        ) {
          setLoading(false);
          setReady(true);
        }
      }
    }, [
      supabaseUserId,
      userReady,
    ]);

  const applyUsageSnapshot =
    useCallback(
      (
        snapshot: AiUsageSnapshot
      ) => {
        setQuestionsUsed(
          safeInteger(
            snapshot.questionsUsed,
            0
          )
        );

        setQuestionsReserved(
          safeInteger(
            snapshot.questionsReserved,
            0
          )
        );

        if (
          snapshot.periodEnd !==
            undefined
        ) {
          setPeriodEnd(
            snapshot.periodEnd ??
              null
          );
        }
      },
      []
    );

  useEffect(() => {
    if (!userReady) {
      return;
    }

    void refresh();
  }, [
    refresh,
    userReady,
  ]);

  useEffect(() => {
    if (
      !userReady ||
      !supabaseUserId
    ) {
      return;
    }

    const appStateSubscription =
      AppState.addEventListener(
        "change",
        (state) => {
          if (state !== "active") {
            return;
          }

          if (__DEV__) {
            console.log(
              "[AiPlanContext] app active — refreshing entitlement"
            );
          }

          void refresh();
        }
      );

    return () => {
      appStateSubscription.remove();
    };
  }, [
    refresh,
    supabaseUserId,
    userReady,
  ]);

  const plan =
    useMemo(() => {
      return (
        plans.find(
          (candidate) =>
            candidate.id === planId
        ) ?? AI_PLANS.free
      );
    }, [
      planId,
      plans,
    ]);

  const monthlyQuestionLimit =
    plan.monthlyQuestionLimit;

  const subscriptionMemoryMessageLimit =
    plan.memoryMessageLimit;

  const effectiveMemoryMessageLimit =
    getEffectiveMemoryLimit(
      subscriptionMemoryMessageLimit,
      legacyMemoryMessageLimit
    );

  const questionsRemaining =
    getQuestionsRemaining(
      monthlyQuestionLimit,
      questionsUsed +
        questionsReserved
    );

  const value =
    useMemo<AiPlanContextValue>(
      () => ({
        ready,
        loading,
        error,

        isGuest:
          !supabaseUserId,

        planId,
        plan,
        plans,

        subscriptionStatus,

        monthlyQuestionLimit,
        questionsUsed,
        questionsReserved,
        questionsRemaining,

        subscriptionMemoryMessageLimit,
        legacyMemoryMessageLimit,
        effectiveMemoryMessageLimit,

        periodStart,
        periodEnd,
        lastQuestionAt,
        verifiedAt,

        guestTrialQuestionLimit:
          GUEST_TRIAL_QUESTION_LIMIT,

        refresh,
        applyUsageSnapshot,
      }),
      [
        ready,
        loading,
        error,
        supabaseUserId,
        planId,
        plan,
        plans,
        subscriptionStatus,
        monthlyQuestionLimit,
        questionsUsed,
        questionsReserved,
        questionsRemaining,
        subscriptionMemoryMessageLimit,
        legacyMemoryMessageLimit,
        effectiveMemoryMessageLimit,
        periodStart,
        periodEnd,
        lastQuestionAt,
        verifiedAt,
        refresh,
        applyUsageSnapshot,
      ]
    );

  return (
    <AiPlanContext.Provider
      value={value}
    >
      {children}
    </AiPlanContext.Provider>
  );
}

export function useAiPlan():
  AiPlanContextValue {
  const context =
    useContext(AiPlanContext);

  if (!context) {
    throw new Error(
      "useAiPlan must be used inside AiPlanProvider"
    );
  }

  return context;
}
