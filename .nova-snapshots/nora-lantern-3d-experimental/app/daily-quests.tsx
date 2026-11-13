// app/daily-quests.tsx
import React, {
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
import {
  Ionicons,
} from "@expo/vector-icons";
import {
  LinearGradient,
} from "expo-linear-gradient";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  useDailyQuests,
  type DailyQuestId,
} from "./context/DailyQuestsContext";
import {
  useToast,
} from "./context/ToastContext";

export default function DailyQuestsScreen() {
  const router =
    useRouter();
  const params =
    useLocalSearchParams<{
      from?: string;
      returnTo?: string;
    }>();
  const insets =
    useSafeAreaInsets();
  const {
    ready,
    quests,
    completedCount,
    allComplete,
    bonusClaimed,
    bonusRewardCoins,
    claimQuest,
    claimBonus,
  } = useDailyQuests();
  const {
    show: showToast,
  } = useToast();

  const [
    claiming,
    setClaiming,
  ] = useState<
    string | null
  >(null);

  const goBack =
    () => {
      const returnTo =
        typeof params.returnTo ===
        "string"
          ? params.returnTo
          : "";

      if (
        returnTo.startsWith("/") &&
        !returnTo.startsWith("//") &&
        !returnTo.startsWith(
          "/daily-quests"
        )
      ) {
        router.replace(
          returnTo as any
        );
        return;
      }

      if (
        params.from ===
        "island"
      ) {
        router.replace(
          "/island" as any
        );
        return;
      }

      router.back();
    };

  const onClaimQuest =
    async (
      id: DailyQuestId
    ) => {
      if (claiming) return;

      setClaiming(id);

      try {
        const reward =
          await claimQuest(id);

        if (reward > 0) {
          showToast(
            `Daily Quest complete! +${reward} coins`
          );
        }
      } finally {
        setClaiming(null);
      }
    };

  const onClaimBonus =
    async () => {
      if (claiming) return;

      setClaiming("bonus");

      try {
        const reward =
          await claimBonus();

        if (reward > 0) {
          showToast(
            `All Daily Quests complete! +${reward} bonus coins`
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
        "#07152d",
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
                insets.top + 18,
                34
              ),
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={
              goBack
            }
            style={styles.back}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color="#67E8F9"
            />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={styles.eyebrow}
            >
              NOVA DAILY
            </Text>
            <Text
              style={styles.title}
            >
              Daily Quests
            </Text>
            <Text
              style={styles.subtitle}
            >
              Learn a little today,
              earn a little today.
              New quests arrive at midnight.
            </Text>
          </View>
        </View>

        {!ready ? (
          <View
            style={styles.loading}
          >
            <ActivityIndicator
              color="#67E8F9"
            />
            <Text
              style={styles.muted}
            >
              Loading today&apos;s
              quests...
            </Text>
          </View>
        ) : (
          <>
            <View
              style={
                styles.summaryCard
              }
            >
              <View>
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  TODAY&apos;S PROGRESS
                </Text>
                <Text
                  style={
                    styles.summaryTitle
                  }
                >
                  {completedCount} / 3
                  quests complete
                </Text>
              </View>

              <View
                style={
                  styles.summaryBadge
                }
              >
                <Text
                  style={
                    styles.summaryBadgeText
                  }
                >
                  {Math.round(
                    (
                      completedCount /
                      3
                    ) * 100
                  )}
                  %
                </Text>
              </View>
            </View>

            {quests.map(
              (quest) => {
                const canClaim =
                  quest.complete &&
                  !quest.claimed;

                return (
                  <View
                    key={quest.id}
                    style={
                      styles.questCard
                    }
                  >
                    <View
                      style={
                        styles.questTop
                      }
                    >
                      <View
                        style={
                          styles.questIcon
                        }
                      >
                        <Ionicons
                          name={
                            quest.claimed
                              ? "checkmark"
                              : quest.complete
                              ? "sparkles"
                              : "school-outline"
                          }
                          size={20}
                          color={
                            quest.claimed
                              ? "#86EFAC"
                              : "#67E8F9"
                          }
                        />
                      </View>

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={
                            styles.questTitle
                          }
                        >
                          {quest.title}
                        </Text>

                        <Text
                          style={
                            styles.questDescription
                          }
                        >
                          {
                            quest.description
                          }
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.progressRow
                      }
                    >
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
                                `${
                                  Math.min(
                                    100,
                                    Math.round(
                                      (
                                        quest.progress /
                                        quest.target
                                      ) *
                                        100
                                    )
                                  )
                                }%`,
                            },
                          ]}
                        />
                      </View>

                      <Text
                        style={
                          styles.progressText
                        }
                      >
                        {quest.progress} /{" "}
                        {quest.target}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.rewardRow
                      }
                    >
                      <Text
                        style={
                          styles.rewardText
                        }
                      >
                        +{
                          quest.rewardCoins
                        } coins
                      </Text>

                      {quest.claimed ? (
                        <View
                          style={
                            styles.claimedPill
                          }
                        >
                          <Text
                            style={
                              styles.claimedText
                            }
                          >
                            CLAIMED
                          </Text>
                        </View>
                      ) : (
                        <Pressable
                          disabled={
                            !canClaim ||
                            !!claiming
                          }
                          onPress={() =>
                            void onClaimQuest(
                              quest.id
                            )
                          }
                          style={({
                            pressed,
                          }) => [
                            styles.claimButton,
                            !canClaim &&
                              styles.disabled,
                            pressed &&
                              canClaim &&
                              styles.pressed,
                          ]}
                        >
                          <Text
                            style={
                              styles.claimButtonText
                            }
                          >
                            {quest.complete
                              ? claiming ===
                                quest.id
                                ? "Claiming..."
                                : "Claim"
                              : "In Progress"}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              }
            )}

            <View
              style={
                styles.bonusCard
              }
            >
              <Text
                style={
                  styles.bonusEyebrow
                }
              >
                COMPLETE ALL 3
              </Text>

              <Text
                style={
                  styles.bonusTitle
                }
              >
                Daily Quest Bonus
              </Text>

              <Text
                style={
                  styles.bonusText
                }
              >
                Finish every quest
                today for an extra{" "}
                {bonusRewardCoins} coins.
              </Text>

              {bonusClaimed ? (
                <View
                  style={
                    styles.bonusClaimed
                  }
                >
                  <Text
                    style={
                      styles.bonusClaimedText
                    }
                  >
                    BONUS CLAIMED
                  </Text>
                </View>
              ) : (
                <Pressable
                  disabled={
                    !allComplete ||
                    !!claiming
                  }
                  onPress={() =>
                    void onClaimBonus()
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.bonusButton,
                    !allComplete &&
                      styles.disabled,
                    pressed &&
                      allComplete &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={
                      styles.bonusButtonText
                    }
                  >
                    {claiming ===
                    "bonus"
                      ? "Claiming..."
                      : allComplete
                      ? `Claim +${bonusRewardCoins}`
                      : "Complete all quests"}
                  </Text>
                </Pressable>
              )}
            </View>

            <Text
              style={
                styles.footerNote
              }
            >
              Legendary reward bonuses
              apply when eligible.
            </Text>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles =
  StyleSheet.create({
    page: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 18,
      paddingBottom: 44,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      columnGap: 12,
      marginBottom: 20,
    },
    back: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor:
        "rgba(103,232,249,0.4)",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(8,145,178,0.12)",
    },
    eyebrow: {
      color: "#67E8F9",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.6,
    },
    title: {
      color: "#FFFFFF",
      fontSize: 28,
      fontWeight: "900",
      marginTop: 3,
    },
    subtitle: {
      color: "#94A3B8",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 5,
    },
    loading: {
      paddingVertical: 44,
      alignItems: "center",
      rowGap: 10,
    },
    muted: {
      color: "#94A3B8",
    },
    summaryCard: {
      borderWidth: 1,
      borderColor:
        "rgba(34,211,238,0.38)",
      backgroundColor:
        "rgba(8,145,178,0.10)",
      borderRadius: 18,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 14,
    },
    summaryLabel: {
      color: "#67E8F9",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
    },
    summaryTitle: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "900",
      marginTop: 4,
    },
    summaryBadge: {
      minWidth: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#22D3EE",
      backgroundColor:
        "rgba(34,211,238,0.10)",
    },
    summaryBadgeText: {
      color: "#CFFAFE",
      fontWeight: "900",
    },
    questCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        "rgba(148,163,184,0.24)",
      backgroundColor:
        "rgba(15,23,42,0.78)",
      padding: 16,
      marginBottom: 12,
    },
    questTop: {
      flexDirection: "row",
      columnGap: 12,
    },
    questIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(34,211,238,0.10)",
      borderWidth: 1,
      borderColor:
        "rgba(34,211,238,0.25)",
    },
    questTitle: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "900",
    },
    questDescription: {
      color: "#94A3B8",
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 10,
      marginTop: 14,
    },
    track: {
      flex: 1,
      height: 8,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor:
        "rgba(148,163,184,0.18)",
    },
    fill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: "#22D3EE",
    },
    progressText: {
      color: "#CBD5E1",
      fontSize: 11,
      fontWeight: "800",
      minWidth: 42,
      textAlign: "right",
    },
    rewardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 14,
    },
    rewardText: {
      color: "#FDE047",
      fontSize: 13,
      fontWeight: "900",
    },
    claimButton: {
      minWidth: 104,
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: "#0891B2",
    },
    claimButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
    },
    disabled: {
      opacity: 0.42,
    },
    pressed: {
      opacity: 0.75,
    },
    claimedPill: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor:
        "rgba(34,197,94,0.12)",
      borderWidth: 1,
      borderColor:
        "rgba(134,239,172,0.45)",
    },
    claimedText: {
      color: "#86EFAC",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.7,
    },
    bonusCard: {
      marginTop: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        "rgba(250,204,21,0.65)",
      backgroundColor:
        "rgba(250,204,21,0.08)",
      padding: 18,
    },
    bonusEyebrow: {
      color: "#FDE047",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
    },
    bonusTitle: {
      color: "#FFFFFF",
      fontSize: 19,
      fontWeight: "900",
      marginTop: 4,
    },
    bonusText: {
      color: "#CBD5E1",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 5,
    },
    bonusButton: {
      marginTop: 14,
      alignItems: "center",
      paddingVertical: 11,
      borderRadius: 999,
      backgroundColor: "#CA8A04",
    },
    bonusButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
    },
    bonusClaimed: {
      marginTop: 14,
      alignSelf: "flex-start",
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor:
        "rgba(34,197,94,0.12)",
      borderWidth: 1,
      borderColor:
        "rgba(134,239,172,0.45)",
    },
    bonusClaimedText: {
      color: "#86EFAC",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.7,
    },
    footerNote: {
      color: "#64748B",
      fontSize: 11,
      textAlign: "center",
      marginTop: 16,
    },
  });
