// app/components/island3d/IslandEventPanel.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ExpoIAP from "expo-iap";

import {
  useNovaEvents,
} from "../../context/EventsContext";
import {
  usePurchases,
} from "../../context/PurchasesContext";
import {
  useUser,
} from "../../context/UserContext";
import {
  ISLAND_DECORATION_CATALOG_BY_ID,
} from "../../_lib/islandDecorationCatalog";
import type {
  NovaEventReward,
} from "../../_lib/novaEvents";

function RewardCard({
  reward,
  points,
  claimed,
  premium,
  premiumPassOwned,
  accent,
  busy,
  onClaim,
}: {
  reward: NovaEventReward;
  points: number;
  claimed: boolean;
  premium: boolean;
  premiumPassOwned: boolean;
  accent: string;
  busy: boolean;
  onClaim: () => void;
}) {
  const decoration =
    reward.decorationId
      ? ISLAND_DECORATION_CATALOG_BY_ID[
          reward.decorationId
        ] ?? null
      : null;

  const reached =
    points >= reward.requiredPoints;

  const premiumLocked =
    premium &&
    !premiumPassOwned;

  const canClaim =
    reached &&
    !claimed &&
    !premiumLocked &&
    !busy;

  const rewardText =
    decoration
      ? decoration.title
      : `+${reward.baseCoins} coins`;

  const rewardEmoji =
    decoration?.previewEmoji ??
    "🪙";

  const buttonText =
    claimed
      ? "CLAIMED"
      : premiumLocked
      ? "PREMIUM"
      : reached
      ? "CLAIM"
      : `${reward.requiredPoints} XP`;

  return (
    <View
      style={[
        styles.rewardCard,
        {
          borderColor:
            claimed
              ? "rgba(52,211,153,0.45)"
              : reached
              ? `${accent}99`
              : "rgba(71,85,105,0.62)",
        },
      ]}
    >
      <View
        style={[
          styles.rewardPreview,
          {
            backgroundColor:
              decoration
                ? `${decoration.accent}18`
                : "rgba(250,204,21,0.10)",
          },
        ]}
      >
        <Text
          style={
            styles.rewardEmoji
          }
        >
          {rewardEmoji}
        </Text>
      </View>

      <View
        style={
          styles.rewardCopy
        }
      >
        <Text
          style={
            styles.rewardPoints
          }
        >
          {reward.requiredPoints} EVENT XP
        </Text>

        <Text
          numberOfLines={2}
          style={
            styles.rewardTitle
          }
        >
          {reward.label}
        </Text>

        <Text
          numberOfLines={2}
          style={[
            styles.rewardValue,
            decoration
              ? {
                  color:
                    decoration.accent,
                }
              : null,
          ]}
        >
          {rewardText}
        </Text>

        <Text
          style={
            styles.rewardDescription
          }
        >
          {reward.description}
        </Text>

        {decoration ? (
          <Text
            style={
              styles.collectibleTag
            }
          >
            ONE-TIME ISLAND COLLECTIBLE
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={
          canClaim
            ? onClaim
            : undefined
        }
        disabled={!canClaim}
        style={({ pressed }) => [
          styles.claimButton,
          claimed &&
            styles.claimedButton,
          premiumLocked &&
            styles.premiumLockedButton,
          !reached &&
            styles.lockedButton,
          pressed &&
            canClaim &&
            styles.pressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator
            size="small"
            color="#020617"
          />
        ) : (
          <Text
            style={[
              styles.claimButtonText,
              (claimed ||
                premiumLocked ||
                !reached) &&
                styles.claimButtonTextMuted,
            ]}
          >
            {buttonText}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function IslandEventPanel() {
  const {
    supabaseUserId,
  } = useUser();

  const {
    grant,
  } = usePurchases();

  const {
    ready,
    activeEvent,
    upcomingEvent,
    points,
    maxPoints,
    progress,
    eventDay,
    daysRemaining,
    claimedFreeRewardIds,
    claimedPremiumRewardIds,
    premiumPassOwned,
    unclaimedRewardCount,
    claimFreeReward,
    claimPremiumReward,
  } = useNovaEvents();

  const [
    expanded,
    setExpanded,
  ] = useState(true);

  const [
    busyRewardId,
    setBusyRewardId,
  ] = useState<
    string | null
  >(null);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  const [
    premiumStorePrice,
    setPremiumStorePrice,
  ] = useState<
    string | null
  >(null);

  const [
    premiumStoreAvailable,
    setPremiumStoreAvailable,
  ] = useState(false);

  const [
    premiumPurchaseBusy,
    setPremiumPurchaseBusy,
  ] = useState(false);

  const premiumPurchaseBusyRef =
    useRef(false);

  const premiumProductId =
    activeEvent?.premiumProductId ??
    null;

  useEffect(() => {
    let mounted = true;
    let purchaseUpdatedSub:
      | { remove?: () => void }
      | null = null;
    let purchaseErrorSub:
      | { remove?: () => void }
      | null = null;

    const finishPremiumPurchase =
      async (
        purchase: any
      ) => {
        const productId =
          String(
            purchase?.productId ||
              purchase?.id ||
              ""
          ).trim();

        if (
          !premiumProductId ||
          productId !==
            premiumProductId
        ) {
          return;
        }

        try {
          await grant(
            premiumProductId
          );

          await ExpoIAP.finishTransaction({
            purchase,
            isConsumable: false,
          });

          if (mounted) {
            setMessage(
              "Premium Track unlocked! Any premium tiers you have already reached can now be claimed."
            );
          }

          try {
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
          } catch {}
        } catch (error) {
          console.warn(
            "[IslandEventPanel] premium fulfillment failed",
            error
          );

          if (mounted) {
            Alert.alert(
              "Premium pass",
              "Apple completed the purchase, but Nova could not save the Premium Track entitlement yet. Use Restore Pass to try again."
            );
          }
        } finally {
          premiumPurchaseBusyRef.current =
            false;

          if (mounted) {
            setPremiumPurchaseBusy(
              false
            );
          }
        }
      };

    const connectAndLoad =
      async () => {
        if (
          Platform.OS !== "ios" ||
          !premiumProductId
        ) {
          return;
        }

        try {
          await ExpoIAP.initConnection();

          purchaseUpdatedSub =
            ExpoIAP.purchaseUpdatedListener(
              (purchase: any) => {
                void finishPremiumPurchase(
                  purchase
                );
              }
            );

          purchaseErrorSub =
            ExpoIAP.purchaseErrorListener(
              (error: any) => {
                const message =
                  String(
                    error?.message ||
                      error ||
                      ""
                  );

                const code =
                  String(
                    error?.code || ""
                  ).toLowerCase();

                const cancelled =
                  code.includes(
                    "cancel"
                  ) ||
                  message
                    .toLowerCase()
                    .includes(
                      "cancel"
                    );

                premiumPurchaseBusyRef.current =
                  false;

                if (mounted) {
                  setPremiumPurchaseBusy(
                    false
                  );
                }

                if (
                  !cancelled &&
                  mounted
                ) {
                  Alert.alert(
                    "Purchase error",
                    message ||
                      "The Premium Track purchase could not be completed."
                  );
                }
              }
            );

          const products =
            await ExpoIAP.fetchProducts({
              skus: [
                premiumProductId,
              ],
              type: "in-app",
            });

          const product =
            (
              Array.isArray(
                products
              )
                ? products
                : []
            ).find(
              (
                candidate: any
              ) =>
                String(
                  candidate?.id ||
                    candidate?.productId ||
                    ""
                ).trim() ===
                premiumProductId
            );

          if (!mounted) {
            return;
          }

          setPremiumStoreAvailable(
            Boolean(product)
          );

          const displayPrice =
            String(
              product?.displayPrice ||
                product?.localizedPrice ||
                product?.priceString ||
                ""
            ).trim();

          setPremiumStorePrice(
            displayPrice ||
              null
          );
        } catch (error) {
          console.warn(
            "[IslandEventPanel] premium product load failed",
            error
          );

          if (mounted) {
            setPremiumStoreAvailable(
              false
            );
            setPremiumStorePrice(
              null
            );
          }
        }
      };

    void connectAndLoad();

    return () => {
      mounted = false;
      purchaseUpdatedSub?.remove?.();
      purchaseErrorSub?.remove?.();
    };
  }, [
    grant,
    premiumProductId,
  ]);

  const buyPremiumPass =
    async () => {
      if (
        premiumPassOwned ||
        !premiumProductId ||
        premiumPurchaseBusyRef.current
      ) {
        return;
      }

      if (!supabaseUserId) {
        Alert.alert(
          "Sign in required",
          "Please sign in before buying the Premium Track so the pass stays attached to your Nova Tutoring account."
        );
        return;
      }

      if (
        Platform.OS !== "ios"
      ) {
        Alert.alert(
          "Apple purchase",
          "The Nova Halloween Premium Track is currently configured for iOS purchases."
        );
        return;
      }

      try {
        premiumPurchaseBusyRef.current =
          true;
        setPremiumPurchaseBusy(
          true
        );

        await ExpoIAP.initConnection();

        const products =
          await ExpoIAP.fetchProducts({
            skus: [
              premiumProductId,
            ],
            type: "in-app",
          });

        const available =
          (
            Array.isArray(
              products
            )
              ? products
              : []
          ).some(
            (
              product: any
            ) =>
              String(
                product?.id ||
                  product?.productId ||
                  ""
              ).trim() ===
              premiumProductId
          );

        if (!available) {
          premiumPurchaseBusyRef.current =
            false;
          setPremiumPurchaseBusy(
            false
          );

          Alert.alert(
            "Premium pass not available yet",
            "Apple has not returned the Nova Halloween Premium Track product yet. Make sure the non-consumable product exists in App Store Connect, then try again."
          );
          return;
        }

        await ExpoIAP.requestPurchase({
          request: {
            apple: {
              sku:
                premiumProductId,
            },
            google: {
              skus: [
                premiumProductId,
              ],
            },
          },
          type: "in-app",
        });
      } catch (error: any) {
        premiumPurchaseBusyRef.current =
          false;
        setPremiumPurchaseBusy(
          false
        );

        const raw =
          String(
            error?.message ||
              error ||
              ""
          );

        const cancelled =
          String(
            error?.code || ""
          )
            .toLowerCase()
            .includes("cancel") ||
          raw
            .toLowerCase()
            .includes("cancel");

        if (!cancelled) {
          Alert.alert(
            "Purchase error",
            raw ||
              "Could not start the Premium Track purchase."
          );
        }
      }
    };

  const restorePremiumPass =
    async () => {
      if (
        !premiumProductId ||
        premiumPurchaseBusyRef.current
      ) {
        return;
      }

      if (!supabaseUserId) {
        Alert.alert(
          "Sign in required",
          "Please sign in to the Nova account that owns the Premium Track, then restore again."
        );
        return;
      }

      try {
        premiumPurchaseBusyRef.current =
          true;
        setPremiumPurchaseBusy(
          true
        );

        await ExpoIAP.initConnection();

        const purchases =
          await ExpoIAP.getAvailablePurchases();

        const matching =
          (
            Array.isArray(
              purchases
            )
              ? purchases
              : []
          ).find(
            (
              purchase: any
            ) =>
              String(
                purchase?.productId ||
                  purchase?.id ||
                  ""
              ).trim() ===
              premiumProductId
          );

        if (!matching) {
          Alert.alert(
            "No Premium Track found",
            "Apple did not return a Nova Halloween Premium Track purchase for this Apple account."
          );
          return;
        }

        await grant(
          premiumProductId
        );

        try {
          await ExpoIAP.finishTransaction({
            purchase: matching,
            isConsumable: false,
          });
        } catch {}

        setMessage(
          "Premium Track restored to this Nova account."
        );
      } catch (error: any) {
        Alert.alert(
          "Restore failed",
          String(
            error?.message ||
              "The Premium Track could not be restored right now."
          )
        );
      } finally {
        premiumPurchaseBusyRef.current =
          false;
        setPremiumPurchaseBusy(
          false
        );
      }
    };

  const freeClaimed =
    useMemo(
      () =>
        new Set(
          claimedFreeRewardIds
        ),
      [
        claimedFreeRewardIds,
      ]
    );

  const premiumClaimed =
    useMemo(
      () =>
        new Set(
          claimedPremiumRewardIds
        ),
      [
        claimedPremiumRewardIds,
      ]
    );

  if (!ready) {
    return (
      <View
        style={
          styles.loadingCard
        }
      >
        <ActivityIndicator
          size="small"
          color="#f97316"
        />
        <Text
          style={
            styles.loadingText
          }
        >
          Loading Nova Event…
        </Text>
      </View>
    );
  }

  if (!activeEvent) {
    if (!upcomingEvent) {
      return null;
    }

    return (
      <View
        style={
          styles.upcomingCard
        }
      >
        <View
          style={
            styles.upcomingIcon
          }
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={
              upcomingEvent.accent
            }
          />
        </View>

        <View
          style={{ flex: 1 }}
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            NEXT NOVA EVENT
          </Text>
          <Text
            style={
              styles.upcomingTitle
            }
          >
            {
              upcomingEvent.title
            }
          </Text>
          <Text
            style={
              styles.upcomingText
            }
          >
            Begins {
              upcomingEvent.startDate
            }
          </Text>
        </View>
      </View>
    );
  }

  const claim = async (
    reward:
      NovaEventReward,
    premium: boolean
  ) => {
    if (
      busyRewardId
    ) {
      return;
    }

    setBusyRewardId(
      reward.id
    );
    setMessage(null);

    try {
      const coins =
        premium
          ? await claimPremiumReward(
              reward.id
            )
          : await claimFreeReward(
              reward.id
            );

      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {}

      const decoration =
        reward.decorationId
          ? ISLAND_DECORATION_CATALOG_BY_ID[
              reward.decorationId
            ]
          : null;

      setMessage(
        decoration
          ? `${decoration.title} added to Decoration Inventory.`
          : coins > 0
          ? `+${coins} coins claimed!`
          : "Reward claimed!"
      );
    } catch (error) {
      console.warn(
        "[IslandEventPanel] claim failed",
        error
      );
      setMessage(
        "That reward could not be claimed right now. Please try again."
      );
    } finally {
      setBusyRewardId(
        null
      );
    }
  };

  return (
    <View
      style={
        styles.wrapper
      }
    >
      <LinearGradient
        colors={[
          "#2a0f05",
          "#1e103d",
          "#07142a",
        ]}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 1,
          y: 1,
        }}
        style={
          styles.card
        }
      >
        <View
          style={
            styles.header
          }
        >
          <View
            style={[
              styles.eventIcon,
              {
                borderColor:
                  activeEvent.accent,
              },
            ]}
          >
            <Text
              style={
                styles.eventEmoji
              }
            >
              🎃
            </Text>
          </View>

          <View
            style={{
              flex: 1,
            }}
          >
            <View
              style={
                styles.titleRow
              }
            >
              <Text
                style={
                  styles.eventLabel
                }
              >
                LIVE EVENT
              </Text>

              {unclaimedRewardCount >
              0 ? (
                <View
                  style={
                    styles.readyPill
                  }
                >
                  <Text
                    style={
                      styles.readyPillText
                    }
                  >
                    {
                      unclaimedRewardCount
                    }{" "}
                    READY
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              style={
                styles.title
              }
            >
              {
                activeEvent.title
              }
            </Text>

            <Text
              style={
                styles.tagline
              }
            >
              {
                activeEvent.tagline
              }
            </Text>
          </View>

          <Pressable
            onPress={() =>
              setExpanded(
                (value) =>
                  !value
              )
            }
            style={({ pressed }) => [
              styles.expandButton,
              pressed &&
                styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              expanded
                ? "Collapse event"
                : "Expand event"
            }
          >
            <Ionicons
              name={
                expanded
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={18}
              color="#fed7aa"
            />
          </Pressable>
        </View>

        <View
          style={
            styles.statRow
          }
        >
          <View
            style={
              styles.stat
            }
          >
            <Text
              style={
                styles.statValue
              }
            >
              {points}
            </Text>
            <Text
              style={
                styles.statLabel
              }
            >
              EVENT XP
            </Text>
          </View>

          <View
            style={
              styles.statDivider
            }
          />

          <View
            style={
              styles.stat
            }
          >
            <Text
              style={
                styles.statValue
              }
            >
              {eventDay}
            </Text>
            <Text
              style={
                styles.statLabel
              }
            >
              EVENT DAY
            </Text>
          </View>

          <View
            style={
              styles.statDivider
            }
          />

          <View
            style={
              styles.stat
            }
          >
            <Text
              style={
                styles.statValue
              }
            >
              {daysRemaining}
            </Text>
            <Text
              style={
                styles.statLabel
              }
            >
              DAYS LEFT
            </Text>
          </View>
        </View>

        <View
          style={
            styles.progressTrack
          }
        >
          <LinearGradient
            colors={[
              "#f97316",
              "#a855f7",
            ]}
            start={{
              x: 0,
              y: 0,
            }}
            end={{
              x: 1,
              y: 0,
            }}
            style={[
              styles.progressFill,
              {
                width:
                  `${Math.max(
                    2,
                    Math.min(
                      100,
                      progress * 100
                    )
                  )}%`,
              },
            ]}
          />
        </View>

        <Text
          style={
            styles.progressCaption
          }
        >
          {points} / {
            maxPoints
          } Event XP
        </Text>

        {expanded ? (
          <>
            <Text
              style={
                styles.description
              }
            >
              {
                activeEvent.description
              }
            </Text>

            <View
              style={
                styles.missions
              }
            >
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                HOW TO EARN EVENT XP
              </Text>

              <View
                style={
                  styles.missionRow
                }
              >
                <Text
                  style={
                    styles.missionEmoji
                  }
                >
                  ✅
                </Text>
                <Text
                  style={
                    styles.missionText
                  }
                >
                  Correct quiz answer
                </Text>
                <Text
                  style={
                    styles.missionPoints
                  }
                >
                  +1 XP
                </Text>
              </View>

              <View
                style={
                  styles.missionRow
                }
              >
                <Text
                  style={
                    styles.missionEmoji
                  }
                >
                  🧠
                </Text>
                <Text
                  style={
                    styles.missionText
                  }
                >
                  Complete a quiz
                </Text>
                <Text
                  style={
                    styles.missionPoints
                  }
                >
                  +15 XP
                </Text>
              </View>

              <View
                style={
                  styles.missionRow
                }
              >
                <Text
                  style={
                    styles.missionEmoji
                  }
                >
                  🌟
                </Text>
                <Text
                  style={
                    styles.missionText
                  }
                >
                  Score 80% or higher
                </Text>
                <Text
                  style={
                    styles.missionPoints
                  }
                >
                  +10 XP
                </Text>
              </View>
            </View>

            <View
              style={
                styles.trackHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionEyebrow
                  }
                >
                  FREE TRACK
                </Text>
                <Text
                  style={
                    styles.trackTitle
                  }
                >
                  Free for every learner
                </Text>
              </View>

              <View
                style={
                  styles.freePill
                }
              >
                <Text
                  style={
                    styles.freePillText
                  }
                >
                  FREE
                </Text>
              </View>
            </View>

            <View
              style={
                styles.rewardList
              }
            >
              {
                activeEvent.freeTrack.map(
                  (reward) => (
                    <RewardCard
                      key={
                        reward.id
                      }
                      reward={
                        reward
                      }
                      points={
                        points
                      }
                      claimed={
                        freeClaimed.has(
                          reward.id
                        )
                      }
                      premium={
                        false
                      }
                      premiumPassOwned={
                        true
                      }
                      accent={
                        activeEvent.accent
                      }
                      busy={
                        busyRewardId ===
                        reward.id
                      }
                      onClaim={() =>
                        void claim(
                          reward,
                          false
                        )
                      }
                    />
                  )
                )
              }
            </View>

            {activeEvent.premiumTrackEnabled ? (
              <>
                <View
                  style={
                    styles.trackHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.premiumEyebrow
                      }
                    >
                      PREMIUM TRACK
                    </Text>
                    <Text
                      style={
                        styles.trackTitle
                      }
                    >
                      {
                        premiumPassOwned
                          ? "Premium pass active"
                          : "Optional bonus rewards"
                      }
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.premiumPill,
                      premiumPassOwned &&
                        styles.premiumPillOwned,
                    ]}
                  >
                    <Ionicons
                      name={
                        premiumPassOwned
                          ? "checkmark-circle"
                          : "lock-closed"
                      }
                      size={12}
                      color={
                        premiumPassOwned
                          ? "#6ee7b7"
                          : "#fde68a"
                      }
                    />
                    <Text
                      style={[
                        styles.premiumPillText,
                        premiumPassOwned
                          ? {
                              color:
                                "#6ee7b7",
                            }
                          : null,
                      ]}
                    >
                      {
                        premiumPassOwned
                          ? "ACTIVE"
                          : "PASS"
                      }
                    </Text>
                  </View>
                </View>

                {!premiumPassOwned ? (
                  <View
                    style={
                      styles.premiumPurchaseCard
                    }
                  >
                    <View
                      style={
                        styles.premiumPurchaseCopy
                      }
                    >
                      <Text
                        style={
                          styles.premiumPurchaseTitle
                        }
                      >
                        Unlock the Premium Track
                      </Text>
                      <Text
                        style={
                          styles.premiumPurchaseText
                        }
                      >
                        One Apple purchase unlocks every premium reward tier you earn during Nova Halloween 2026. Free Track rewards remain free.
                      </Text>

                      {!premiumStoreAvailable ? (
                        <Text
                          style={
                            styles.premiumStoreStatus
                          }
                        >
                          Apple product not detected yet. The button will retry the App Store when tapped.
                        </Text>
                      ) : null}
                    </View>

                    <Pressable
                      onPress={() =>
                        void buyPremiumPass()
                      }
                      disabled={
                        premiumPurchaseBusy
                      }
                      style={({ pressed }) => [
                        styles.unlockPremiumButton,
                        premiumPurchaseBusy &&
                          styles.lockedButton,
                        pressed &&
                          !premiumPurchaseBusy &&
                          styles.pressed,
                      ]}
                    >
                      {premiumPurchaseBusy ? (
                        <ActivityIndicator
                          size="small"
                          color="#020617"
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="lock-open-outline"
                            size={15}
                            color="#020617"
                          />
                          <Text
                            style={
                              styles.unlockPremiumText
                            }
                          >
                            {premiumStorePrice
                              ? `UNLOCK • ${premiumStorePrice}`
                              : "UNLOCK PREMIUM"}
                          </Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        void restorePremiumPass()
                      }
                      disabled={
                        premiumPurchaseBusy
                      }
                      style={({ pressed }) => [
                        styles.restoreButton,
                        pressed &&
                          !premiumPurchaseBusy &&
                          styles.pressed,
                      ]}
                    >
                      <Text
                        style={
                          styles.restoreButtonText
                        }
                      >
                        Restore Pass
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <View
                  style={
                    styles.rewardList
                  }
                >
                  {
                    activeEvent.premiumTrack.map(
                      (reward) => (
                        <RewardCard
                          key={
                            reward.id
                          }
                          reward={
                            reward
                          }
                          points={
                            points
                          }
                          claimed={
                            premiumClaimed.has(
                              reward.id
                            )
                          }
                          premium
                          premiumPassOwned={
                            premiumPassOwned
                          }
                          accent="#a855f7"
                          busy={
                            busyRewardId ===
                            reward.id
                          }
                          onClaim={() =>
                            void claim(
                              reward,
                              true
                            )
                          }
                        />
                      )
                    )
                  }
                </View>
              </>
            ) : null}

            {message ? (
              <View
                style={
                  styles.message
                }
              >
                <Ionicons
                  name="sparkles"
                  size={15}
                  color="#fde68a"
                />
                <Text
                  style={
                    styles.messageText
                  }
                >
                  {message}
                </Text>

                <Pressable
                  onPress={() =>
                    setMessage(null)
                  }
                  hitSlop={8}
                >
                  <Ionicons
                    name="close"
                    size={15}
                    color="#94a3b8"
                  />
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      marginBottom: 13,
    },
    card: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor:
        "rgba(249,115,22,0.48)",
      padding: 15,
      overflow: "hidden",
    },
    loadingCard: {
      minHeight: 80,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        "rgba(249,115,22,0.28)",
      backgroundColor:
        "rgba(30,16,61,0.66)",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
      marginBottom: 13,
    },
    loadingText: {
      color: "#fed7aa",
      fontSize: 11,
      fontWeight: "800",
    },
    upcomingCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        "rgba(167,139,250,0.34)",
      backgroundColor:
        "rgba(30,27,75,0.48)",
      padding: 14,
      marginBottom: 13,
    },
    upcomingIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(124,58,237,0.16)",
    },
    upcomingTitle: {
      color: "#f5f3ff",
      fontSize: 15,
      fontWeight: "900",
      marginTop: 2,
    },
    upcomingText: {
      color: "#c4b5fd",
      fontSize: 11,
      marginTop: 2,
    },
    header: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 11,
    },
    eventIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor:
        "rgba(249,115,22,0.10)",
      alignItems: "center",
      justifyContent:
        "center",
    },
    eventEmoji: {
      fontSize: 26,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 7,
    },
    eventLabel: {
      color: "#fb923c",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.8,
    },
    readyPill: {
      borderRadius: 999,
      backgroundColor:
        "rgba(52,211,153,0.14)",
      borderWidth: 1,
      borderColor:
        "rgba(52,211,153,0.34)",
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    readyPillText: {
      color: "#6ee7b7",
      fontSize: 8,
      fontWeight: "900",
    },
    title: {
      color: "#fff7ed",
      fontSize: 19,
      fontWeight: "900",
      marginTop: 2,
    },
    tagline: {
      color: "#ddd6fe",
      fontSize: 11,
      lineHeight: 15,
      marginTop: 2,
      fontWeight: "700",
    },
    expandButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        "rgba(251,146,60,0.30)",
      backgroundColor:
        "rgba(124,45,18,0.24)",
      alignItems: "center",
      justifyContent:
        "center",
    },
    statRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        "rgba(148,163,184,0.16)",
      backgroundColor:
        "rgba(2,6,23,0.42)",
      paddingVertical: 10,
    },
    stat: {
      flex: 1,
      alignItems: "center",
    },
    statValue: {
      color: "#f8fafc",
      fontSize: 16,
      fontWeight: "900",
    },
    statLabel: {
      color: "#94a3b8",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.45,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      height: 28,
      backgroundColor:
        "rgba(148,163,184,0.16)",
    },
    progressTrack: {
      height: 9,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor:
        "rgba(15,23,42,0.92)",
      marginTop: 12,
      borderWidth: 1,
      borderColor:
        "rgba(249,115,22,0.22)",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
    },
    progressCaption: {
      color: "#fed7aa",
      fontSize: 9,
      fontWeight: "800",
      marginTop: 5,
      textAlign: "right",
    },
    description: {
      color: "#cbd5e1",
      fontSize: 11,
      lineHeight: 17,
      marginTop: 13,
    },
    missions: {
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        "rgba(249,115,22,0.20)",
      backgroundColor:
        "rgba(124,45,18,0.10)",
      padding: 11,
      marginTop: 13,
      gap: 7,
    },
    eyebrow: {
      color: "#a78bfa",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.65,
    },
    sectionEyebrow: {
      color: "#fb923c",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.7,
    },
    missionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    missionEmoji: {
      width: 20,
      fontSize: 13,
    },
    missionText: {
      flex: 1,
      color: "#e2e8f0",
      fontSize: 10.5,
      fontWeight: "700",
    },
    missionPoints: {
      color: "#fde68a",
      fontSize: 10,
      fontWeight: "900",
    },
    trackHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 10,
      marginTop: 17,
      marginBottom: 9,
    },
    trackTitle: {
      color: "#f8fafc",
      fontSize: 14,
      fontWeight: "900",
      marginTop: 2,
    },
    freePill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        "rgba(52,211,153,0.42)",
      backgroundColor:
        "rgba(52,211,153,0.12)",
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    freePillText: {
      color: "#6ee7b7",
      fontSize: 9,
      fontWeight: "900",
    },
    premiumEyebrow: {
      color: "#c084fc",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.7,
    },
    premiumPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        "rgba(253,230,138,0.32)",
      backgroundColor:
        "rgba(113,63,18,0.16)",
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    premiumPillOwned: {
      borderColor:
        "rgba(52,211,153,0.36)",
      backgroundColor:
        "rgba(52,211,153,0.10)",
    },
    premiumPillText: {
      color: "#fde68a",
      fontSize: 9,
      fontWeight: "900",
    },
    premiumPurchaseCard: {
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        "rgba(167,139,250,0.30)",
      backgroundColor:
        "rgba(76,29,149,0.13)",
      padding: 11,
      marginBottom: 10,
      gap: 9,
    },
    premiumPurchaseCopy: {
      gap: 3,
    },
    premiumPurchaseTitle: {
      color: "#f5f3ff",
      fontSize: 12,
      fontWeight: "900",
    },
    premiumPurchaseText: {
      color: "#c4b5fd",
      fontSize: 9.5,
      lineHeight: 14,
      fontWeight: "700",
    },
    premiumStoreStatus: {
      color: "#fbbf24",
      fontSize: 8.5,
      lineHeight: 12,
      fontWeight: "800",
      marginTop: 3,
    },
    unlockPremiumButton: {
      minHeight: 42,
      borderRadius: 12,
      backgroundColor: "#c084fc",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingHorizontal: 12,
    },
    unlockPremiumText: {
      color: "#020617",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.25,
    },
    restoreButton: {
      alignSelf: "center",
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    restoreButtonText: {
      color: "#c4b5fd",
      fontSize: 9,
      fontWeight: "800",
      textDecorationLine: "underline",
    },
    rewardList: {
      gap: 8,
    },
    rewardCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      borderRadius: 14,
      borderWidth: 1,
      backgroundColor:
        "rgba(2,6,23,0.48)",
      padding: 9,
    },
    rewardPreview: {
      width: 39,
      height: 39,
      borderRadius: 12,
      alignItems: "center",
      justifyContent:
        "center",
    },
    rewardEmoji: {
      fontSize: 21,
    },
    rewardCopy: {
      flex: 1,
      minWidth: 0,
    },
    rewardPoints: {
      color: "#94a3b8",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.35,
    },
    rewardTitle: {
      color: "#f8fafc",
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "900",
      marginTop: 1,
    },
    rewardValue: {
      color: "#fde68a",
      fontSize: 9.5,
      lineHeight: 13,
      fontWeight: "800",
      marginTop: 2,
    },
    rewardDescription: {
      color: "#94a3b8",
      fontSize: 8.5,
      lineHeight: 12,
      fontWeight: "700",
      marginTop: 4,
    },
    collectibleTag: {
      color: "#c4b5fd",
      fontSize: 7.5,
      fontWeight: "900",
      letterSpacing: 0.35,
      marginTop: 2,
    },
    claimButton: {
      minWidth: 64,
      minHeight: 34,
      borderRadius: 10,
      backgroundColor:
        "#fb923c",
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 8,
    },
    claimedButton: {
      backgroundColor:
        "rgba(52,211,153,0.16)",
      borderWidth: 1,
      borderColor:
        "rgba(52,211,153,0.30)",
    },
    premiumLockedButton: {
      backgroundColor:
        "rgba(113,63,18,0.24)",
      borderWidth: 1,
      borderColor:
        "rgba(253,230,138,0.22)",
    },
    lockedButton: {
      backgroundColor:
        "rgba(51,65,85,0.45)",
    },
    claimButtonText: {
      color: "#1c0a02",
      fontSize: 9,
      fontWeight: "900",
    },
    claimButtonTextMuted: {
      color: "#94a3b8",
    },
    message: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        "rgba(253,230,138,0.22)",
      backgroundColor:
        "rgba(113,63,18,0.14)",
      padding: 9,
      marginTop: 11,
    },
    messageText: {
      flex: 1,
      color: "#fef3c7",
      fontSize: 10,
      lineHeight: 14,
      fontWeight: "800",
    },
    pressed: {
      opacity: 0.72,
      transform: [
        {
          scale: 0.985,
        },
      ],
    },
  });
