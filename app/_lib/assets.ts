// app/_lib/assets.ts
// Single source of truth for images. Resilient to folder moves.

let bunny: any = null;
try {
  // from app/_lib → app/assets
  bunny = require("../assets/shop/nova_bunny_front.png");
} catch {
  try {
    // fallback if your assets/ is at the project root
    bunny = require("../assets/shop/nova_bunny_front.png");
  } catch {
    bunny = null; // still renders (your UI should handle a null image)
  }
}

export const Images = {
  bunny,
  // add more here as you introduce them, e.g.:
  // logo: require("../assets/logo.png"),
} as const;

export type ImageKey = keyof typeof Images;
export function getImage(key: ImageKey) {
  return Images[key] ?? null;
}
