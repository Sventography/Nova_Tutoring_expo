// app.config.js

export default ({ config }) => {
  return {
    ...config,

    name: "Nova Tutoring",
    slug: "Nova_Tutoring_expo_3",
    scheme: "nova",

    version: "1.0.0",
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
      buildNumber: "90",
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
      "expo-mail-composer",
      "expo-router",
      "expo-web-browser",
      "expo-iap",

      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.sventography.novatutoring",
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

      EXPO_PUBLIC_SUPABASE_URL:
        process.env.EXPO_PUBLIC_SUPABASE_URL || "",

      EXPO_PUBLIC_SUPABASE_ANON_KEY:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",

      EXPO_PUBLIC_BACKEND_URL:
        process.env.EXPO_PUBLIC_BACKEND_URL ||
        "https://nove-tutoring-backend.onrender.com",

      EXPO_PUBLIC_OPENAI_API_KEY:
        process.env.EXPO_PUBLIC_OPENAI_API_KEY || "dummy-key",

      backendBase:
        process.env.EXPO_PUBLIC_BACKEND_URL ||
        "https://nove-tutoring-backend.onrender.com",

      eas: {
        projectId: "34a00115-306a-4cb6-b58b-97e26409a781",
      },
    },
  };
};