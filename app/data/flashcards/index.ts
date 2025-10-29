import algebraIntro from "./abstract_algebra_intro.json";
import apBiology from "./ap_biology.json";
import anthropology from "./anthropology.json";

// map keys must match _topics_alias.json "file"
export const FLASHCARD_DATA: Record<string, any> = {
  "abstract_algebra_intro.json": algebraIntro,
  "ap_biology.json": apBiology,
  "anthropology.json": anthropology,
};
