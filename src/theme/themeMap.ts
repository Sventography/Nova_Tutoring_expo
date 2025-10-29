export type ThemeSpec = {
  name: string;
  bg: string;
  card: string;
  text: string;
  subtext: string;
  border?: string;
};
const themeMap: Record<string, ThemeSpec> = {
  default: {
    name: "Default",
    bg: "#0b0b10",
    card: "#14141c",
    text: "#ffffff",
    subtext: "#a7a7b2",
    border: "#2a2a3a",
  },
  theme_black_gold: {
    name: "Black & Gold",
    bg: "#0a0a0a",
    card: "#141414",
    text: "#fef9c3",
    subtext: "#facc15",
    border: "#1f1f1f",
  },
};
export default themeMap;
