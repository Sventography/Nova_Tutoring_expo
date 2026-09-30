// app/components/island3d/IslandEventPanel.tsx
import React, {
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  useNovaEvents,
} from "../../context/EventsContext";
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
                      styles.premiumNotice
                    }
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={15}
                      color="#c4b5fd"
                    />
                    <Text
                      style={
                        styles.premiumNoticeText
                      }
                    >
                      Premium rewards are visible now. Purchasing the Halloween pass will be connected to the app's IAP flow separately.
                    </Text>
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
    premiumNotice: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 7,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        "rgba(167,139,250,0.20)",
      backgroundColor:
        "rgba(76,29,149,0.11)",
      padding: 10,
      marginBottom: 9,
    },
    premiumNoticeText: {
      flex: 1,
      color: "#c4b5fd",
      fontSize: 9.5,
      lineHeight: 14,
      fontWeight: "700",
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
