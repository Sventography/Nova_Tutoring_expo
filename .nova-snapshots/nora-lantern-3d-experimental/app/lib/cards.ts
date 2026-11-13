export type Card = { front: string; back: string };

export const CARDS_BY_TOPIC: Record<string, Card[]> = {
  "Sample: Black Holes": [
    { front: "What is the Schwarzschild radius?", back: "The radius where escape velocity equals light speed" },
    { front: "What is spaghettification?", back: "Extreme tidal stretching near a black hole" },
    { front: "What surrounds a rotating black hole?", back: "An ergosphere" },
    { front: "What is a singularity?", back: "A point of infinite density/curvature" },
  ],
  "Sample: Basic Algebra": [
    { front: "Solve: 2x + 6 = 10", back: "x = 2" },
    { front: "Property: a(b + c) = ab + ac?", back: "Distributive property" },
    { front: "Term with no variable part is called?", back: "Constant" },
    { front: "Coefficient is…", back: "Numeric factor of a term" },
  ],
};

