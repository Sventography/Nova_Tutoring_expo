import { Flashcard } from "../types";

export const CARDS_BY_TOPIC: Record<string, Flashcard[]> = {
  algebra: [
    {
      id: "alg_1",
      topicId: "algebra",
      front: "Solve: 2x + 5 = 17",
      back: "x = 6",
    },
    {
      id: "alg_2",
      topicId: "algebra",
      front: "Factor: x^2 - 9",
      back: "(x - 3)(x + 3)",
    },
  ],
  geometry: [
    {
      id: "geo_1",
      topicId: "geometry",
      front: "Sum of interior angles of a triangle",
      back: "180°",
    },
    { id: "geo_2", topicId: "geometry", front: "Area of circle", back: "πr²" },
  ],
  marketing: [
    {
      id: "mkt_1",
      topicId: "marketing",
      front: "4 Ps of Marketing",
      back: "Product, Price, Place, Promotion",
    },
    {
      id: "mkt_2",
      topicId: "marketing",
      front: "SWOT: W stands for?",
      back: "Weaknesses",
    },
  ],
  python: [
    {
      id: "py_1",
      topicId: "python",
      front: "List comprehension for squares 0..4",
      back: "[i*i for i in range(5)]",
    },
    {
      id: "py_2",
      topicId: "python",
      front: "Immutable built-in sequence",
      back: "tuple",
    },
  ],
};
