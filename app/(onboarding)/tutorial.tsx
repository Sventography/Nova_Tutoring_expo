// app/(onboarding)/tutorial.tsx

import React, {
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const TUTORIAL_KEY =
  "onboarding.tutorial.done.v2";

type Slot = "top" | "center" | "bottom";

type Slide = {
  key: string;
  title: string;
  body: string;
  image: any;
  slot: Slot;
  stageH: number;
  offsetY: number;
};

function justifyFor(
  slot: Slot
): "flex-start" | "center" | "flex-end" {
  if (slot === "top") return "flex-start";
  if (slot === "bottom") return "flex-end";
  return "center";
}

export default function Tutorial() {
  const router = useRouter();
  const { width, height } =
    useWindowDimensions();

  const listRef =
    useRef<FlatList<Slide> | null>(null);

  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] =
    useState(false);

  const slides: Slide[] = useMemo(
    () => [
      {
        key: "welcome",
        title: "Welcome to Nova",
        body:
          "Here’s a quick tour. You can replay it later from the start screen.",
        image: require("../assets/tutorial/nova_welcome.png"),
        slot: "top",
        stageH: 0.58,
        offsetY: 0,
      },
      {
        key: "login",
        title: "Your Profile",
        body:
          "Log in, register, set your name, and pick an avatar anytime.",
        image: require("../assets/tutorial/nova_login.png"),
        slot: "center",
        stageH: 0.6,
        offsetY: 0,
      },
      {
        key: "tabs",
        title: "Tabs",
        body:
          "Everything lives in tabs so it’s always easy to find.",
        image: require("../assets/tutorial/nova_tabs.png"),
        slot: "center",
        stageH: 0.64,
        offsetY: 0,
      },
      {
        key: "ask",
        title: "Ask",
        body:
          "Ask anything by voice or typing, and Nova answers.",
        image: require("../assets/tutorial/nova_questions.png"),
        slot: "center",
        stageH: 0.62,
        offsetY: -6,
      },
      {
        key: "earn",
        title: "Earn Coins",
        body:
          "Coins come from learning through quizzes, brainteasers, and more.",
        image: require("../assets/tutorial/nova_earn_coins.png"),
        slot: "center",
        stageH: 0.62,
        offsetY: -6,
      },
      {
        key: "usecoins",
        title: "Use Coins",
        body:
          "Spend coins on themes, cursors, companions, and shop items.",
        image: require("../assets/tutorial/nova_use_coins.png"),
        slot: "center",
        stageH: 0.62,
        offsetY: -8,
      },
      {
        key: "shipping",
        title: "Checkout & Shipping",
        body:
          "For tangible items, enter and review your shipping information at checkout.",
        image: require("../assets/tutorial/nova_shipping_screen.png"),
        slot: "bottom",
        stageH: 0.68,
        offsetY: -10,
      },
      {
        key: "lunis",
        title: "Meet Lunis",
        body:
          "Lunis helps guide your progress and rewards.",
        image: require("../assets/tutorial/nova_lunis_intro.png"),
        slot: "center",
        stageH: 0.62,
        offsetY: 0,
      },
    ],
    []
  );

  const buzz = async () => {
    if (Platform.OS !== "web") {
      await Haptics.selectionAsync().catch(
        () => {}
      );
    }
  };

  const finish = async () => {
    if (finishing) return;

    setFinishing(true);
    await buzz();

    try {
      await AsyncStorage.setItem(
        TUTORIAL_KEY,
        "1"
      );
    } catch (error) {
      console.warn(
        "[Tutorial] Could not save completion:",
        error
      );
    }

    (router as any).replace("/");
  };

  const goTo = async (
    nextIndex: number
  ) => {
    const clamped = Math.max(
      0,
      Math.min(
        slides.length - 1,
        nextIndex
      )
    );

    listRef.current?.scrollToOffset({
      offset: clamped * width,
      animated: true,
    });

    setIndex(clamped);
  };

  const next = async () => {
    if (finishing) return;

    await buzz();

    if (index >= slides.length - 1) {
      await finish();
      return;
    }

    await goTo(index + 1);
  };

  return (
    <View style={styles.screen}>
      <FlatList
        ref={(ref) => {
          listRef.current = ref;
        }}
        data={slides}
        horizontal
        pagingEnabled
        snapToInterval={width}
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={
          false
        }
        keyExtractor={(item) => item.key}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(
            event.nativeEvent.contentOffset.x /
              width
          );
          setIndex(nextIndex);
        }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.page,
              { width },
            ]}
          >
            <Text style={styles.title}>
              {item.title}
            </Text>
            <Text style={styles.body}>
              {item.body}
            </Text>

            <View
              style={[
                styles.stage,
                {
                  justifyContent: justifyFor(
                    item.slot
                  ),
                  height: Math.floor(
                    height * item.stageH
                  ),
                },
              ]}
            >
              <Image
                source={item.image}
                resizeMode="contain"
                style={[
                  styles.image,
                  {
                    transform: [
                      {
                        translateY:
                          item.offsetY,
                      },
                    ],
                  },
                ]}
              />
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map(
            (slide, dotIndex) => (
              <View
                key={slide.key}
                style={[
                  styles.dot,
                  dotIndex === index &&
                    styles.dotActive,
                ]}
              />
            )
          )}
        </View>

        <Pressable
          onPress={next}
          disabled={finishing}
          style={[
            styles.primaryBtn,
            finishing && styles.disabled,
          ]}
        >
          <Text style={styles.primaryText}>
            {finishing
              ? "Opening Nova…"
              : index ===
                slides.length - 1
              ? "Continue to Login / Register"
              : "Next"}
          </Text>
        </Pressable>

        <Pressable
          onPress={finish}
          disabled={finishing}
          style={styles.skipButton}
        >
          <Text style={styles.skip}>
            Skip
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "black",
    paddingTop: 56,
  },
  page: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 18,
  },
  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    color: "#aaa",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 380,
  },
  stage: {
    width: "100%",
    alignItems: "center",
    marginTop: 16,
  },
  image: {
    width: "94%",
    height: "100%",
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    gap: 12,
  },
  dots: {
    minHeight: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#3b3b48",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#00e5ff",
  },
  primaryBtn: {
    backgroundColor: "#00e5ff",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryText: {
    fontWeight: "800",
    color: "black",
    fontSize: 16,
  },
  skipButton: {
    paddingVertical: 4,
  },
  skip: {
    color: "#888",
    textAlign: "center",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});