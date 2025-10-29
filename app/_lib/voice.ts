import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as FileSystem from "expo-file-system";

let recording: Audio.Recording | null = null;

async function ensureReady() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    shouldDuckAndroid: true,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    playThroughEarpieceAndroid: false,
    staysActiveInBackground: false,
  });
}

export async function startRecording() {
  if (recording) return;
  await ensureReady();
  const { granted } = await Audio.requestPermissionsAsync();
  if (!granted) throw new Error("mic denied");
  const rec = new Audio.Recording();
  await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await rec.startAsync();
  recording = rec;
}

export async function stopAndSend(): Promise<{ transcript?: string; url?: string }> {
  if (!recording) throw new Error("not recording");
  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI()!;
    recording = null;

    const base = process.env.EXPO_PUBLIC_API_URL;
    if (!base) {
      return { transcript: "Demo transcript (set EXPO_PUBLIC_API_URL to use server)." };
    }

    const f = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const r = await fetch(`${base.replace(/\/$/, '')}/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "recording.m4a",
        mime: "audio/mp4",
        data: `data:audio/mp4;base64,${f}`,
      }),
    });
    if (!r.ok) throw new Error("upload failed");
    const data = await r.json();
    return { transcript: data.transcript || "" };
  } catch (e) {
    recording = null;
    throw e;
  }
}
