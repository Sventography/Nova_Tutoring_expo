export type CompanionId =
  | "companion:3d_party"
  | "companion:3d_party2"
  | "companion:balloons"
  | "companion:coins"
  | "companion:hearts"
  | "companion:nova_bunny_coin"
  | "companion:read"
  | "companion:sleepy_moon"
  | "companion:star_blow"
  | "companion:star_explode"
  | "companion:star_throw"
  | "companion:study"
  | "companion:study_2";

export const COMPANION_ASSETS: Record<CompanionId, any> = {
  "companion:3d_party": require("./3d_party.png"),
  "companion:3d_party2": require("./3d_party2.png"),
  "companion:balloons": require("./balloons.png"),
  "companion:coins": require("./coins.png"),
  "companion:hearts": require("./hearts.png"),
  "companion:nova_bunny_coin": require("./nova_bunny_coin.png"),
  "companion:read": require("./read.png"),
  "companion:sleepy_moon": require("./sleepy_moon.png"),
  "companion:star_blow": require("./star_blow.png"),
  "companion:star_explode": require("./star_explode.png"),
  "companion:star_throw": require("./star_throw.png"),
  "companion:study": require("./study.png"),
  "companion:study_2": require("./study_2.png"),
};
