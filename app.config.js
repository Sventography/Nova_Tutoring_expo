import 'dotenv/config';

export default {
  expo: {
    name: "Nova_Tutoring",
    slug: "Nova_Tutoring_expo_3",
    extra: {
      EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
      EXPO_PUBLIC_BACKEND_URL_VERCEL: process.env.EXPO_PUBLIC_BACKEND_URL_VERCEL,
      EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      EXPO_PUBLIC_STRIPE_PK: process.env.EXPO_PUBLIC_STRIPE_PK,
      EXPO_PUBLIC_STRIPE_PK: process.env.EXPO_PUBLIC_STRIPE_PK,
    },
    plugins: [
    "expo-mail-composer",
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.novatutoring",  // <-- required for iOS
          enableGooglePay: false,                            // set true later if needed
          merchantCountryCode: "US",
          androidPayMode: "test"                             // "production" when you go live
        }
      ]
    ],
    web: {
      favicon: "./app/assets/favicon.png"   // ✅ favicon is back
    }
  }
};
