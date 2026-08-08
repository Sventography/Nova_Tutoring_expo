// app/components/NovaAiPlansSection.tsx

import React, {
  useMemo,
} from "react";

import {
  Pressable,
  Text,
  View,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { useAiPlan } from "../context/AiPlanContext";
import { useTheme } from "../context/ThemeContext";

type Props = {
  storeProductsById:
    Record<string, any>;

  pendingProductId:
    string | null;

  isAuthenticated:
    boolean;

  onSelectPlan:
    (plan: any) => void;
};

const ACTIVE_STATUSES =
  new Set([
    "active",
    "grace_period",
    "billing_retry",
  ]);

function displayStorePrice(
  plan: any,
  product: any
): string {
  const localized =
    product?.displayPrice ||
    product?.localizedPrice ||
    product?.priceString ||
    "";

  if (
    typeof localized === "string" &&
    localized.trim()
  ) {
    return localized.trim();
  }

  const fallback =
    Number(
      plan?.fallbackPriceUSD
    );

  if (
    Number.isFinite(fallback) &&
    fallback > 0
  ) {
    return `$${fallback.toFixed(2)}`;
  }

  return "Apple price";
}

export default function NovaAiPlansSection({
  storeProductsById,
  pendingProductId,
  isAuthenticated,
  onSelectPlan,
}: Props) {
  const { tokens } = useTheme();

  const {
    plan: currentPlan,
    planId,
    plans,
    subscriptionStatus,
  } = useAiPlan();

  const paidPlans =
    useMemo(
      () =>
        plans
          .filter(
            (plan) =>
              plan.id !== "free" &&
              !!plan.appleProductId
          )
          .slice()
          .sort(
            (a, b) =>
              a.sortOrder -
              b.sortOrder
          ),
      [plans]
    );

  const hasActivePaidPlan =
    currentPlan.id !== "free" &&
    ACTIVE_STATUSES.has(
      subscriptionStatus
    );

  return (
    <View
      style={{
        marginBottom: 24,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent:
            "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color:
                tokens.titleText as any,
              fontSize: 17,
              fontWeight: "900",
              marginBottom: 4,
            }}
          >
            Nova AI Plans
          </Text>

          <Text
            style={{
              color:
                tokens.cardText as any,
              fontSize: 12,
              lineHeight: 17,
              fontWeight: "700",
            }}
          >
            More monthly questions
            and longer conversation
            memory. Apple handles
            billing and renewal.
          </Text>
        </View>

        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor:
              currentPlan.accentColor,
            backgroundColor:
              `${currentPlan.accentColor}18`,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              color:
                currentPlan.accentColor,
              fontSize: 10,
              fontWeight: "900",
            }}
          >
            CURRENT:{" "}
            {currentPlan.shortName.toUpperCase()}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent:
            "space-between",
          rowGap: 12,
        }}
      >
        {paidPlans.map((plan) => {
          const productId = String(
            plan.appleProductId ||
              ""
          );

          const storeProduct =
            storeProductsById[
              productId
            ];

          const price =
            displayStorePrice(
              plan,
              storeProduct
            );

          const isCurrent =
            hasActivePaidPlan &&
            planId === plan.id;

          const isPending =
            pendingProductId ===
            productId;

          const anotherPending =
            !!pendingProductId &&
            !isPending;


          const currentOrder =
            Number(
              currentPlan.sortOrder
            );

          const targetOrder =
            Number(
              plan.sortOrder
            );

          const comparableOrders =
            Number.isFinite(
              currentOrder
            ) &&
            Number.isFinite(
              targetOrder
            );

          const isUpgrade =
            hasActivePaidPlan &&
            comparableOrders &&
            targetOrder >
              currentOrder;

          const isDowngrade =
            hasActivePaidPlan &&
            comparableOrders &&
            targetOrder <
              currentOrder;

          const disabled =
            isCurrent ||
            anotherPending ||
            isPending;

          const buttonLabel =
            isCurrent
              ? "Current Plan"
              : isPending
              ? "Processing…"
              : !isAuthenticated
              ? "Sign in to subscribe"
              : isUpgrade
              ? "Upgrade Now"
              : isDowngrade
              ? "Change at Renewal"
              : hasActivePaidPlan
              ? `Switch to ${plan.shortName}`
              : `Choose ${plan.shortName}`;


          return (
            <LinearGradient
              key={plan.id}
              colors={[
                `${plan.accentColor}24`,
                tokens.isDark
                  ? "rgba(2,6,23,0.94)"
                  : "rgba(255,255,255,0.96)",
              ]}
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 1,
              }}
              style={{
                width: "48%",
                minHeight: 210,
                borderRadius: 17,
                borderWidth:
                  isCurrent ? 2 : 1,
                borderColor:
                  plan.accentColor,
                padding: 12,
                shadowColor:
                  plan.accentColor,
                shadowOpacity:
                  isCurrent
                    ? 0.28
                    : 0.12,
                shadowRadius:
                  isCurrent
                    ? 12
                    : 7,
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                elevation:
                  isCurrent ? 5 : 2,
              }}
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <View
                  style={{
                    flexDirection:
                      "row",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color:
                        tokens.text as any,
                      fontSize: 16,
                      fontWeight: "900",
                    }}
                  >
                    {plan.shortName}
                  </Text>

                  {isCurrent ? (
                    <View
                      style={{
                        borderRadius:
                          999,
                        paddingHorizontal:
                          7,
                        paddingVertical:
                          4,
                        backgroundColor:
                          `${plan.accentColor}24`,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            plan.accentColor,
                          fontSize: 8,
                          fontWeight:
                            "900",
                        }}
                      >
                        ACTIVE
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={{
                    color:
                      plan.accentColor,
                    fontSize: 18,
                    fontWeight: "900",
                    marginBottom: 2,
                  }}
                >
                  {price}
                </Text>

                <Text
                  style={{
                    color:
                      tokens.cardText as any,
                    fontSize: 10,
                    fontWeight: "700",
                    marginBottom: 12,
                  }}
                >
                  per month
                </Text>

                <View
                  style={{
                    gap: 7,
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      color:
                        tokens.text as any,
                      fontSize: 11,
                      lineHeight: 15,
                      fontWeight: "700",
                    }}
                  >
                    ✦{" "}
                    {Number(
                      plan.monthlyQuestionLimit
                    ).toLocaleString()}{" "}
                    AI questions / month
                  </Text>

                  <Text
                    style={{
                      color:
                        tokens.text as any,
                      fontSize: 11,
                      lineHeight: 15,
                      fontWeight: "700",
                    }}
                  >
                    ✦ Remembers ~
                    {Number(
                      plan.memoryMessageLimit
                    ).toLocaleString()}{" "}
                    recent messages
                  </Text>
                </View>
              </View>

              <Pressable
                disabled={disabled}
                onPress={() =>
                  onSelectPlan(plan)
                }
                accessibilityRole="button"
                accessibilityLabel={
                  buttonLabel
                }
                style={({ pressed }) => ({
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor:
                    plan.accentColor,
                  backgroundColor:
                    isCurrent
                      ? `${plan.accentColor}18`
                      : pressed
                      ? `${plan.accentColor}35`
                      : `${plan.accentColor}22`,
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                  alignItems: "center",
                  justifyContent:
                    "center",
                  opacity:
                    disabled &&
                    !isCurrent
                      ? 0.55
                      : 1,
                })}
              >
                <Text
                  style={{
                    color:
                      plan.accentColor,
                    fontSize: 10,
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  {buttonLabel}
                </Text>
              </Pressable>
            </LinearGradient>
          );
        })}
      </View>

      <Text
        style={{
          color:
            tokens.cardText as any,
          fontSize: 10,
          lineHeight: 15,
          marginTop: 10,
          opacity: 0.82,
        }}
      >
        Monthly auto-renewable
        subscription. The price shown
        by Apple is authoritative.
        Existing permanent Ask Memory
        purchases remain honored for
        memory.
      </Text>
    </View>
  );
}
