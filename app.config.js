// app.config.js
export default ({ config }) => ({
  ...config,

  name: "Nova Tutoring",
  slug: "Nova_Tutoring_expo_3",
  scheme: "nova",

  version: "1.0.0",
  orientation: "portrait",

  // TEMP SAFE IMAGE (guaranteed to exist)
  icon: "./app/assets/favicon.png",

  userInterfaceStyle: "dark",

  // TEMP SAFE SPLASH (same image)
  splash: {
    image: "./app/assets/favicon.png",
    resizeMode: "contain",
    backgroundColor: "#000000",
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.sventography.novatutoring",
    buildNumber: "7",
  },

  android: {
    package: "com.sventography.novatutoring",
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./app/assets/favicon.png",
  },

  plugins: [
    "expo-router",
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

    // Public backend URL for the app (Ask, checkout, coin-order, etc.)
    EXPO_PUBLIC_BACKEND_URL:
      process.env.EXPO_PUBLIC_BACKEND_URL ||
      "https://nove-tutoring-backend.onrender.com",

    // Dummy public OpenAI key just so any old checks don't crash the app.
    // The REAL key stays on the backend as OPENAI_API_KEY.
    EXPO_PUBLIC_OPENAI_API_KEY:
      process.env.EXPO_PUBLIC_OPENAI_API_KEY || "dummy-key",

    // Legacy / existing field used by checkout utils
    backendBase:
      process.env.EXPO_PUBLIC_BACKEND_URL ||
      "https://nove-tutoring-backend.onrender.com",

    eas: {
      projectId: "34a00115-306a-4cb6-b58b-97e26409a781",
    },
  },
});
