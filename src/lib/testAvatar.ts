import { uploadAvatarAsync } from "./avatar";

export async function testUpload(uri: string) {
  try {
    const url = await uploadAvatarAsync(uri);
    console.log("Avatar uploaded to:", url);
  } catch (e) {
    console.error("Upload failed:", e);
  }
}
