export type Question = { q: string; choices: string[]; answer: number };
export type Quiz = { id: string; title: string; questions: Question[] };

export const QUIZZES: Quiz[] = [
  {
    id: "algebra-basics",
    title: "Algebra Basics",
    questions: [
      {
        q: "Solve: 2x + 6 = 14. What is x?",
        choices: ["2", "3", "4", "5"],
        answer: 2,
      },
      {
        q: "Factor: x^2 - 9",
        choices: ["(x-3)(x+3)", "(x-9)(x+1)", "(x-3)^2", "Prime"],
        answer: 0,
      },
      { q: "Slope of y = 3x - 5", choices: ["-5", "0", "3", "5"], answer: 2 },
    ],
  },
  {
    id: "science-mix",
    title: "Science Mix",
    questions: [
      {
        q: "Water boils at what °C at sea level?",
        choices: ["50", "75", "90", "100"],
        answer: 3,
      },
      {
        q: "Earth is the ___ planet from the Sun.",
        choices: ["2nd", "3rd", "4th", "5th"],
        answer: 1,
      },
      {
        q: "DNA stands for",
        choices: [
          "Deoxyribonucleic acid",
          "Dioxygen nitrogen acid",
          "Dual nucleic atoms",
          "None",
        ],
        answer: 0,
      },
    ],
  },
];
