import ViewShot, { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Capture a View as an image and return the URI (tmpfile). */
export async function captureCertificate(ref: any, opts?: { format?: 'png'|'jpg'|'webm'; quality?: number }) {
  return await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', ...opts } as any);
}

/** Try to share; if unavailable, just return false. */
export async function shareCertificate(uri: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
    return true;
  }
  return false;
}

/** Copy to the app document dir and return the saved path. */
export async function saveCertificate(uri: string, filename = 'certificate.png') {
  const dest = (FileSystem.documentDirectory ?? '') + filename;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

/** One-shot convenience: capture and share; if sharing isn’t available, save instead. */
export async function captureAndShareCertificate(ref: any, filename = 'certificate.png') {
  const uri = await captureCertificate(ref);
  const shared = await shareCertificate(uri);
  if (!shared) return await saveCertificate(uri, filename);
  return uri;
}

export default {
  captureCertificate,
  shareCertificate,
  saveCertificate,
  captureAndShareCertificate,
};
