// app/_lib/topicTaxonomy.ts
//
// Canonical classifier for Nova's quiz library.
// Quiz achievement logic should receive ONLY these stable subject keys.

export const SUBJECT_KEYS = [
  "math",
  "science",
  "history",
  "language",
  "computer_science",
  "social_science",
  "business",
  "health",
  "arts_humanities",
  "general",
] as const;

export type SubjectKey = (typeof SUBJECT_KEYS)[number];

export const SUBJECT_LABELS: Record<SubjectKey, string> = {
  math: "Math",
  science: "Science",
  history: "History",
  language: "Language & Literature",
  computer_science: "Computer Science",
  social_science: "Social Science",
  business: "Business & Economics",
  health: "Health & Medicine",
  arts_humanities: "Arts & Humanities",
  general: "General Studies",
};

export type TopicTaxonomy = {
  subject: SubjectKey;
  subjectLabel: string;
  discipline: string;
};

function clean(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function joined(topicId: unknown, title: unknown): string {
  return `${clean(topicId)} ${clean(title)}`
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function has(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function result(subject: SubjectKey, discipline: string): TopicTaxonomy {
  return {
    subject,
    subjectLabel: SUBJECT_LABELS[subject],
    discipline,
  };
}

export function normalizeSubjectKey(value: unknown): SubjectKey {
  const raw = clean(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return (SUBJECT_KEYS as readonly string[]).includes(raw)
    ? (raw as SubjectKey)
    : "general";
}

export function classifyTopic(
  topicId: unknown,
  title: unknown
): TopicTaxonomy {
  const text = joined(topicId, title);

  // Computer Science before generic science/data rules.
  if (
    has(text, [
      "computer science",
      "programming",
      "python",
      "javascript",
      "java ",
      "software",
      "algorithm",
      "data structure",
      "computer network",
      "cybersecurity",
      "cyber security",
      "database",
      "sql",
      "web development",
      "coding",
    ])
  ) {
    if (has(text, ["algorithm"])) return result("computer_science", "algorithms");
    if (has(text, ["data structure"])) return result("computer_science", "data_structures");
    if (has(text, ["network"])) return result("computer_science", "networks");
    if (has(text, ["database", "sql"])) return result("computer_science", "databases");
    if (has(text, ["python", "javascript", "java ", "programming", "coding"])) {
      return result("computer_science", "programming");
    }
    return result("computer_science", "computer_science");
  }

  // Health/medical before general biology/science.
  if (
    has(text, [
      "anatomy",
      "physiology",
      "medicine",
      "medical",
      "health",
      "nursing",
      "nutrition",
      "pharmacology",
      "pathology",
    ])
  ) {
    if (has(text, ["anatomy", "physiology"])) {
      return result("health", "anatomy_physiology");
    }
    if (has(text, ["nutrition"])) return result("health", "nutrition");
    return result("health", "health_medicine");
  }

  if (
    has(text, [
      "algebra",
      "geometry",
      "calculus",
      "trigonometry",
      "statistics",
      "probability",
      "differential equation",
      "linear algebra",
      "discrete mathematics",
      "precalculus",
      "pre calculus",
      "mathematics",
      "math ",
      "number theory",
    ])
  ) {
    if (has(text, ["algebra"])) return result("math", "algebra");
    if (has(text, ["calculus"])) return result("math", "calculus");
    if (has(text, ["geometry"])) return result("math", "geometry");
    if (has(text, ["statistics", "probability"])) {
      return result("math", "statistics_probability");
    }
    if (has(text, ["differential equation"])) {
      return result("math", "differential_equations");
    }
    if (has(text, ["discrete mathematics"])) {
      return result("math", "discrete_math");
    }
    return result("math", "mathematics");
  }

  if (
    has(text, [
      "biology",
      "chemistry",
      "physics",
      "environmental science",
      "earth science",
      "geology",
      "meteorology",
      "genetics",
      "evolution",
      "ecology",
      "astronomy",
      "science",
      "scientific",
    ])
  ) {
    if (has(text, ["biology", "genetics", "evolution", "ecology"])) {
      return result("science", "biology");
    }
    if (has(text, ["chemistry"])) return result("science", "chemistry");
    if (has(text, ["physics"])) return result("science", "physics");
    if (has(text, ["earth science", "geology", "meteorology"])) {
      return result("science", "earth_science");
    }
    if (has(text, ["environmental"])) {
      return result("science", "environmental_science");
    }
    if (has(text, ["astronomy"])) return result("science", "astronomy");
    return result("science", "general_science");
  }

  if (
    has(text, [
      "history",
      "civilization",
      "renaissance",
      "reformation",
      "cold war",
      "world war",
      "colonization",
      "reconstruction",
      "medieval",
      "ancient world",
    ])
  ) {
    if (has(text, ["u.s. history", "us history", "american history"])) {
      return result("history", "us_history");
    }
    if (has(text, ["world history"])) return result("history", "world_history");
    if (has(text, ["european history", "euro history"])) {
      return result("history", "european_history");
    }
    return result("history", "history");
  }

  if (
    has(text, [
      "english",
      "grammar",
      "composition",
      "literature",
      "writing",
      "poetry",
      "spanish",
      "french",
      "german",
      "latin",
      "language",
      "linguistics",
      "vocabulary",
      "rhetoric",
      "communication",
    ])
  ) {
    if (has(text, ["spanish", "french", "german", "latin"])) {
      return result("language", "world_languages");
    }
    if (has(text, ["grammar", "composition", "writing", "rhetoric"])) {
      return result("language", "writing_composition");
    }
    if (has(text, ["literature", "poetry"])) {
      return result("language", "literature");
    }
    if (has(text, ["linguistics"])) {
      return result("language", "linguistics");
    }
    return result("language", "language");
  }

  if (
    has(text, [
      "psychology",
      "sociology",
      "anthropology",
      "political science",
      "government",
      "civics",
      "geography",
      "education",
      "criminal justice",
      "law ",
      "legal",
      "social science",
    ])
  ) {
    if (has(text, ["psychology"])) {
      return result("social_science", "psychology");
    }
    if (has(text, ["sociology", "anthropology"])) {
      return result("social_science", "sociology_anthropology");
    }
    if (has(text, ["government", "civics", "political science"])) {
      return result("social_science", "government_politics");
    }
    if (has(text, ["geography"])) {
      return result("social_science", "geography");
    }
    if (has(text, ["law ", "legal", "criminal justice"])) {
      return result("social_science", "law_justice");
    }
    return result("social_science", "social_science");
  }

  if (
    has(text, [
      "economics",
      "econometrics",
      "finance",
      "accounting",
      "business",
      "marketing",
      "management",
      "entrepreneur",
      "microeconomics",
      "macroeconomics",
    ])
  ) {
    if (
      has(text, [
        "economics",
        "econometrics",
        "microeconomics",
        "macroeconomics",
      ])
    ) {
      return result("business", "economics");
    }
    if (has(text, ["finance"])) return result("business", "finance");
    if (has(text, ["accounting"])) return result("business", "accounting");
    return result("business", "business");
  }

  if (
    has(text, [
      "philosophy",
      "ethics",
      "religion",
      "theology",
      "mythology",
      "film studies",
      "art ",
      "arts ",
      "music",
      "humanities",
      "logic",
    ])
  ) {
    if (has(text, ["philosophy", "ethics", "logic"])) {
      return result("arts_humanities", "philosophy_ethics");
    }
    if (has(text, ["religion", "theology", "mythology"])) {
      return result("arts_humanities", "religion_mythology");
    }
    if (has(text, ["film"])) return result("arts_humanities", "film");
    if (has(text, ["music"])) return result("arts_humanities", "music");
    return result("arts_humanities", "arts_humanities");
  }

  return result("general", "general_studies");
}
