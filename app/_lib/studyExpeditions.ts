// Small, offline-first learning missions. No paid currency or external AI calls.
export type ExpeditionQuestion = {
  question: string;
  choices: [string, string, string, string];
  correctIndex: number;
  hint: string;
  explanation: string;
};

export type StudyExpedition = {
  id: string;
  title: string;
  subtitle: string;
  introduction: string;
  questions: [ExpeditionQuestion, ExpeditionQuestion, ExpeditionQuestion];
};

export const STUDY_EXPEDITIONS: StudyExpedition[] = [
  {
    id: "fraction-forest",
    title: "The Fraction Forest",
    subtitle: "Equivalent fractions",
    introduction: "Three stepping stones cross the river. Each stone lights up when you explain a fraction.",
    questions: [
      {
        question: "Which fraction is equivalent to 1/2?",
        choices: ["1/4", "2/4", "2/3", "3/5"],
        correctIndex: 1,
        hint: "Try multiplying the top and bottom of 1/2 by the same number.",
        explanation: "Multiplying both the numerator and denominator by 2 makes 2/4. The size of the fraction stays the same.",
      },
      {
        question: "Which is greater?",
        choices: ["1/3", "1/4", "They are equal", "Neither is a fraction"],
        correctIndex: 0,
        hint: "Imagine sharing one pizza with three people versus four people.",
        explanation: "When the whole is the same size, dividing it into fewer equal pieces makes each piece bigger. So 1/3 is greater than 1/4.",
      },
      {
        question: "You have 3/6 of a treasure map. How much is that in simplest form?",
        choices: ["1/3", "2/3", "1/2", "3/3"],
        correctIndex: 2,
        hint: "What number divides both 3 and 6 evenly?",
        explanation: "Divide the top and bottom by 3: 3/6 becomes 1/2.",
      },
    ],
  },
  {
    id: "reading-library",
    title: "The Whispering Library",
    subtitle: "Reading comprehension",
    introduction: "A story is missing its final page. Find what its clues actually support.",
    questions: [
      {
        question: "Mara brought an umbrella because the sky was dark and thunder rumbled. What can we infer?",
        choices: ["She expects rain", "She is going swimming", "It is midnight", "She dislikes umbrellas"],
        correctIndex: 0,
        hint: "An inference is a sensible conclusion based on clues, not a random possibility.",
        explanation: "Dark skies and thunder make rain likely, so bringing an umbrella suggests she expects rain.",
      },
      {
        question: "Which sentence is a fact rather than an opinion?",
        choices: ["The library is the best place", "That book is boring", "The library closes at six", "Reading is more fun than games"],
        correctIndex: 2,
        hint: "Which claim could be checked against a schedule?",
        explanation: "A closing time is verifiable. Words like best, boring, and more fun express opinions.",
      },
      {
        question: "A character returns a lost wallet even though nobody is watching. Which trait does this BEST show?",
        choices: ["Impatience", "Honesty", "Confusion", "Jealousy"],
        correctIndex: 1,
        hint: "Focus on the choice the character makes when there is no reward.",
        explanation: "Returning something that belongs to someone else is evidence of honesty.",
      },
    ],
  },
  {
    id: "science-starlight",
    title: "Starlight Laboratory",
    subtitle: "Scientific thinking",
    introduction: "Help Nova test three ideas using observations instead of guesses.",
    questions: [
      {
        question: "A plant near a window grows toward sunlight. This response is called...",
        choices: ["Evaporation", "Phototropism", "Condensation", "Friction"],
        correctIndex: 1,
        hint: "Photo means light; tropism means a growth response.",
        explanation: "Phototropism is the way a plant grows in response to light.",
      },
      {
        question: "You want to test whether soil type affects plant growth. What should you change?",
        choices: ["Soil type only", "Soil and light", "Soil and water", "Everything at once"],
        correctIndex: 0,
        hint: "A fair experiment changes one factor and keeps others as similar as possible.",
        explanation: "Changing only the soil helps you tell whether soil caused the difference.",
      },
      {
        question: "Which is an observation, not an explanation?",
        choices: ["The ice melted because it was warm", "The cup is unlucky", "The water temperature is 22°C", "The plant wants attention"],
        correctIndex: 2,
        hint: "Observations describe what you can measure or directly notice.",
        explanation: "A measured temperature is an observation. The other choices explain or guess causes and intentions.",
      },
    ],
  },
];

export function localExpeditionDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

export function expeditionForDate(dateKey: string): StudyExpedition {
  // Calendar-date selection, independent of timezone-specific UTC conversions.
  const day = Number(dateKey.slice(-2)) || 1;
  const month = Number(dateKey.slice(5, 7)) || 1;
  const year = Number(dateKey.slice(0, 4)) || 2026;
  const index = (((year * 372 + month * 31 + day) % STUDY_EXPEDITIONS.length) + STUDY_EXPEDITIONS.length) % STUDY_EXPEDITIONS.length;
  return STUDY_EXPEDITIONS[index];
}
