export type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";

/**
 * Map Stripe product IDs -> size options shown in the UI.
 * (keys are your exact prod_* IDs)
 */
const SIZES_BY_ID: Record<string, Size[]> = {
  "prod_TEIgC6JmU2ALTh": ["XS", "S", "M", "L", "XL"],             // star PJS
  "prod_TEIeuYnCTjKtqU": ["S", "M", "L", "XL"],                    // sweat bottoms
  "prod_TEIbGbdViXLjnW": ["S", "M", "L", "XL", "XXL"],             // nova hoodie
  "prod_TFcQwzMyW4yv64": ["XS", "S", "M", "L", "XL"],              // pajamas (set)
  "prod_TFcJPHAdrXTh0g": ["XS", "S", "M", "L", "XL", "XXL"],       // nova glow tee
};

export function getSizesFor(productId: string): Size[] {
  return SIZES_BY_ID[productId] ?? [];
}
