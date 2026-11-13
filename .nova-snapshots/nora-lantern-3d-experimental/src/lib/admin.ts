import AsyncStorage from "@react-native-async-storage/async-storage";
import EventEmitter from "eventemitter3";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_OWNER_EMAIL,
  DEFAULT_ENABLE_SOUNDS,
  DEFAULT_ENABLE_HAPTICS,
} from "../constants/config";

const K_ADMIN = "admin.enabled";
const K_PASS = "admin.passcode";
const K_EMAIL = "admin.owner_email";
const K_LOW = "admin.low_stock_threshold";
const K_SND = "admin.enable_sounds";
const K_HAP = "admin.enable_haptics";

export const adminBus = new EventEmitter();

export async function isAdminEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(K_ADMIN)) === "1";
  } catch {
    return false;
  }
}
export async function setAdminEnabled(v: boolean) {
  try {
    await AsyncStorage.setItem(K_ADMIN, v ? "1" : "0");
  } catch {}
  adminBus.emit("admin:changed", v);
}

export async function getPasscode(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(K_PASS)) || "nova";
  } catch {
    return "nova";
  }
}
export async function setPasscode(v: string) {
  try {
    await AsyncStorage.setItem(K_PASS, (v || "").trim());
  } catch {}
}
export async function verifyPasscode(pass: string): Promise<boolean> {
  const cur = await getPasscode();
  const ok = (pass || "").trim() === (cur || "nova");
  if (ok) await setAdminEnabled(true);
  return ok;
}

export async function getOwnerEmail(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(K_EMAIL)) || DEFAULT_OWNER_EMAIL;
  } catch {
    return DEFAULT_OWNER_EMAIL;
  }
}
export async function setOwnerEmail(v: string) {
  try {
    await AsyncStorage.setItem(K_EMAIL, (v || DEFAULT_OWNER_EMAIL).trim());
    adminBus.emit("admin:email", v);
  } catch {}
}

export async function getLowStockThreshold(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(K_LOW);
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? n : DEFAULT_LOW_STOCK_THRESHOLD;
  } catch {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
}
export async function setLowStockThreshold(n: number) {
  try {
    await AsyncStorage.setItem(K_LOW, String(Math.max(0, Math.trunc(n))));
    adminBus.emit("admin:low", n);
  } catch {}
}

export async function getSoundsEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(K_SND);
    return v === null ? DEFAULT_ENABLE_SOUNDS : v === "1";
  } catch {
    return DEFAULT_ENABLE_SOUNDS;
  }
}
export async function setSoundsEnabled(v: boolean) {
  try {
    await AsyncStorage.setItem(K_SND, v ? "1" : "0");
    adminBus.emit("admin:sounds", v);
  } catch {}
}

export async function getHapticsEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(K_HAP);
    return v === null ? DEFAULT_ENABLE_HAPTICS : v === "1";
  } catch {
    return DEFAULT_ENABLE_HAPTICS;
  }
}
export async function setHapticsEnabled(v: boolean) {
  try {
    await AsyncStorage.setItem(K_HAP, v ? "1" : "0");
    adminBus.emit("admin:haptics", v);
  } catch {}
}
