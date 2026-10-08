// app/constants/community.ts

import Constants from "expo-constants";

const extra =
  (Constants.expoConfig?.extra as
    | Record<string, any>
    | undefined) ??
  ((Constants as any).manifest2?.extra as
    | Record<string, any>
    | undefined) ??
  ((Constants as any).manifest?.extra as
    | Record<string, any>
    | undefined) ??
  {};

export const DISCORD_INVITE_URL = String(
  process.env.EXPO_PUBLIC_DISCORD_INVITE_URL ||
    extra.EXPO_PUBLIC_DISCORD_INVITE_URL ||
    ""
).trim();

export const REDDIT_PROFILE_URL = String(
  process.env.EXPO_PUBLIC_REDDIT_PROFILE_URL ||
    extra.EXPO_PUBLIC_REDDIT_PROFILE_URL ||
    "https://www.reddit.com/user/TutorNovaSignal/"
).trim();
