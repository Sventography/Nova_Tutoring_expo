import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

let SecureStore: any = null;
try {
  // On native, Expo will resolve this to the secure module.
  // On web, this may exist but isn't actually usable.
  SecureStore = require("expo-secure-store");
} catch {
  SecureStore = null;
}

// Decide at runtime if we should use SecureStore.
// On web → always false. On native → check isAvailableAsync safely.
let secureReadyPromise: Promise<boolean> | null = null;
function secureAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(false);
  if (!SecureStore || typeof SecureStore.isAvailableAsync !== "function") {
    return Promise.resolve(false);
  }
  if (!secureReadyPromise) {
    secureReadyPromise = SecureStore.isAvailableAsync()
      .then(Boolean)
      .catch(() => false);
  }
  return secureReadyPromise;
}

// Valid key names for both SecureStore and AsyncStorage
const EMAIL_KEY = "nova_email";
const PASSWORD_KEY = "nova_password";
const USER_KEY = "nova_user";

// Unified KV API with per-call fallback to AsyncStorage when SecureStore isn't available
async function kvSet(key: string, value: string) {
  const useSecure = await secureAvailable();
  if (useSecure && typeof SecureStore.setItemAsync === "function") {
    return SecureStore.setItemAsync(key, value);
  }
  return AsyncStorage.setItem(key, value);
}

async function kvGet(key: string) {
  const useSecure = await secureAvailable();
  if (useSecure && typeof SecureStore.getItemAsync === "function") {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function kvDel(key: string) {
  const useSecure = await secureAvailable();
  if (useSecure && typeof SecureStore.deleteItemAsync === "function") {
    return SecureStore.deleteItemAsync(key);
  }
  return AsyncStorage.removeItem(key);
}

export async function saveCredentials(email: string, password: string) {
  await kvSet(EMAIL_KEY, email);
  await kvSet(PASSWORD_KEY, password);
}

export async function loadCredentials() {
  const email = await kvGet(EMAIL_KEY);
  const password = await kvGet(PASSWORD_KEY);
  return { email: email ?? null, password: password ?? null };
}

export async function clearCredentials() {
  await kvDel(EMAIL_KEY);
  await kvDel(PASSWORD_KEY);
}

export async function saveUser(user: any) {
  await kvSet(USER_KEY, JSON.stringify(user));
}

export async function loadUser() {
  const raw = await kvGet(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearUser() {
  await kvDel(USER_KEY);
}
