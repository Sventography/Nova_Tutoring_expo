// app/lib/supabase.ts
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// These MUST match the names in your .env file.
// Only EXPO_PUBLIC_ variables are exposed to the Expo app at runtime.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL. Check your .env file in the project root."
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Check your .env file in the project root."
  );
}

// ✅ For the Expo app we DO persist sessions here using AsyncStorage.
// Supabase will:
// - Store session + refresh token in AsyncStorage
// - Auto-refresh tokens when they expire
// - Let us hydrate with auth.getSession() on app start
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
