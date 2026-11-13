// Wrapper for Expo ImagePicker
// Requests permissions on-demand, and always returns either an asset or null.

import * as ImagePicker from "expo-image-picker";

export type PickImageOpts = {
  allowsEditing?: boolean;
};

export async function pickImage(opts: PickImageOpts = {}): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    console.warn("Permission to access media library was denied");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: opts.allowsEditing ?? true,
    aspect: [1, 1],
    quality: 1,
    base64: false,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0].uri;
  }

  return null;
}
