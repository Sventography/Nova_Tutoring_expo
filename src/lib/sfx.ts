import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { getSoundsEnabled, getHapticsEnabled } from "./admin";

const BEEP_OK_BASE64 =
  "UklGRjQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQwAAAADAwQEBAUFBgYGBgUFBQQEAwMDAgICAQEBAgICAwMEBQUFBgYGBQUFBAMDAgICAAABAQICAgMDAwQEBQUFBgYGBQUFBAMDAgICAQEBAgICAwMDAw==";
const BEEP_ERR_BASE64 =
  "UklGRkQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YRAAAAADBQUHBwgICAcHBQUDAwIBAAEAAQICAwMEBQUHBwgICAkJCQgHBwUEBAQDAwMCAgIBAQEDAwQFBQcICAkJCQgHBwUEBAQDAwMCAgI=";

let okUri: string | null = null;
let errUri: string | null = null;

async function ensureFiles() {
  if (!okUri) {
    okUri = FileSystem.cacheDirectory + "toast_ok.wav";
    const exists = await FileSystem.getInfoAsync(okUri);
    if (!exists.exists)
      await FileSystem.writeAsStringAsync(okUri, BEEP_OK_BASE64, {
        encoding: FileSystem.EncodingType.Base64,
      });
  }
  if (!errUri) {
    errUri = FileSystem.cacheDirectory + "toast_err.wav";
    const exists = await FileSystem.getInfoAsync(errUri);
    if (!exists.exists)
      await FileSystem.writeAsStringAsync(errUri, BEEP_ERR_BASE64, {
        encoding: FileSystem.EncodingType.Base64,
      });
  }
}

async function play(uri: string) {
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { volume: 0.8, shouldPlay: true },
    );
    sound.setOnPlaybackStatusUpdate((st) => {
      if (st.isLoaded && st.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch {}
}

export async function playSuccess() {
  try {
    const [snd, hap] = await Promise.all([
      getSoundsEnabled(),
      getHapticsEnabled(),
    ]);
    if (hap) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (snd) {
      await ensureFiles();
      if (okUri) await play(okUri);
    }
  } catch {}
}

export async function playError() {
  try {
    const [snd, hap] = await Promise.all([
      getSoundsEnabled(),
      getHapticsEnabled(),
    ]);
    if (hap)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (snd) {
      await ensureFiles();
      if (errUri) await play(errUri);
    }
  } catch {}
}
