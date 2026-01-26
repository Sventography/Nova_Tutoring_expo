export type Companion = {
  id: string;
  name: string;
  image: any;
};

export const COMPANIONS: Companion[] = [
  {
    id: "nova_bunny",
    name: "Nova Bunny",
    image: require("../assets/companions/nova_bunny_coin.png"),
  },
];
