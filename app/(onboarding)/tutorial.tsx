import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, Pressable, FlatList, Dimensions, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const KEY = "onboarding.tutorial.done.v1";
const { width, height } = Dimensions.get("window");

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

export default function Tutorial() {
  const router = useRouter();
  const listRef = useRef<FlatList<Slide> | null>(null);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = useMemo(
    () => [
      {
        key: "welcome",
        title: "Welcome to Nova",
        body: "Quick tour — and then you’ll never see this again.",
        image: require("../assets/tutorial/nova_welcome.png"),
        slot: "top",
        stageH: 0.58,
        offsetY: 0,
      },
      {
        key: "login",
        title: "Your Profile",
        body: "Log in, set your name, and pick an avatar anytime.",
        image: require("../assets/tutorial/nova_login.png"),
        slot: "center",
        stageH: 0.60,
        offsetY: 0,
      },
      {
        key: "tabs",
        title: "Tabs",
        body: "Everything lives in tabs so it’s always easy to find.",
        image: require("../assets/tutorial/nova_tabs.png"),
        slot: "center",
        stageH: 0.64,
        offsetY: 0,
      },
      {
        key: "ask",
        title: "Ask",
        body: "Ask anything — voice or typing — and Nova answers.",
        image: require("../assets/tutorial/nova_questions.png"),
        slot: "center",
        stageH: 0.62,
        offsetY: -6,
      },
      {
        key: "earn",
        title: "Earn Coins",
        body: "Coins come from learning: quizzes, brainteasers, and more.",
        image: require("../assets/tutorial/nova_earn_coins.png"),
        slot: "center",
        stageH: 0.62,
        offsetY: -6,
      },
      {
        key: "usecoins",
        title: "Use Coins",
        body: "Spend coins on themes, cursors, and items in the shop.",
        image: require("../assets/tutorial/nova_use_coins.png"),
        slot: "center",
        stageH: 0.62,
        offsetY: -8,
      },
      {
        key: "shipping",
        title: "Checkout & Shipping",
        body: "For tangible items, enter shipping info at checkout.",
        image: require("../assets/tutorial/nova_shipping_screen.png"),
        slot: "bottom",
        stageH: 0.68,
        offsetY: -10,
      },
      {
        key: "lunis",
        title: "Meet Lunis",
        body: "Lunis helps guide your progress and rewards.",
        image: require("../assets/tutorial/nova_lunis_intro.png"),
        slot: "center",
        stageH: 0.62,
        offsetY: 0,
      },
    ],
    []
  );

  const buzz = async () => {
    if (Platform.OS !== "web") await Haptics.selectionAsync().catch(() => {});
  };

  const finish = async () => {
    await buzz();
    await AsyncStorage.setItem(KEY, "1");
    router.replace("/(tabs)/ask");
  };

  const goTo = async (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, nextIndex));
    const offset = clamped * width;

    // scrollToOffset works better than scrollToIndex on web
    listRef.current?.scrollToOffset({ offset, animated: true });
    setIndex(clamped);
  };

  const next = async () => {
    await buzz();
    if (index >= slides.length - 1) return finish();
    await goTo(index + 1);
  };

  const justifyFor = (slot: Slot) => {
    if (slot === "top") return "flex-start";
    if (slot === "bottom") return "flex-end";
    return "center";
  };

  return (
    <View style={s.screen}>
      <FlatList
        ref={(r) => (listRef.current = r)}
        data={slides}
        horizontal
        pagingEnabled
        snapToInterval={width}
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        keyExtractor={(it) => it.key}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <View style={[s.page, { width }]}>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.body}>{item.body}</Text>

            <View
              style={[
                s.stage,
                {
                  justifyContent: justifyFor(item.slot),
                  height: Math.floor(height * item.stageH),
                },
              ]}
            >
              <Image
                source={item.image}
                resizeMode="contain"
                style={[s.image, { transform: [{ translateY: item.offsetY }] }]}
              />
            </View>
          </View>
        )}
      />

      <View style={s.footer}>
        <Pressable onPress={next} style={s.primaryBtn}>
          <Text style={s.primaryText}>{index === slides.length - 1 ? "Finish" : "Next"}</Text>
        </Pressable>

        <Pressable onPress={finish}>
          <Text style={s.skip}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "black", paddingTop: 56 },
  page: { flex: 1, alignItems: "center", paddingHorizontal: 18 },
  title: { color: "white", fontSize: 26, fontWeight: "800", textAlign: "center" },
  body: { color: "#aaa", marginTop: 12, textAlign: "center", lineHeight: 20, maxWidth: 380 },

  stage: { width: "100%", alignItems: "center", marginTop: 16 },
  image: { width: "94%", height: "100%" },

  footer: { paddingHorizontal: 22, paddingBottom: 22, gap: 12 },
  primaryBtn: { backgroundColor: "#00e5ff", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  primaryText: { fontWeight: "800", color: "black", fontSize: 16 },
  skip: { color: "#888", textAlign: "center", fontWeight: "700" },
});
