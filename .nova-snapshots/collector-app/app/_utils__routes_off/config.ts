// app/utils/config.ts
import { API_BASE } from "../_lib/config";

export const apiBase = API_BASE;

if (__DEV__) {
  console.log("Utils config using API_BASE =", API_BASE);
}
