let logged = false;

export function logEnvOnce() {
  if (logged) return;
  logged = true;

  try {
    const apiBase = process.env.EXPO_PUBLIC_API_BASE;
    const nodeEnv = process.env.NODE_ENV;
    const expoEnv = process.env.EXPO_PUBLIC_ENV;

    console.log("🌍 [ENV CHECK]");
    console.log("EXPO_PUBLIC_API_BASE =", apiBase || "(not set)");
    console.log("NODE_ENV =", nodeEnv || "(not set)");
    console.log("EXPO_PUBLIC_ENV =", expoEnv || "(not set)");
  } catch (err) {
    console.warn("⚠️ Failed to read environment vars:", err);
  }
}
