import AsyncStorage from "@react-native-async-storage/async-storage";
export type UserProfile = { username: string; avatarUri?: string };
const KEY = "nova.user.profile.v1";
export async function getUserProfile(): Promise<UserProfile> {
  try { const raw = await AsyncStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch {}
  return { username: "Nova" };
}
export async function setUserProfile(p: UserProfile) { await AsyncStorage.setItem(KEY, JSON.stringify(p)); }
