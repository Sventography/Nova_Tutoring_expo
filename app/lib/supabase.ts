// app/lib/supabase.ts
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

// For the Expo app we don't persist sessions here; UserContext handles local JWT if needed.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});
