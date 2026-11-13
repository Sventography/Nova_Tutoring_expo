/** Replace your existing classifyAndPrice with this one */
const toCoins = (usd: number) => Math.round(usd * 1000);

type Item = {
  type: "tangible" | "virtual";
  category: string;
  cashPrice: number;
  coinPrice: number;
  description: string;
};

function classifyAndPrice(key: string): Pick<Item, "type"|"category"|"cashPrice"|"coinPrice"|"description"> {
  const k = key.toLowerCase();

  if (k.startsWith("coins_")) {
    const amt = parseInt(k.replace("coins_","").replace(/\D/g,"")) || 1000;
    return {
      type: "virtual",
      category: "coins",
      cashPrice: amt / 1000,
      coinPrice: amt,
      description: `Top up your balance with ${amt.toLocaleString()} coins.`,
    };
  }

  if (k.includes("theme")) {
    return {
      type: "virtual",
      category: "theme",
      cashPrice: 3,
      coinPrice: toCoins(3),
      description: "A neon-styled theme to customize your app's look.",
    };
  }

  if (k.includes("cursor")) {
    return {
      type: "virtual",
      category: "cursor",
      cashPrice: 2,
      coinPrice: toCoins(2),
      description: "A glowing cursor effect that follows your taps.",
    };
  }

  if (k.includes("bundle")) {
    return {
      type: "virtual",
      category: "bundle",
      cashPrice: 5,
      coinPrice: toCoins(5),
      description: "A starter bundle with multiple Nova cosmetics.",
    };
  }

  if (/(plush|bunny|pajama|hoodie|beanie|tee|hat|case|keychain|stationery|sweat|book_plushie)/.test(k)) {
    const category =
      k.includes("hoodie") ? "apparel" :
      k.includes("beanie") ? "apparel" :
      k.includes("tee") ? "apparel" :
      k.includes("sweat") ? "apparel" :
      k.includes("pajama") ? "apparel" :
      k.includes("case") ? "accessories" :
      k.includes("keychain") ? "accessories" :
      k.includes("stationery") ? "stationery" :
      "plushie";

    const cashPrice =
      k.includes("keychain") ? 15 :
      k.includes("case") ? 28 :
      k.includes("beanie") ? 45 :
      k.includes("hoodie") ? 120 :
      k.includes("sweat") ? 55 :
      k.includes("pajama") ? 65 :
      60;

    const description =
      k.includes("book_plushie") ? "Limited ‘Book Plushie’ edition—soft, collectible, and story-ready." :
      k.includes("plush") || k.includes("bunny") ? "A soft Nova plush to cuddle and collect." :
      k.includes("pajama") ? "Comfy Nova pajamas with glowing star accents." :
      k.includes("hoodie") ? "A premium Nova hoodie with embroidered logo." :
      k.includes("beanie") ? "Keep warm with a cozy Nova beanie." :
      k.includes("tee") ? "A casual Nova tee for everyday wear." :
      k.includes("sweat") ? "Soft Nova sweat bottoms for lounging." :
      k.includes("keychain") ? "A mini Nova keychain for your bag or keys." :
      k.includes("case") ? "A sturdy Nova phone case with style." :
      k.includes("stationery") ? "Nova-themed stationery for notes and doodles." :
      "Official Nova merchandise.";

    return {
      type: "tangible",
      category,
      cashPrice,
      coinPrice: toCoins(cashPrice),
      description,
    };
  }

  return {
    type: "virtual",
    category: "misc",
    cashPrice: 3,
    coinPrice: toCoins(3),
    description: "Digital cosmetic.",
  };
}
