import { api } from "./api";
export async function uploadAvatarAsync(uri: string) {
  const form = new FormData();
  // @ts-ignore
  form.append("file", { uri, name: "avatar.jpg", type: "image/jpeg" });
  const res = await api.uploadAvatar(form);
  return res.url as string;
}
