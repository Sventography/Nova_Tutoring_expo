// app.config.js

export default ({ config }) => {
  // This config also runs inside Expo's Node process (including SSR).
  // A staging build cannot fall back to a previous, live .env value.
  const collectorStaging =
    process.env.EXPO_PUBLIC_COLLECTOR_STAGING_MODE === "true";
  const stagingUrl = "https://gouhhltupxaycuysdtrw.supabase.co";
  const stagingPublicKey = "sb_publishable_g6o0Crn4Cn_r5vj6RMn3SQ_1K_q0SDY";
  const backendUrl = collectorStaging
    ? stagingUrl
    : (process.env.EXPO_PUBLIC_BACKEND_URL ||
       "https://nove-tutoring-backend.onrender.com");

  return {
    ...config,

    name: "Nova Tutoring",
    slug: "Nova_Tutoring_expo_3",
    scheme: "nova",

    version: "1.6.0",
    orientation: "portrait",
    icon: "./app/assets/favicon.png",
    userInterfaceStyle: "dark",

    splash: {
      image: "./app/assets/favicon.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },

    assetBundlePatterns: ["**/*"],

    ios: {
      ...(config.ios || {}),
      supportsTablet: true,
      bundleIdentifier: "com.sventography.novatutoring.ios",
      buildNumber: "103",
    },

    android: {
      ...(config.android || {}),
      package: "com.sventography.novatutoring",
      adaptiveIcon: {
        foregroundImage: "./app/assets/favicon.png",
        backgroundColor: "#000000",
      },
    },

    web: {
      ...(config.web || {}),
      bundler: "metro",
      output: "static",
      favicon: "./app/assets/favicon.png",
    },

    platforms: ["ios", "android", "web"],

    plugins: [
      "expo-asset",
      "expo-mail-composer",
      "expo-router",
      "expo-web-browser",
      "expo-iap",
      [
        "@stripe/stripe-react-native",
        {
          enableGooglePay: false,
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      ...(config.extra || {}),

      EXPO_PUBLIC_SUPABASE_URL: collectorStaging
        ? stagingUrl
        : (process.env.EXPO_PUBLIC_SUPABASE_URL || ""),

      EXPO_PUBLIC_SUPABASE_ANON_KEY: collectorStaging
        ? stagingPublicKey
        : (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ""),

      EXPO_PUBLIC_BACKEND_URL: backendUrl,

      backendBase: backendUrl,

      EXPO_PUBLIC_AUTH_CONFIRMATION_URL:
        process.env.EXPO_PUBLIC_AUTH_CONFIRMATION_URL ||
        "https://confirm.sventographystudios.com/auth/confirmed",

      EXPO_PUBLIC_PASSWORD_RECOVERY_URL:
        process.env.EXPO_PUBLIC_PASSWORD_RECOVERY_URL ||
        "https://confirm.sventographystudios.com/auth/confirmed",

      EXPO_PUBLIC_DISCORD_INVITE_URL:
        process.env.EXPO_PUBLIC_DISCORD_INVITE_URL ||
        "https://discord.gg/dPKqhhz93Z",

      EXPO_PUBLIC_OPENAI_API_KEY:
        process.env.EXPO_PUBLIC_OPENAI_API_KEY || "dummy-key",

      eas: {
        projectId: "34a00115-306a-4cb6-b58b-97e26409a781",
      },
    },
  };
};