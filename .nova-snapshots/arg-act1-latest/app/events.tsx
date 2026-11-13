// app/events.tsx
import React, {
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Ionicons,
} from "@expo/vector-icons";
import {
  LinearGradient,
} from "expo-linear-gradient";
import {
  useRouter,
} from "expo-router";
import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import NovaGuideOverlay from "./components/NovaGuideOverlay";
import {
  useNovaEvents,
} from "./context/EventsContext";
import {
  useToast,
} from "./context/ToastContext";
import {
  useUser,
} from "./context/UserContext";

const INTRO_PREFIX =
  "@nova/eventIntro.v1:";

export default function EventsScreen() {
  const router =
    useRouter();
  const insets =
    useSafeAreaInsets();

  const {
    supabaseUserId,
  } = useUser();

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
    rewardCoinsFor,
    claimFreeReward,
    claimPremiumReward,
  } = useNovaEvents();

  const {
    show: showToast,
  } = useToast();

  const [
    claiming,
    setClaiming,
  ] = useState<
    string | null
  >(null);

  const [
    showIntro,
    setShowIntro,
  ] = useState(false);

  const owner =
    supabaseUserId ||
    "guest";

  useEffect(() => {
    if (
      !ready ||
      !activeEvent
    ) {
      return;
    }

    let cancelled =
      false;

    const timer =
      setTimeout(() => {
        (async () => {
          const key =
            `${INTRO_PREFIX}${owner}:${activeEvent.id}`;

          try {
            if (
              (
                await AsyncStorage.getItem(
                  key
                )
              ) === "seen" ||
              cancelled
            ) {
              return;
            }

            await AsyncStorage.setItem(
              key,
              "seen"
            );

            if (!cancelled) {
              setShowIntro(
                true
              );
            }
          } catch {
            if (!cancelled) {
              setShowIntro(
                true
              );
            }
          }
        })();
      }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    activeEvent,
    owner,
    ready,
  ]);

  const onClaim =
    async (
      rewardId: string
    ) => {
      if (claiming) {
        return;
      }

      setClaiming(
        rewardId
      );

      try {
        const reward =
          await claimFreeReward(
            rewardId
          );

        if (reward > 0) {
          showToast(
            `Event reward claimed! +${reward} coins`
          );
        }
      } finally {
        setClaiming(null);
      }
    };

  const onClaimPremium =
    async (
      rewardId: string
    ) => {
      if (claiming) {
        return;
      }

      setClaiming(
        rewardId
      );

      try {
        const reward =
          await claimPremiumReward(
            rewardId
          );

        if (reward > 0) {
          showToast(
            `Premium event reward claimed! +${reward} coins`
          );
        }
      } finally {
        setClaiming(null);
      }
    };

  return (
    <LinearGradient
      colors={[
        "#020617",
        "#10112F",
        "#020617",
      ]}
      style={styles.page}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop:
              Math.max(
                insets.top + 16,
                32
              ),
            paddingBottom:
              Math.max(
                insets.bottom + 36,
                52
              ),
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={
            styles.header
          }
        >
          <Pressable
            onPress={() =>
              router.back()
            }
            style={
              styles.back
            }
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color="#C4B5FD"
            />
          </Pressable>

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              NOVA EVENTS
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Events
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Limited-time learning
              tracks, rewards, and
              future island surprises.
            </Text>
          </View>
        </View>

        {!ready ? (
          <View
            style={
              styles.loading
            }
          >
            <ActivityIndicator
              color="#C4B5FD"
            />
            <Text
              style={
                styles.muted
              }
            >
              Checking the event
              calendar...
            </Text>
          </View>
        ) : activeEvent ? (
          <>
            <LinearGradient
              colors={[
                "#312E81",
                "#581C87",
                "#111827",
              ]}
              style={
                styles.hero
              }
            >
              <View
                style={
                  styles.heroTop
                }
              >
                <View
                  style={
                    styles.livePill
                  }
                >
                  <View
                    style={
                      styles.liveDot
                    }
                  />
                  <Text
                    style={
                      styles.liveText
                    }
                  >
                    LIVE EVENT
                  </Text>
                </View>

                <Text
                  style={
                    styles.dayText
                  }
                >
                  Day {eventDay} ·{" "}
                  {daysRemaining} days
                  left
                </Text>
              </View>

              <Text
                style={
                  styles.eventTitle
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
                  styles.progressHeader
                }
              >
                <Text
                  style={
                    styles.progressLabel
                  }
                >
                  EVENT XP
                </Text>
                <Text
                  style={
                    styles.progressValue
                  }
                >
                  {points} /{" "}
                  {maxPoints}
                </Text>
              </View>

              <View
                style={
                  styles.track
                }
              >
                <View
                  style={[
                    styles.fill,
                    {
                      width:
                        `${progress * 100}%`,
                    },
                  ]}
                />
              </View>

              <Text
                style={
                  styles.xpHint
                }
              >
                Correct quiz answers
                earn 1 Event XP.
                Finishing a quiz earns
                +15, and scoring 80%+
                earns another +10.
              </Text>
            </LinearGradient>

            <View
              style={
                styles.sectionHeader
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
                    styles.sectionTitle
                  }
                >
                  Festival rewards
                </Text>
              </View>

              <Ionicons
                name="gift-outline"
                size={22}
                color="#FDE68A"
              />
            </View>

            {activeEvent.freeTrack.map(
              (reward) => {
                const unlocked =
                  points >=
                  reward.requiredPoints;

                const claimed =
                  claimedFreeRewardIds.includes(
                    reward.id
                  );

                const rewardCoins =
                  rewardCoinsFor(
                    reward.baseCoins
                  );

                return (
                  <View
                    key={
                      reward.id
                    }
                    style={[
                      styles.rewardCard,
                      unlocked &&
                        styles.rewardCardUnlocked,
                    ]}
                  >
                    <View
                      style={
                        styles.rewardLevel
                      }
                    >
                      <Text
                        style={
                          styles.rewardPoints
                        }
                      >
                        {
                          reward.requiredPoints
                        }
                      </Text>
                      <Text
                        style={
                          styles.rewardXp
                        }
                      >
                        XP
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.rewardTitle
                        }
                      >
                        {
                          reward.label
                        }
                      </Text>

                      <Text
                        style={
                          styles.rewardDescription
                        }
                      >
                        +
                        {rewardCoins.toLocaleString()}{" "}
                        Nova Coins
                        {rewardCoins !==
                        reward.baseCoins
                          ? ` · boosted from ${reward.baseCoins}`
                          : ""}
                      </Text>
                    </View>

                    <Pressable
                      disabled={
                        !unlocked ||
                        claimed ||
                        claiming !==
                          null
                      }
                      onPress={() =>
                        void onClaim(
                          reward.id
                        )
                      }
                      style={[
                        styles.claim,
                        unlocked &&
                          !claimed &&
                          styles.claimReady,
                        (!unlocked ||
                          claimed) &&
                          styles.claimDisabled,
                      ]}
                    >
                      <Text
                        style={
                          styles.claimText
                        }
                      >
                        {claimed
                          ? "Claimed"
                          : unlocked
                          ? claiming ===
                            reward.id
                            ? "..."
                            : "Claim"
                          : "Locked"}
                      </Text>
                    </Pressable>
                  </View>
                );
              }
            )}

            <View
              style={
                styles.premiumCard
              }
            >
              <View
                style={
                  styles.premiumTop
                }
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.premiumEyebrow
                    }
                  >
                    PREMIUM TRACK
                  </Text>
                  <Text
                    style={
                      styles.premiumTitle
                    }
                  >
                    Starlight Premium
                  </Text>
                </View>

                <View
                  style={[
                    styles.premiumStatus,
                    premiumPassOwned &&
                      styles.premiumStatusOwned,
                  ]}
                >
                  <Ionicons
                    name={
                      premiumPassOwned
                        ? "checkmark-circle"
                        : "lock-closed"
                    }
                    size={15}
                    color={
                      premiumPassOwned
                        ? "#86EFAC"
                        : "#E9D5FF"
                    }
                  />
                  <Text
                    style={[
                      styles.premiumStatusText,
                      premiumPassOwned &&
                        styles.premiumStatusTextOwned,
                    ]}
                  >
                    {premiumPassOwned
                      ? "OWNED"
                      : "LOCKED"}
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.premiumBody
                }
              >
                {premiumPassOwned
                  ? "Your Premium Pass is active. Every premium milestone at or below your current Event XP can be claimed now."
                  : "Premium uses the same Event XP as the free track. Buying the pass later will instantly unlock every premium milestone you have already reached."}
              </Text>

              {!premiumPassOwned && (
                <View
                  style={
                    styles.premiumPurchaseNote
                  }
                >
                  <Ionicons
                    name="logo-apple-appstore"
                    size={18}
                    color="#F0ABFC"
                  />
                  <Text
                    style={
                      styles.premiumPurchaseNoteText
                    }
                  >
                    Store purchase comes next. The reward lane and entitlement system are ready first.
                  </Text>
                </View>
              )}

              {activeEvent.premiumTrack.map(
                (reward) => {
                  const reached =
                    points >=
                    reward.requiredPoints;

                  const claimed =
                    claimedPremiumRewardIds.includes(
                      reward.id
                    );

                  const rewardCoins =
                    rewardCoinsFor(
                      reward.baseCoins
                    );

                  const claimable =
                    premiumPassOwned &&
                    reached &&
                    !claimed;

                  return (
                    <View
                      key={
                        reward.id
                      }
                      style={[
                        styles.premiumRewardCard,
                        reached &&
                          styles.premiumRewardReached,
                        claimable &&
                          styles.premiumRewardClaimable,
                      ]}
                    >
                      <View
                        style={
                          styles.premiumRewardLevel
                        }
                      >
                        <Text
                          style={
                            styles.premiumRewardPoints
                          }
                        >
                          {
                            reward.requiredPoints
                          }
                        </Text>
                        <Text
                          style={
                            styles.premiumRewardXp
                          }
                        >
                          XP
                        </Text>
                      </View>

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={
                            styles.premiumRewardTitle
                          }
                        >
                          {
                            reward.label
                          }
                        </Text>

                        <Text
                          style={
                            styles.premiumRewardDescription
                          }
                        >
                          +
                          {rewardCoins.toLocaleString()}{" "}
                          Nova Coins
                          {rewardCoins !==
                          reward.baseCoins
                            ? ` · boosted from ${reward.baseCoins}`
                            : ""}
                        </Text>
                      </View>

                      <Pressable
                        disabled={
                          !claimable ||
                          claiming !==
                            null
                        }
                        onPress={() =>
                          void onClaimPremium(
                            reward.id
                          )
                        }
                        style={[
                          styles.premiumClaim,
                          claimable &&
                            styles.premiumClaimReady,
                          (!claimable ||
                            claimed) &&
                            styles.premiumClaimDisabled,
                        ]}
                      >
                        <Ionicons
                          name={
                            claimed
                              ? "checkmark"
                              : !premiumPassOwned
                              ? "lock-closed"
                              : reached
                              ? "gift-outline"
                              : "star-outline"
                          }
                          size={13}
                          color="#FFFFFF"
                        />
                        <Text
                          style={
                            styles.premiumClaimText
                          }
                        >
                          {claimed
                            ? "Claimed"
                            : !premiumPassOwned
                            ? "Premium"
                            : reached
                            ? claiming ===
                              reward.id
                              ? "..."
                              : "Claim"
                            : "Locked"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                }
              )}
            </View>
          </>
        ) : (
          <View
            style={
              styles.emptyCard
            }
          >
            <Ionicons
              name="calendar-outline"
              size={34}
              color="#94A3B8"
            />
            <Text
              style={
                styles.emptyTitle
              }
            >
              No event is active
            </Text>

            <Text
              style={
                styles.emptyBody
              }
            >
              {upcomingEvent
                ? `${upcomingEvent.title} begins ${upcomingEvent.startDate}.`
                : "Nova will announce the next event when it is ready."}
            </Text>
          </View>
        )}
      </ScrollView>

      {activeEvent ? (
        <NovaGuideOverlay
          visible={
            showIntro
          }
          onDismiss={() =>
            setShowIntro(false)
          }
          pose="welcome"
          eyebrow="NOVA EVENT"
          title={
            activeEvent.title
          }
          message="This is a limited-time learning track. Keep studying, build Event XP, and claim rewards as you reach each milestone."
          dismissLabel="Let’s Go"
        >
          <View
            style={
              styles.guideNote
            }
          >
            <Ionicons
              name="star-outline"
              size={17}
              color="#FDE68A"
            />
            <Text
              style={
                styles.guideNoteText
              }
            >
              The free track is open
              to everyone. Premium uses
              the same Event XP and
              unlocks retroactively.
            </Text>
          </View>
        </NovaGuideOverlay>
      ) : null}
    </LinearGradient>
  );
}

const styles =
  StyleSheet.create({
    page: {
      flex: 1,
    },
    content: {
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
      paddingHorizontal: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 11,
      marginBottom: 18,
    },
    back: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        "rgba(196,181,253,0.35)",
      backgroundColor:
        "rgba(76,29,149,0.18)",
      alignItems: "center",
      justifyContent:
        "center",
    },
    eyebrow: {
      color: "#C4B5FD",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.7,
    },
    title: {
      color: "#FFFFFF",
      fontSize: 30,
      fontWeight: "900",
      marginTop: 2,
    },
    subtitle: {
      color: "#CBD5E1",
      fontSize: 13,
      lineHeight: 18,
      marginTop: 3,
    },
    loading: {
      minHeight: 240,
      alignItems: "center",
      justifyContent:
        "center",
      gap: 10,
    },
    muted: {
      color: "#94A3B8",
      fontSize: 13,
      fontWeight: "700",
    },
    hero: {
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor:
        "rgba(196,181,253,0.55)",
      padding: 18,
      shadowColor: "#A78BFA",
      shadowOpacity: 0.25,
      shadowRadius: 18,
      shadowOffset: {
        width: 0,
        height: 8,
      },
    },
    heroTop: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      gap: 10,
    },
    livePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        "rgba(134,239,172,0.38)",
      backgroundColor:
        "rgba(22,101,52,0.28)",
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 7,
      backgroundColor:
        "#4ADE80",
    },
    liveText: {
      color: "#BBF7D0",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.8,
    },
    dayText: {
      color: "#DDD6FE",
      fontSize: 10,
      fontWeight: "800",
    },
    eventTitle: {
      color: "#FFFFFF",
      fontSize: 25,
      fontWeight: "900",
      marginTop: 18,
    },
    tagline: {
      color: "#FDE68A",
      fontSize: 14,
      fontWeight: "900",
      marginTop: 4,
    },
    description: {
      color: "#E2E8F0",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 9,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginTop: 18,
    },
    progressLabel: {
      color: "#DDD6FE",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },
    progressValue: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
    },
    track: {
      height: 11,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor:
        "rgba(255,255,255,0.10)",
      marginTop: 8,
    },
    fill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor:
        "#A78BFA",
    },
    xpHint: {
      color: "#C4B5FD",
      fontSize: 10,
      lineHeight: 15,
      marginTop: 8,
      fontWeight: "700",
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 24,
      marginBottom: 10,
    },
    sectionEyebrow: {
      color: "#FDE68A",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    sectionTitle: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 2,
    },
    rewardCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        "rgba(148,163,184,0.25)",
      backgroundColor:
        "rgba(15,23,42,0.76)",
      padding: 13,
      marginBottom: 10,
    },
    rewardCardUnlocked: {
      borderColor:
        "rgba(253,230,138,0.58)",
      backgroundColor:
        "rgba(120,53,15,0.16)",
    },
    rewardLevel: {
      width: 49,
      height: 49,
      borderRadius: 16,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(139,92,246,0.18)",
      borderWidth: 1,
      borderColor:
        "rgba(196,181,253,0.30)",
    },
    rewardPoints: {
      color: "#E9D5FF",
      fontSize: 14,
      fontWeight: "900",
    },
    rewardXp: {
      color: "#A78BFA",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    rewardTitle: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
    },
    rewardDescription: {
      color: "#CBD5E1",
      fontSize: 11,
      lineHeight: 15,
      marginTop: 3,
      fontWeight: "700",
    },
    claim: {
      minWidth: 69,
      minHeight: 38,
      borderRadius: 12,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent:
        "center",
      borderWidth: 1,
    },
    claimReady: {
      backgroundColor:
        "rgba(202,138,4,0.25)",
      borderColor:
        "rgba(253,230,138,0.72)",
    },
    claimDisabled: {
      backgroundColor:
        "rgba(30,41,59,0.48)",
      borderColor:
        "rgba(100,116,139,0.30)",
      opacity: 0.65,
    },
    claimText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "900",
    },
    premiumCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        "rgba(232,121,249,0.42)",
      backgroundColor:
        "rgba(88,28,135,0.18)",
      padding: 16,
      marginTop: 14,
    },
    premiumTop: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },
    premiumEyebrow: {
      color: "#F0ABFC",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.3,
    },
    premiumTitle: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "900",
      marginTop: 2,
    },
    premiumBody: {
      color: "#D8B4FE",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 9,
      marginBottom: 10,
    },
    previewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 7,
    },
    previewText: {
      color: "#E9D5FF",
      fontSize: 11,
      fontWeight: "700",
      flex: 1,
    },
    premiumStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        "rgba(233,213,255,0.36)",
      backgroundColor:
        "rgba(88,28,135,0.24)",
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    premiumStatusOwned: {
      borderColor:
        "rgba(134,239,172,0.45)",
      backgroundColor:
        "rgba(22,101,52,0.22)",
    },
    premiumStatusText: {
      color: "#E9D5FF",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.7,
    },
    premiumStatusTextOwned: {
      color: "#BBF7D0",
    },
    premiumPurchaseNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        "rgba(232,121,249,0.24)",
      backgroundColor:
        "rgba(88,28,135,0.14)",
      padding: 10,
      marginBottom: 12,
    },
    premiumPurchaseNoteText: {
      color: "#E9D5FF",
      fontSize: 10,
      lineHeight: 15,
      fontWeight: "700",
      flex: 1,
    },
    premiumRewardCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        "rgba(192,132,252,0.20)",
      backgroundColor:
        "rgba(30,27,75,0.42)",
      padding: 11,
      marginTop: 9,
    },
    premiumRewardReached: {
      borderColor:
        "rgba(216,180,254,0.38)",
    },
    premiumRewardClaimable: {
      borderColor:
        "rgba(240,171,252,0.72)",
      backgroundColor:
        "rgba(126,34,206,0.23)",
    },
    premiumRewardLevel: {
      width: 45,
      height: 45,
      borderRadius: 14,
      alignItems: "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        "rgba(232,121,249,0.35)",
      backgroundColor:
        "rgba(88,28,135,0.30)",
    },
    premiumRewardPoints: {
      color: "#F5D0FE",
      fontSize: 13,
      fontWeight: "900",
    },
    premiumRewardXp: {
      color: "#E879F9",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    premiumRewardTitle: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
    },
    premiumRewardDescription: {
      color: "#D8B4FE",
      fontSize: 10,
      lineHeight: 14,
      fontWeight: "700",
      marginTop: 2,
    },
    premiumClaim: {
      minWidth: 76,
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 8,
    },
    premiumClaimReady: {
      backgroundColor:
        "rgba(168,85,247,0.30)",
      borderColor:
        "rgba(240,171,252,0.78)",
    },
    premiumClaimDisabled: {
      backgroundColor:
        "rgba(30,41,59,0.40)",
      borderColor:
        "rgba(148,163,184,0.22)",
      opacity: 0.72,
    },
    premiumClaimText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "900",
    },
    emptyCard: {
      minHeight: 250,
      borderRadius: 22,
      borderWidth: 1,
      borderColor:
        "rgba(148,163,184,0.25)",
      backgroundColor:
        "rgba(15,23,42,0.72)",
      alignItems: "center",
      justifyContent:
        "center",
      padding: 24,
    },
    emptyTitle: {
      color: "#FFFFFF",
      fontSize: 19,
      fontWeight: "900",
      marginTop: 12,
    },
    emptyBody: {
      color: "#94A3B8",
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 6,
    },
    guideNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        "rgba(253,230,138,0.30)",
      backgroundColor:
        "rgba(120,53,15,0.12)",
      padding: 11,
    },
    guideNoteText: {
      color: "#FEF3C7",
      fontSize: 11,
      lineHeight: 16,
      fontWeight: "700",
      flex: 1,
    },
  });
