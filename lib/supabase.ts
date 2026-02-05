// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

// These MUST be set in your Expo env (e.g. .env, app.config.js, or app.json)
// Example (in .env):
// EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
// EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY – check your env config."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

