// app/components/DailyWelcomeModal.tsx
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useRouter,
} from "expo-router";

import NovaGuideOverlay from "./NovaGuideOverlay";
import {
  useDailyDeal,
} from "../context/DailyDealContext";
import {
  useUser,
} from "../context/UserContext";
import {
  useNovaEvents,
} from "../context/EventsContext";

const PREFIX =
  "@nova/dailyGreeting.v1:";

function dateKey() {
  const d = new Date();

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function hello() {
  const h =
    new Date().getHours();

  return h < 12
    ? "Good morning"
    : h < 17
    ? "Good afternoon"
    : "Good evening";
}

export default function DailyWelcomeModal() {
  const router =
    useRouter();

  const {
    supabaseUserId,
    username,
    user,
  } = useUser();

  const {
    ready,
    deal,
  } = useDailyDeal();

  const {
    activeEvent,
    points: eventPoints,
    maxPoints: eventMaxPoints,
    unclaimedRewardCount,
  } = useNovaEvents();

  const eventCollectibleCount =
    activeEvent
      ? [
          ...activeEvent.freeTrack,
          ...activeEvent.premiumTrack,
        ].filter(
          (reward) =>
            Boolean(
              reward.decorationId
            )
        ).length
      : 0;

  const [
    visible,
    setVisible,
  ] = useState(false);

  const owner =
    supabaseUserId ||
    "guest";

  const name =
    useMemo(
      () =>
        String(
          username ||
            user?.displayName ||
            user?.name ||
            "Student"
        ).trim() ||
        "Student",
      [
        username,
        user?.displayName,
        user?.name,
      ]
    );

  useEffect(() => {
    if (!ready) return;

    let cancelled =
      false;

    const checkForNewDay =
      async () => {
        try {
          const day =
            dateKey();

          const key =
            `${PREFIX}${owner}`;

          const lastShown =
            await AsyncStorage.getItem(
              key
            );

          if (
            cancelled ||
            lastShown === day
          ) {
            return;
          }

          /*
           * Persist first so a fast remount cannot
           * show the greeting twice for the same day.
           */
          await AsyncStorage.setItem(
            key,
            day
          );

          if (!cancelled) {
            setVisible(true);
          }
        } catch (error) {
          console.warn(
            "[DailyWelcome] state failed",
            error
          );
        }
      };

    const initialTimer =
      setTimeout(
        checkForNewDay,
        700
      );

    /*
     * If Nova remains open through midnight,
     * notice the new local calendar day.
     */
    const dayTimer =
      setInterval(
        checkForNewDay,
        60 * 1000
      );

    /*
     * iOS may suspend timers in the background,
     * so check immediately when Nova becomes active.
     */
    const appStateSub =
      AppState.addEventListener(
        "change",
        (nextState) => {
          if (
            nextState ===
            "active"
          ) {
            checkForNewDay();
          }
        }
      );

    return () => {
      cancelled = true;
      clearTimeout(
        initialTimer
      );
      clearInterval(
        dayTimer
      );
      appStateSub.remove();
    };
  }, [
    ready,
    owner,
  ]);

  const dismiss = () => {
    setVisible(false);
  };

  const openDeal = () => {
    dismiss();

    setTimeout(
      () =>
        router.push(
          "/shop" as any
        ),
      120
    );
  };

  const openQuests = () => {
    dismiss();

    setTimeout(
      () =>
        router.push(
          "/daily-quests" as any
        ),
      120
    );
  };

  const openEvent = () => {
    dismiss();

    setTimeout(
      () =>
        router.push(
          "/island" as any
        ),
      120
    );
  };

  return (
    <NovaGuideOverlay
      visible={visible}
      onDismiss={dismiss}
      pose="welcome"
      eyebrow="NOVA DAILY"
      title={`${hello()}, ${name}!`}
      message={
        activeEvent
          ? "I’ve got today’s quests, deal, and event progress ready for you."
          : "I’ve got today’s quests and spotlight ready for you. What do you want to check first?"
      }
      primaryAction={{
        label:
          "View Daily Quests",
        onPress:
          openQuests,
      }}
      secondaryAction={
        deal
          ? {
              label:
                "View Today’s Deal",
              onPress:
                openDeal,
            }
          : undefined
      }
      dismissLabel="Maybe Later"
    >
      {deal ? (
        <View style={styles.spotlight}>
          <Text
            style={
              styles.spotlightEyebrow
            }
          >
            TODAY&apos;S NOVA DEAL
          </Text>

          <Text
            style={
              styles.spotlightTitle
            }
          >
            {deal.title}
          </Text>

          <View
            style={
              styles.priceRow
            }
          >
            <Text
              style={
                styles.oldPrice
              }
            >
              {deal.originalCoinPrice.toLocaleString()}{" "}
              coins
            </Text>

            <Text
              style={
                styles.newPrice
              }
            >
              {deal.discountedCoinPrice.toLocaleString()}{" "}
              coins
            </Text>
          </View>

          <Text
            style={
              styles.discount
            }
          >
            {
              deal.discountPercent
            }
            % OFF WITH NOVA COINS - TODAY ONLY
          </Text>
        </View>
      ) : (
        <View style={styles.spotlight}>
          <Text
            style={
              styles.spotlightEyebrow
            }
          >
            NOVA DAILY
          </Text>

          <Text
            style={
              styles.caughtUp
            }
          >
            Your daily quests are
            ready whenever you are.
          </Text>
        </View>
      )}

      {activeEvent ? (
        <View
          style={[
            styles.eventSpotlight,
            {
              borderColor:
                activeEvent.accent,
              backgroundColor:
                activeEvent.accentSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.eventEyebrow,
              {
                color:
                  activeEvent.accent,
              },
            ]}
          >
            LIVE EVENT
          </Text>

          <Text
            style={
              styles.eventTitle
            }
          >
            {activeEvent.shortTitle}
          </Text>

          <Text
            style={
              styles.eventSummary
            }
          >
            {eventPoints.toLocaleString()}
            /{eventMaxPoints.toLocaleString()} XP
            {"  •  "}
            {unclaimedRewardCount} reward
            {unclaimedRewardCount === 1
              ? ""
              : "s"}{" "}
            ready
            {eventCollectibleCount > 0
              ? `  •  ${eventCollectibleCount} collectible${eventCollectibleCount === 1 ? "" : "s"}`
              : ""}
          </Text>

          <Pressable
            onPress={openEvent}
            accessibilityRole="button"
            accessibilityLabel={
              "View live event rewards"
            }
            style={({
              pressed,
            }) => [
              styles.eventButton,
              {
                borderColor:
                  activeEvent.accent,
              },
              pressed &&
                styles.eventButtonPressed,
            ]}
          >
            <Text
              style={[
                styles.eventButtonText,
                {
                  color:
                    activeEvent.accent,
                },
              ]}
            >
              View Event Rewards
            </Text>
          </Pressable>
        </View>
      ) : null}
    </NovaGuideOverlay>
  );
}

const styles =
  StyleSheet.create({
    spotlight: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        "rgba(250,204,21,0.55)",
      backgroundColor:
        "rgba(250,204,21,0.07)",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    spotlightEyebrow: {
      color: "#FDE047",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.1,
      textAlign: "center",
    },
    spotlightTitle: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
      marginTop: 5,
    },
    priceRow: {
      marginTop: 7,
      flexDirection: "row",
      justifyContent:
        "center",
      alignItems: "baseline",
      columnGap: 9,
      flexWrap: "wrap",
    },
    oldPrice: {
      color: "#94A3B8",
      fontSize: 12,
      fontWeight: "700",
      textDecorationLine:
        "line-through",
    },
    newPrice: {
      color: "#FDE047",
      fontSize: 16,
      fontWeight: "900",
    },
    discount: {
      color: "#FACC15",
      fontSize: 9,
      lineHeight: 13,
      fontWeight: "900",
      textAlign: "center",
      marginTop: 5,
    },
    caughtUp: {
      color: "#CBD5E1",
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 5,
    },
    eventSpotlight: {
      marginTop: 10,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    eventEyebrow: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.1,
      textAlign: "center",
    },
    eventTitle: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
      marginTop: 5,
    },
    eventSummary: {
      color: "#CBD5E1",
      fontSize: 10,
      lineHeight: 15,
      fontWeight: "800",
      textAlign: "center",
      marginTop: 4,
    },
    eventButton: {
      alignSelf: "center",
      marginTop: 7,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor:
        "rgba(2,6,23,0.58)",
    },
    eventButtonPressed: {
      opacity: 0.72,
    },
    eventButtonText: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.3,
    },
  });
