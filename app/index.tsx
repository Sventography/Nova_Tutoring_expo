// app/index.tsx

import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import {
  Redirect,
  useRouter,
} from "expo-router";
import * as Haptics from "expo-haptics";

import { useUser } from "./context/UserContext";
import { useIsland } from "./context/IslandContext";
import { useCoins } from "./context/CoinsContext";
import { useAchievements } from "./context/AchievementsContext";

const TUTORIAL_KEY =
  "onboarding.tutorial.done.v2";
const PENDING_CONFIRMATION_EMAIL_KEY =
  "nova.auth.pending-confirmation-email.v1";

type StartupDestination =
  | { type: "checking" }
  | { type: "home" }
  | { type: "tutorial" }
  | {
      type: "confirm-email";
      email: string;
    };

type SplashShimmerWaveProps = {
  duration: number;
  delay: number;
  opacity: number;
  widthMultiplier: number;
};

function SplashShimmerWave({
  duration,
  delay,
  opacity,
  widthMultiplier,
}: SplashShimmerWaveProps) {
  const {
    width,
    height,
  } = useWindowDimensions();

  const progress = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
    progress.setValue(0);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.inOut(
            Easing.sin
          ),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
      progress.stopAnimation();
    };
  }, [
    delay,
    duration,
    progress,
  ]);

  const waveWidth = Math.max(
    150,
    width * widthMultiplier
  );

  const translateX =
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [
        -waveWidth * 1.5,
        width + waveWidth * 1.25,
      ],
    });

  const animatedOpacity =
    progress.interpolate({
      inputRange: [
        0,
        0.08,
        0.5,
        0.92,
        1,
      ],
      outputRange: [
        0,
        opacity,
        opacity,
        opacity,
        0,
      ],
    });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shimmerWave,
        {
          width: waveWidth,
          height: height * 1.55,
          opacity:
            animatedOpacity,
          transform: [
            {
              translateX,
            },
            {
              translateY:
                -height * 0.26,
            },
            {
              rotate: "-18deg",
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={[
          "rgba(255,255,255,0)",
          "rgba(255,255,255,0.08)",
          "rgba(255,255,255,0.52)",
          "rgba(255,255,255,0.82)",
          "rgba(255,255,255,0.52)",
          "rgba(255,255,255,0.08)",
          "rgba(255,255,255,0)",
        ]}
        locations={[
          0,
          0.18,
          0.39,
          0.5,
          0.61,
          0.82,
          1,
        ]}
        start={{
          x: 0,
          y: 0.5,
        }}
        end={{
          x: 1,
          y: 0.5,
        }}
        style={
          StyleSheet.absoluteFill
        }
      />
    </Animated.View>
  );
}

function SplashShimmer() {
  return (
    <View
      pointerEvents="none"
      style={
        styles.shimmerLayer
      }
    >
      <SplashShimmerWave
        duration={5200}
        delay={0}
        opacity={0.42}
        widthMultiplier={0.44}
      />

      <SplashShimmerWave
        duration={7000}
        delay={2100}
        opacity={0.22}
        widthMultiplier={0.26}
      />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const {
    isLoggedIn,
    ready: userReady,
  } = (useUser() || {}) as any;

  const {
    grantDailyLoginXpIfNeeded,
    ready: islandReady,
  } = useIsland();

  const {
    resetGuestCoins,
  } = useCoins();

  const {
    resetGuestAchievements,
  } = useAchievements();

  const pulseAnim = useRef(
    new Animated.Value(1)
  ).current;

  const [
    startupDestination,
    setStartupDestination,
  ] =
    useState<StartupDestination>({
      type: "checking",
    });

  const [
    dailyLoginAwarded,
    setDailyLoginAwarded,
  ] = useState(false);

  const dailyLoginToastTimerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  useEffect(() => {
    if (!userReady) return;

    let cancelled = false;

    async function chooseStartupDestination() {
      try {
        if (isLoggedIn) {
          await AsyncStorage.removeItem(
            PENDING_CONFIRMATION_EMAIL_KEY
          );
        } else {
          const pendingEmail =
            String(
              (await AsyncStorage.getItem(
                PENDING_CONFIRMATION_EMAIL_KEY
              )) || ""
            )
              .trim()
              .toLowerCase();

          if (pendingEmail) {
            if (!cancelled) {
              setStartupDestination({
                type:
                  "confirm-email",
                email:
                  pendingEmail,
              });
            }

            return;
          }
        }

        const tutorialDone =
          await AsyncStorage.getItem(
            TUTORIAL_KEY
          );

        if (cancelled) {
          return;
        }

        setStartupDestination(
          tutorialDone === "1"
            ? { type: "home" }
            : {
                type: "tutorial",
              }
        );
      } catch (error) {
        console.warn(
          "[HomeScreen] startup routing error:",
          error
        );

        if (!cancelled) {
          setStartupDestination({
            type: "tutorial",
          });
        }
      }
    }

    void chooseStartupDestination();

    return () => {
      cancelled = true;
    };
  }, [
    isLoggedIn,
    userReady,
  ]);

  useEffect(() => {
    if (
      !userReady ||
      !islandReady ||
      !isLoggedIn
    ) {
      return;
    }

    let cancelled = false;

    void grantDailyLoginXpIfNeeded()
      .then((awarded) => {
        if (
          cancelled ||
          !awarded
        ) {
          return;
        }

        setDailyLoginAwarded(
          true
        );

        if (
          dailyLoginToastTimerRef.current
        ) {
          clearTimeout(
            dailyLoginToastTimerRef.current
          );
        }

        dailyLoginToastTimerRef.current =
          setTimeout(() => {
            setDailyLoginAwarded(
              false
            );

            dailyLoginToastTimerRef.current =
              null;
          }, 3600);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    }, [
    grantDailyLoginXpIfNeeded,
    islandReady,
    isLoggedIn,
    userReady,
  ]);

  useEffect(() => {
    return () => {
      if (
        dailyLoginToastTimerRef.current
      ) {
        clearTimeout(
          dailyLoginToastTimerRef.current
        );
      }
    };
  }, []);

  useEffect(() => {
    const animation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            pulseAnim,
            {
              toValue: 1.05,
              duration: 1200,
              useNativeDriver:
                true,
            }
          ),
          Animated.timing(
            pulseAnim,
            {
              toValue: 1,
              duration: 1200,
              useNativeDriver:
                true,
            }
          ),
        ])
      );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulseAnim]);

  const hapticTap =
    async () => {
      if (
        Platform.OS !== "web"
      ) {
        try {
          await Haptics.impactAsync(
            Haptics
              .ImpactFeedbackStyle
              .Heavy
          );
        } catch {}
      }
    };

  const handleLetsLearn =
    async () => {
      await hapticTap();

      /*
       * A user who explicitly chooses Continue as Guest starts with
       * fresh ephemeral game progress every time.
       *
       * This resets ONLY guest coins + achievements.
       *
       * The anonymous Nova AI installation ID is intentionally
       * preserved so the 2-question guest Ask trial cannot reset.
       */
      if (!isLoggedIn) {
        await Promise.all([
          resetGuestCoins(),
          resetGuestAchievements(),
        ]);
      }

      (router as any).push(
        "/ask"
      );
    };

  const handleLoginPress =
    async () => {
      await hapticTap();

      if (isLoggedIn) {
        (router as any).push(
          "/(tabs)/account"
        );
        return;
      }

      (router as any).push(
        "/sign-in"
      );
    };

  const handleResetTutorial =
    async () => {
      if (
        Platform.OS !== "web"
      ) {
        try {
          await Haptics.notificationAsync(
            Haptics
              .NotificationFeedbackType
              .Success
          );
        } catch {}
      }

      try {
        await AsyncStorage.removeItem(
          TUTORIAL_KEY
        );
      } catch {}

      setStartupDestination({
        type: "tutorial",
      });
    };

  if (
    !userReady ||
    !islandReady ||
    startupDestination.type ===
      "checking"
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <SplashShimmer />

        <View
          style={
            styles.loadingContent
          }
        >
          <Image
            source={require("./assets/logo.png")}
            style={
              styles.loadingLogo
            }
          />

          <ActivityIndicator
            size="large"
            color="#00e5ff"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Starting Nova…
          </Text>
        </View>
      </View>
    );
  }

  if (
    startupDestination.type ===
    "tutorial"
  ) {
    return (
      <Redirect
        href={
          "/tutorial" as any
        }
      />
    );
  }

  if (
    startupDestination.type ===
    "confirm-email"
  ) {
    return (
      <Redirect
        href={
          {
            pathname:
              "/confirm-email",
            params: {
              email:
                startupDestination.email,
            },
          } as any
        }
      />
    );
  }

  return (
    <View
      style={styles.container}
    >
      <SplashShimmer />

      {dailyLoginAwarded && isLoggedIn ? (
        <View
          pointerEvents="none"
          style={
            styles.dailyLoginToast
          }
        >
          <Text
            style={
              styles.dailyLoginToastText
            }
          >
            ✨ Daily login +5 Island XP
          </Text>
        </View>
      ) : null}

      <View
        style={
          styles.splashContent
        }
      >
        <Pressable
          onLongPress={
            handleResetTutorial
          }
          delayLongPress={500}
        >
          <Image
            source={require("./assets/logo.png")}
            style={styles.logo}
          />
        </Pressable>

        <Pressable
          onPress={
            handleLetsLearn
          }
        >
          <Animated.View
            style={{
              transform: [
                {
                  scale:
                    pulseAnim,
                },
              ],
            }}
          >
            <LinearGradient
              colors={[
                "#00e5ff",
                "#66b2ff",
                "#000000",
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
                styles.button
              }
            >
              <Text
                style={
                  styles.buttonText
                }
              >
                {isLoggedIn
                  ? "Let’s Learn"
                  : "Continue as Guest"}
              </Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>

        <Pressable
          onPress={
            handleLoginPress
          }
        >
          <Animated.View
            style={{
              transform: [
                {
                  scale:
                    pulseAnim,
                },
              ],
            }}
          >
            <LinearGradient
              colors={[
                "#00e5ff",
                "#66b2ff",
                "#000000",
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
                styles.button
              }
            >
              <Text
                style={
                  styles.buttonText
                }
              >
                {isLoggedIn
                  ? "Go to Account"
                  : "Login / Register"}
              </Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>

        {!isLoggedIn ? (
          <Text
            style={
              styles.subtitle
            }
          >
            Log in or register to
            save your progress.
          </Text>
        ) : null}

        <Text
          style={styles.hint}
        >
          Tip: Long-press the logo
          to replay the tutorial.
        </Text>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "black",
      overflow: "hidden",
    },
    loadingContent: {
      position: "relative",
      zIndex: 2,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    },
    loadingLogo: {
      width: 180,
      height: 180,
      resizeMode: "contain",
      marginBottom: 8,
    },
    loadingText: {
      color: "#9aa",
      fontSize: 14,
      fontWeight: "600",
    },
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "black",
      overflow: "hidden",
    },
    splashContent: {
      position: "relative",
      zIndex: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    dailyLoginToast: {
      position: "absolute",
      top: 64,
      alignSelf: "center",
      zIndex: 80,
      elevation: 80,
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        "rgba(103,232,249,0.72)",
      backgroundColor:
        "rgba(3,18,34,0.94)",
      paddingHorizontal: 16,
      paddingVertical: 10,
      shadowColor: "#22d3ee",
      shadowOpacity: 0.45,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 0,
      },
    },
    dailyLoginToastText: {
      color: "#cffafe",
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    shimmerLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 50,
      elevation: 50,
      overflow: "hidden",
    },
    shimmerWave: {
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: 51,
      elevation: 51,
    },
    logo: {
      width: 240,
      height: 240,
      resizeMode: "contain",
      marginBottom: 70,
    },
    button: {
      marginTop: 20,
      paddingVertical: 14,
      paddingHorizontal: 60,
      borderRadius: 12,
      alignItems: "center",
    },
    buttonText: {
      color: "white",
      fontSize: 20,
      fontWeight: "bold",
      textAlign: "center",
    },
    subtitle: {
      marginTop: 8,
      color: "#9aa",
      fontSize: 13,
    },
    hint: {
      marginTop: 18,
      color: "#666",
      fontSize: 12,
    },
  });