// app/components/NovaGuideOverlay.tsx
import React, {
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import {
  LinearGradient,
} from "expo-linear-gradient";

export type NovaGuidePose =
  | "welcome"
  | "happy"
  | "thinking"
  | "coins"
  | "hug"
  | "grown";

export type NovaGuideAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  onDismiss: () => void;
  eyebrow?: string;
  title: string;
  message?: string;
  pose?: NovaGuidePose;
  mascotSource?: ImageSourcePropType;
  children?: ReactNode;
  primaryAction?: NovaGuideAction;
  secondaryAction?: NovaGuideAction;
  dismissLabel?: string;
};

const NOVA_POSES: Record<
  NovaGuidePose,
  ImageSourcePropType
> = {
  welcome:
    require("../assets/guide/nova_guide.png"),
  happy:
    require("../assets/tutorial/nova_happy_learning.png"),
  thinking:
    require("../assets/tutorial/nova_questions.png"),
  coins:
    require("../assets/tutorial/nova_jump_coins.png"),
  hug:
    require("../assets/tutorial/nova_hug.png"),
  grown:
    require("../assets/tutorial/nova_grown.png"),
};

export default function NovaGuideOverlay({
  visible,
  onDismiss,
  eyebrow = "NOVA",
  title,
  message,
  pose = "welcome",
  mascotSource,
  children,
  primaryAction,
  secondaryAction,
  dismissLabel = "Maybe Later",
}: Props) {
  const bob =
    useRef(
      new Animated.Value(0)
    ).current;

  const entrance =
    useRef(
      new Animated.Value(0)
    ).current;

  useEffect(() => {
    if (!visible) {
      bob.stopAnimation();
      entrance.setValue(0);
      return;
    }

    entrance.setValue(0);
    bob.setValue(0);

    Animated.spring(
      entrance,
      {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }
    ).start();

    const bobLoop =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            bob,
            {
              toValue: -5,
              duration: 1350,
              useNativeDriver: true,
            }
          ),
          Animated.timing(
            bob,
            {
              toValue: 0,
              duration: 1350,
              useNativeDriver: true,
            }
          ),
        ])
      );

    bobLoop.start();

    return () => {
      bobLoop.stop();
    };
  }, [
    bob,
    entrance,
    visible,
  ]);

  const source =
    mascotSource ||
    NOVA_POSES[pose];

  const characterScale =
    entrance.interpolate({
      inputRange: [0, 1],
      outputRange: [0.84, 1],
    });

  const cardTranslate =
    entrance.interpolate({
      inputRange: [0, 1],
      outputRange: [26, 0],
    });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.stage}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.characterZone,
              {
                opacity: entrance,
                transform: [
                  {
                    translateY:
                      bob,
                  },
                  {
                    scale:
                      characterScale,
                  },
                ],
              },
            ]}
          >
            <View
              style={
                styles.characterGlow
              }
            />

            <Image
              source={source}
              resizeMode="contain"
              style={
                styles.character
              }
            />
          </Animated.View>

          <Animated.View
            style={{
              opacity: entrance,
              transform: [
                {
                  translateY:
                    cardTranslate,
                },
              ],
            }}
          >
            <LinearGradient
              colors={[
                "#07131F",
                "#0A2030",
                "#17142F",
              ]}
              style={styles.card}
            >
              <Text
                style={
                  styles.eyebrow
                }
              >
                {eyebrow}
              </Text>

              <Text
                style={
                  styles.title
                }
              >
                {title}
              </Text>

              {message ? (
                <Text
                  style={
                    styles.message
                  }
                >
                  {message}
                </Text>
              ) : null}

              {children ? (
                <View
                  style={
                    styles.content
                  }
                >
                  {children}
                </View>
              ) : null}

              {primaryAction ? (
                <Pressable
                  disabled={
                    primaryAction.disabled
                  }
                  onPress={
                    primaryAction.onPress
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.primary,
                    primaryAction.disabled &&
                      styles.disabled,
                    pressed &&
                      !primaryAction.disabled &&
                      styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    primaryAction.label
                  }
                >
                  <Text
                    style={
                      styles.primaryText
                    }
                  >
                    {
                      primaryAction.label
                    }
                  </Text>
                </Pressable>
              ) : null}

              {secondaryAction ? (
                <Pressable
                  disabled={
                    secondaryAction.disabled
                  }
                  onPress={
                    secondaryAction.onPress
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.secondary,
                    secondaryAction.disabled &&
                      styles.disabled,
                    pressed &&
                      !secondaryAction.disabled &&
                      styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    secondaryAction.label
                  }
                >
                  <Text
                    style={
                      styles.secondaryText
                    }
                  >
                    {
                      secondaryAction.label
                    }
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={onDismiss}
                style={({
                  pressed,
                }) => [
                  styles.dismiss,
                  pressed &&
                    styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  dismissLabel
                }
              >
                <Text
                  style={
                    styles.dismissText
                  }
                >
                  {dismissLabel}
                </Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent:
        "flex-end",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 24,
      backgroundColor:
        "rgba(0,0,0,0.74)",
    },
    stage: {
      width: "100%",
      maxWidth: 460,
      alignSelf: "center",
    },
    characterZone: {
      height: 240,
      alignItems: "center",
      justifyContent:
        "flex-end",
      marginBottom: -30,
      zIndex: 4,
    },
    characterGlow: {
      position: "absolute",
      bottom: 25,
      width: 178,
      height: 126,
      borderRadius: 90,
      backgroundColor:
        "rgba(34,211,238,0.18)",
      shadowColor: "#22D3EE",
      shadowOpacity: 0.72,
      shadowRadius: 32,
      shadowOffset: {
        width: 0,
        height: 0,
      },
    },
    character: {
      width: 230,
      height: 230,
    },
    card: {
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor:
        "rgba(34,211,238,0.78)",
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 18,
      shadowColor: "#00E5FF",
      shadowOpacity: 0.28,
      shadowRadius: 22,
      shadowOffset: {
        width: 0,
        height: 10,
      },
      elevation: 18,
    },
    eyebrow: {
      color: "#67E8F9",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.8,
      textAlign: "center",
    },
    title: {
      color: "#FFFFFF",
      fontSize: 24,
      lineHeight: 29,
      fontWeight: "900",
      textAlign: "center",
      marginTop: 6,
    },
    message: {
      color: "#CBD5E1",
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginTop: 7,
    },
    content: {
      marginTop: 14,
    },
    primary: {
      marginTop: 16,
      minHeight: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 18,
      backgroundColor: "#0891B2",
      borderWidth: 1,
      borderColor:
        "rgba(103,232,249,0.70)",
    },
    primaryText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
    },
    secondary: {
      marginTop: 10,
      minHeight: 43,
      borderRadius: 15,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor:
        "rgba(103,232,249,0.48)",
      backgroundColor:
        "rgba(8,145,178,0.12)",
    },
    secondaryText: {
      color: "#CFFAFE",
      fontSize: 13,
      fontWeight: "900",
    },
    dismiss: {
      marginTop: 9,
      minHeight: 40,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 16,
    },
    dismissText: {
      color: "#94A3B8",
      fontSize: 12,
      fontWeight: "800",
    },
    disabled: {
      opacity: 0.42,
    },
    pressed: {
      opacity: 0.76,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },
  });
