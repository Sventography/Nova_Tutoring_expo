export type CompanionShopItem = {
  id: string;
  title: string;
  description: string;
  type: "companion";
  coinPrice: number;
  cashPrice: number;
  imageKey: string;
};

export const COMPANIONS_SHOP: CompanionShopItem[] = [
  {
    id: "companion:hearts",
    title: "Hearts Companion",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 15000,
    cashPrice: 4.99,
    imageKey: "companion:hearts",
  },
  {
    id: "companion:balloons",
    title: "Balloons Companion",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 15000,
    cashPrice: 4.99,
    imageKey: "companion:balloons",
  },
  {
    id: "companion:coins",
    title: "Coins Companion",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 20000,
    cashPrice: 6.99,
    imageKey: "companion:coins",
  },
  {
    id: "companion:study",
    title: "Study Buddy",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 20000,
    cashPrice: 6.99,
    imageKey: "companion:study",
  },
  {
    id: "companion:study_2",
    title: "Study Buddy (Alt)",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 20000,
    cashPrice: 6.99,
    imageKey: "companion:study_2",
  },
  {
    id: "companion:read",
    title: "Reading Companion",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 20000,
    cashPrice: 6.99,
    imageKey: "companion:read",
  },
  {
    id: "companion:sleepy_moon",
    title: "Sleepy Moon",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 22000,
    cashPrice: 7.99,
    imageKey: "companion:sleepy_moon",
  },
  {
    id: "companion:star_blow",
    title: "Star Blow",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 22000,
    cashPrice: 7.99,
    imageKey: "companion:star_blow",
  },
  {
    id: "companion:star_throw",
    title: "Star Throw",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 22000,
    cashPrice: 7.99,
    imageKey: "companion:star_throw",
  },
  {
    id: "companion:star_explode",
    title: "Star Explode",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 25000,
    cashPrice: 9.99,
    imageKey: "companion:star_explode",
  },
  {
    id: "companion:3d_party",
    title: "3D Party",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 25000,
    cashPrice: 9.99,
    imageKey: "companion:3d_party",
  },
  {
    id: "companion:3d_party2",
    title: "3D Party (Alt)",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 25000,
    cashPrice: 9.99,
    imageKey: "companion:3d_party2",
  },
  {
    id: "companion:nova_bunny_coin",
    title: "Nova Bunny Coin",
    description: "Tap to show/hide this companion in-app.",
    type: "companion",
    coinPrice: 30000,
    cashPrice: 12.99,
    imageKey: "companion:nova_bunny_coin",
  },
];
