import { canonId } from "./canonId";

export type CompanionItem = {
  id: string;
  canonId: string;
  name: string;
  image: any;
  category: "companions";
  coinPrice: number;
};

export const COMPANIONS: CompanionItem[] = [
  {
    id: "companion:nova_bunny",
    canonId: canonId("companion:nova_bunny"),
    name: "Nova Bunny",
    image: require("../assets/companions/nova_bunny_coin.png"),
    category: "companions",
    coinPrice: 25000,
  },
  {
    id: "companion:study",
    canonId: canonId("companion:study"),
    name: "Study Buddy",
    image: require("../assets/companions/study.png"),
    category: "companions",
    coinPrice: 25000,
  },
  {
    id: "companion:sleepy_moon",
    canonId: canonId("companion:sleepy_moon"),
    name: "Sleepy Moon",
    image: require("../assets/companions/sleepy_moon.png"),
    category: "companions",
    coinPrice: 25000,
  },
  {
    id: "companion:balloons",
    canonId: canonId("companion:balloons"),
    name: "Balloons",
    image: require("../assets/companions/balloons.png"),
    category: "companions",
    coinPrice: 25000,
  },
  {
    id: "companion:hearts",
    canonId: canonId("companion:hearts"),
    name: "Hearts",
    image: require("../assets/companions/hearts.png"),
    category: "companions",
    coinPrice: 25000,
  },
];
