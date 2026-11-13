export type QA = { q: string; a: string; hint?: string };

export type Topic = {
  id: string;
  title: string;
  questions?: QA[];
  flashcards?: { front: string; back: string }[];
};

function makeFallbackTopic(id: string, title: string): Topic {
  return {
    id,
    title,
    questions: [
      { q: `What is ${title}?`, a: `${title} basics.` },
      {
        q: `Name one key concept in ${title}.`,
        a: `A core concept of ${title}.`,
      },
    ],
    flashcards: [
      {
        front: `${title}: key term`,
        back: `Definition of a key term in ${title}`,
      },
      { front: `${title}: fact`, back: `A short fact about ${title}` },
    ],
  };
}

/* ===================== RICH TOPICS (40) ===================== */
/* --- math & science --- */

const algebra: Topic = {
  id: "algebra",
  title: "Basic Algebra",
  questions: [
    { q: "Solve: 2x + 6 = 14", a: "x = 4" },
    { q: "Slope-intercept form", a: "y = mx + b" },
    { q: "Point-slope form", a: "y − y1 = m(x − x1)" },
    { q: "Slope from two points", a: "(y2 − y1)/(x2 − x1)" },
    { q: "Expand: (x + 3)(x − 3)", a: "x² − 9" },
    { q: "Quadratic formula", a: "x = [−b ± √(b² − 4ac)]/(2a)" },
    { q: "Factor: x² + 5x + 6", a: "(x + 2)(x + 3)" },
    { q: "Domain of 1/(x−4)", a: "All reals except x = 4" },
    { q: "Solve: |x − 5| = 2", a: "x = 7 or x = 3" },
    { q: "Simplify: x^a · x^b", a: "x^(a+b)" },
    { q: "Simplify: (x^a)^b", a: "x^(ab)" },
    { q: "Zero of a function", a: "x where f(x)=0" },
    { q: "Vertex of y = (x−2)² + 3", a: "(2, 3)" },
    { q: "Solve: 3(x−1)=12", a: "x = 5" },
    { q: "Arithmetic sequence nth term", a: "a_n = a1 + (n−1)d" },
  ],
  flashcards: [
    { front: "Discriminant", back: "b² − 4ac (sign tells roots nature)" },
    { front: "Function", back: "Each input maps to exactly one output" },
  ],
};

const geometry: Topic = {
  id: "geometry",
  title: "Geometry",
  questions: [
    { q: "Sum of interior angles of triangle", a: "180°" },
    { q: "Pythagorean theorem", a: "a² + b² = c²" },
    { q: "Area of a circle", a: "πr²" },
    { q: "Circumference of a circle", a: "2πr" },
    { q: "Area of triangle", a: "(1/2)bh" },
    { q: "Volume of rectangular prism", a: "lwh" },
    { q: "Volume of cylinder", a: "πr²h" },
    { q: "Sum interior angles of n-gon", a: "(n−2)×180°" },
    { q: "Alternate interior angles (parallel)", a: "Equal" },
    { q: "30-60-90 ratio", a: "1 : √3 : 2" },
    { q: "Regular polygon", a: "All sides & angles equal" },
    { q: "Heron’s formula", a: "Area = √(s(s−a)(s−b)(s−c))" },
    { q: "Similar triangles", a: "Equal angles, proportional sides" },
    { q: "Diagonals in n-gon", a: "n(n−3)/2" },
    { q: "Area of trapezoid", a: "((b1+b2)/2)h" },
  ],
};

const trigonometry: Topic = {
  id: "trigonometry",
  title: "Trigonometry",
  questions: [
    { q: "sin(30°)", a: "1/2" },
    { q: "cos(60°)", a: "1/2" },
    { q: "tan(45°)", a: "1" },
    { q: "Identity: sin²θ + cos²θ", a: "1" },
    { q: "Law of Sines", a: "a/sinA = b/sinB = c/sinC" },
    { q: "Law of Cosines", a: "c² = a² + b² − 2abcosC" },
    { q: "Radians in 180°", a: "π" },
    { q: "sin(π/6)", a: "1/2" },
    { q: "cos(π/3)", a: "1/2" },
    { q: "tan(π/4)", a: "1" },
    { q: "Amplitude y=Asin(x)", a: "|A|" },
    { q: "Period y=sin(kx)", a: "2π/|k|" },
    { q: "sin(90°−θ)", a: "cosθ" },
    { q: "cos(90°−θ)", a: "sinθ" },
    { q: "tan(90°−θ)", a: "cotθ" },
  ],
};

const calculus: Topic = {
  id: "calculus",
  title: "Calculus",
  questions: [
    { q: "d/dx x²", a: "2x" },
    { q: "d/dx sin x", a: "cos x" },
    { q: "d/dx cos x", a: "−sin x" },
    { q: "∫ 1/x dx", a: "ln|x| + C" },
    { q: "∫ e^x dx", a: "e^x + C" },
    { q: "Fundamental Theorem idea", a: "Diff and int are inverses" },
    { q: "d/dx ln x", a: "1/x" },
    { q: "d/dx tan x", a: "sec² x" },
    { q: "∫ cos x dx", a: "sin x + C" },
    { q: "∫ sin x dx", a: "−cos x + C" },
    { q: "Limit def of derivative", a: "f′(x)=lim(h→0)[f(x+h)−f(x)]/h" },
    { q: "Critical point", a: "f′(x)=0 or undefined" },
    { q: "Concave up if", a: "f″(x) > 0" },
    { q: "Chain rule", a: "d/dx f(g)=f′(g)·g′" },
    { q: "Area under curve term", a: "Definite integral" },
  ],
};

const statistics: Topic = {
  id: "statistics",
  title: "Statistics",
  questions: [
    { q: "Mean", a: "Sum ÷ count" },
    { q: "Median", a: "Middle ordered value" },
    { q: "Mode", a: "Most frequent value" },
    { q: "Variance", a: "Avg of squared deviations" },
    { q: "Std deviation", a: "√variance" },
    { q: "z-score", a: "(x−μ)/σ" },
    { q: "P-value meaning", a: "Pr(data|null true)" },
    { q: "Correlation range", a: "−1 to 1" },
    { q: "Independent events", a: "Multiply probabilities" },
    { q: "Expected value", a: "Long-run average" },
    { q: "Normal mean=median=mode?", a: "Yes" },
    { q: "Sampling vs population", a: "Subset vs entire group" },
    { q: "Confidence interval", a: "Likely parameter range" },
    { q: "Outlier effect on mean", a: "Pulls it toward tail" },
    { q: "Binomial parameters", a: "n, p" },
  ],
};

const biology: Topic = {
  id: "biology",
  title: "Biology",
  questions: [
    { q: "Cell powerhouses", a: "Mitochondria" },
    { q: "DNA shape", a: "Double helix" },
    { q: "Protein builders", a: "Ribosomes" },
    { q: "Photosynthesis organelle", a: "Chloroplast" },
    { q: "ATP stands for", a: "Adenosine triphosphate" },
    { q: "Cell membrane model", a: "Fluid mosaic" },
    { q: "Meiosis makes", a: "Gametes" },
    { q: "Osmosis", a: "Diffusion of water" },
    { q: "Gene → protein", a: "Transcription → translation" },
    { q: "Natural selection", a: "Differential survival/reproduction" },
    { q: "Blood oxygen carrier", a: "Hemoglobin" },
    { q: "Homeostasis", a: "Stable internal conditions" },
    { q: "Enzyme role", a: "Lowers activation energy" },
    { q: "Dominant vs recessive", a: "Dominant masks recessive" },
    { q: "Biomes defined by", a: "Climate & life forms" },
  ],
};

const chemistry: Topic = {
  id: "chemistry",
  title: "Chemistry",
  questions: [
    { q: "Smallest unit of element", a: "Atom" },
    { q: "Atomic number", a: "Proton count" },
    { q: "Ionic bond", a: "Electron transfer" },
    { q: "Covalent bond", a: "Electron sharing" },
    { q: "pH 7", a: "Neutral" },
    { q: "Avogadro’s number", a: "6.022×10^23" },
    { q: "Molarity", a: "mol/L" },
    { q: "Endothermic", a: "Absorbs heat" },
    { q: "Exothermic", a: "Releases heat" },
    { q: "Catalyst", a: "Speeds reaction, unchanged" },
    { q: "Oxidation", a: "Loss of electrons" },
    { q: "Reduction", a: "Gain of electrons" },
    { q: "Ideal gas law", a: "PV=nRT" },
    { q: "Periodic groups", a: "Columns with similar properties" },
    { q: "Electronegativity trend", a: "↑ across, ↓ down" },
  ],
};

const physics: Topic = {
  id: "physics",
  title: "Physics",
  questions: [
    { q: "Newton’s 1st law", a: "Inertia" },
    { q: "F = ma", a: "Newton’s 2nd law" },
    { q: "Action–reaction", a: "Newton’s 3rd law" },
    { q: "Kinetic energy", a: "(1/2)mv²" },
    { q: "Grav potential near Earth", a: "mgh" },
    { q: "Work", a: "Force × displacement" },
    { q: "Power", a: "Work/time" },
    { q: "Ohm’s law", a: "V = IR" },
    { q: "Wave speed", a: "v = fλ" },
    { q: "Speed of light", a: "~3.0×10^8 m/s" },
    { q: "Conserved quantities", a: "Energy, momentum, charge" },
    { q: "Refraction", a: "Bending in new medium" },
    { q: "Density", a: "Mass/volume" },
    { q: "Impulse", a: "Force × time = Δp" },
    { q: "SHM example", a: "Mass–spring, small-angle pendulum" },
  ],
};

const earth_science: Topic = {
  id: "earth_science",
  title: "Earth Science",
  questions: [
    { q: "Earth layers (out→in)", a: "Crust, mantle, outer core, inner core" },
    { q: "Plate tectonics drive", a: "Mantle convection" },
    { q: "Igneous rock from", a: "Solidified magma/lava" },
    { q: "Sedimentary rock forms by", a: "Deposition & lithification" },
    { q: "Metamorphic rock via", a: "Heat & pressure" },
    {
      q: "Water cycle steps",
      a: "Evaporation, condensation, precipitation, runoff",
    },
    { q: "Greenhouse gases example", a: "CO2, CH4, N2O, H2O vapor" },
    { q: "El Niño is", a: "Pacific warming pattern" },
    { q: "Richter measures", a: "Earthquake magnitude" },
    { q: "Karst landscape made by", a: "Limestone dissolution" },
  ],
  flashcards: [
    { front: "Moho", back: "Boundary between crust & mantle" },
    { front: "Subduction", back: "One plate dives beneath another" },
  ],
};

/* --- humanities & social --- */

const history_us: Topic = {
  id: "history_us",
  title: "U.S. History",
  questions: [
    { q: "Declaration of Independence year", a: "1776" },
    { q: "Civil War years", a: "1861–1865" },
    { q: "Emancipation Proclamation", a: "1863, Lincoln" },
    { q: "Great Depression decade", a: "1930s" },
    { q: "New Deal architect", a: "FDR" },
    { q: "Women’s suffrage amendment", a: "19th (1920)" },
    { q: "Civil Rights Act", a: "1964" },
    { q: "Louisiana Purchase", a: "1803 from France" },
    { q: "First president", a: "George Washington" },
    { q: "Bill of Rights are", a: "First 10 amendments" },
    { q: "Boston Tea Party year", a: "1773" },
    { q: "MLK 'Dream' speech", a: "1963" },
    { q: "Watergate resignation", a: "Richard Nixon, 1974" },
    { q: "WWII U.S. entry trigger", a: "Pearl Harbor, 1941" },
    { q: "9/11 year", a: "2001" },
  ],
};

const world_history: Topic = {
  id: "world_history",
  title: "World History",
  questions: [
    { q: "Ancient river of Egypt", a: "Nile" },
    { q: "Roman Empire founder (first emperor)", a: "Augustus" },
    { q: "Silk Road linked", a: "East Asia & Europe" },
    { q: "Black Death century", a: "14th" },
    { q: "Mongol founder", a: "Genghis Khan" },
    { q: "Renaissance began", a: "Italy" },
    { q: "French Revolution", a: "1789" },
    { q: "WWI years", a: "1914–1918" },
    { q: "WWII years", a: "1939–1945" },
    { q: "Industrial Revolution start", a: "Britain" },
    { q: "Great Wall country", a: "China" },
    { q: "Ottoman capital", a: "Istanbul" },
    { q: "Printing press in Europe", a: "Gutenberg" },
    { q: "Cold War end", a: "~1991" },
    { q: "Age of Exploration motive", a: "Trade routes, wealth, glory" },
  ],
};

const literature: Topic = {
  id: "literature",
  title: "Literature",
  questions: [
    { q: "Author of '1984'", a: "George Orwell" },
    { q: "Author of 'Pride and Prejudice'", a: "Jane Austen" },
    { q: "Danish prince tragedy", a: "Hamlet (Shakespeare)" },
    { q: "Iliad poet", a: "Homer" },
    { q: "American author of 'The Raven'", a: "Edgar Allan Poe" },
    { q: "Symbolism", a: "Objects represent ideas" },
    { q: "Metaphor", a: "Direct comparison" },
    { q: "Simile", a: "Like/as comparison" },
    { q: "Alliteration", a: "Repeated initial consonants" },
    { q: "Theme", a: "Central idea" },
    { q: "First-person pronoun", a: "'I'" },
    { q: "Protagonist", a: "Main character" },
    { q: "Antagonist", a: "Opposing force" },
    { q: "Foreshadowing", a: "Hints of future events" },
    { q: "Setting", a: "Time & place" },
  ],
};

const civics: Topic = {
  id: "civics",
  title: "Civics & Government",
  questions: [
    { q: "Three branches (U.S.)", a: "Legislative, Executive, Judicial" },
    { q: "Checks & balances purpose", a: "Prevent concentration of power" },
    {
      q: "Constitution supremacy clause means",
      a: "Constitution is highest law",
    },
    { q: "Congress houses", a: "Senate & House of Representatives" },
    { q: "Number of Senators", a: "100" },
    { q: "Number of House members", a: "435" },
    { q: "Bill of Rights protects", a: "Individual liberties" },
    { q: "Judicial review case", a: "Marbury v. Madison (1803)" },
    { q: "Federalism", a: "Power shared national/state" },
    { q: "Electoral College role", a: "Elects president" },
  ],
  flashcards: [
    { front: "Habeas corpus", back: "Right to challenge unlawful detention" },
    { front: "Due process", back: "Fair legal procedures" },
  ],
};

const philosophy: Topic = {
  id: "philosophy",
  title: "Philosophy",
  questions: [
    { q: "Socratic method", a: "Question-driven inquiry" },
    { q: "Utilitarianism aim", a: "Greatest happiness for greatest number" },
    {
      q: "Categorical imperative (Kant)",
      a: "Act by maxims you’d universalize",
    },
    { q: "Empiricism emphasizes", a: "Experience/observation" },
    { q: "Rationalism emphasizes", a: "Reason/innate ideas" },
    { q: "Existentialism theme", a: "Individual meaning/freedom" },
    { q: "Dualism (Descartes)", a: "Mind & body distinct" },
    { q: "Nihilism claims", a: "No inherent meaning" },
    { q: "Stoicism focus", a: "Virtue & control of reactions" },
    { q: "Eudaimonia", a: "Flourishing (Aristotle)" },
  ],
};

const psychology: Topic = {
  id: "psychology",
  title: "Psychology",
  questions: [
    { q: "Classical conditioning scientist", a: "Pavlov" },
    { q: "Operant conditioning scientist", a: "B. F. Skinner" },
    { q: "Working memory capacity", a: "~7±2 items (classic view)" },
    {
      q: "Big Five trait example",
      a: "Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism",
    },
    {
      q: "Cognitive dissonance",
      a: "Tension from inconsistent beliefs/actions",
    },
    { q: "Placebo effect", a: "Benefit from inert treatment via expectation" },
    { q: "Attachment styles", a: "Secure, anxious, avoidant, disorganized" },
    { q: "Heuristic", a: "Mental shortcut" },
    { q: "Amnesia type affecting new memories", a: "Anterograde" },
    {
      q: "Conditioned stimulus becomes",
      a: "Trigger for conditioned response",
    },
  ],
};

const sociology: Topic = {
  id: "sociology",
  title: "Sociology",
  questions: [
    {
      q: "Sociological imagination (Mills)",
      a: "Link personal troubles & public issues",
    },
    { q: "Socialization", a: "Learning norms/roles" },
    { q: "Deviance", a: "Norm-violating behavior" },
    { q: "Status vs role", a: "Position vs expected behavior" },
    { q: "Stratification", a: "Structured inequality" },
    { q: "Culture", a: "Shared beliefs/practices" },
    { q: "Anomie (Durkheim)", a: "Normlessness" },
    { q: "Social capital", a: "Value of networks" },
    { q: "Labeling theory", a: "Deviance via labels" },
    { q: "Intersectionality", a: "Overlapping identities/inequalities" },
  ],
};

const art_history: Topic = {
  id: "art_history",
  title: "Art History",
  questions: [
    { q: "Mona Lisa painter", a: "Leonardo da Vinci" },
    { q: "Starry Night painter", a: "Vincent van Gogh" },
    { q: "Sistine Chapel ceiling", a: "Michelangelo" },
    { q: "Impressionism hallmark", a: "Light & color, visible brushstrokes" },
    { q: "Cubism pioneers", a: "Picasso, Braque" },
    { q: "Surrealism example artist", a: "Salvador Dalí" },
    { q: "Baroque traits", a: "Drama, movement, contrast" },
    { q: "Rococo traits", a: "Ornate, playful, pastel" },
    { q: "Fresco technique", a: "Paint on wet plaster" },
    { q: "Sculpture subtractive method", a: "Carving" },
  ],
};

const music_theory: Topic = {
  id: "music_theory",
  title: "Music Theory",
  questions: [
    { q: "Major scale interval pattern", a: "W-W-H-W-W-W-H" },
    { q: "Perfect fifth in C", a: "G" },
    { q: "Triad notes", a: "Root, third, fifth" },
    { q: "Relative minor of C major", a: "A minor" },
    { q: "Time signature top number", a: "Beats per measure" },
    { q: "Syncopation", a: "Emphasis off the beat" },
    { q: "Tempo unit", a: "BPM" },
    { q: "Key signature sharps order", a: "F C G D A E B" },
    { q: "Circle of fifths use", a: "Keys relationships" },
    { q: "Cadence V–I", a: "Authentic cadence" },
  ],
};

/* --- tech & study --- */

const computer_science: Topic = {
  id: "computer_science",
  title: "Computer Science",
  questions: [
    { q: "Big-O of binary search", a: "O(log n)" },
    { q: "Hash table avg lookup", a: "O(1)" },
    { q: "Stack vs queue", a: "LIFO vs FIFO" },
    { q: "DFS vs BFS", a: "Depth-first vs breadth-first" },
    { q: "Stable sort means", a: "Preserves equal keys order" },
    {
      q: "Deadlock needs",
      a: "Mutual exclusion, hold&wait, no preemption, circular wait",
    },
    {
      q: "ACID in databases",
      a: "Atomicity, Consistency, Isolation, Durability",
    },
    { q: "REST principle", a: "Stateless resources via HTTP" },
    { q: "CAP tradeoff", a: "Consistency, Availability, Partition tolerance" },
    { q: "Cache eviction example", a: "LRU" },
  ],
  flashcards: [
    { front: "Heap vs stack memory", back: "Dynamic vs automatic" },
    { front: "Race condition", back: "Outcome depends on timing" },
  ],
};

const programming: Topic = {
  id: "programming",
  title: "Programming Fundamentals",
  questions: [
    { q: "Variable scope", a: "Where it’s accessible" },
    { q: "Immutable value example (JS)", a: "String" },
    { q: "Pure function", a: "No side effects, same input → same output" },
    { q: "Unit test purpose", a: "Verify small pieces" },
    { q: "Refactoring", a: "Improve structure without changing behavior" },
    { q: "Exception handling", a: "try/catch/finally (varies by lang)" },
    { q: "Interface vs class", a: "Contract vs implementation" },
    { q: "Generics help with", a: "Type-safe reuse" },
    { q: "Version control benefit", a: "History, branching, collaboration" },
    { q: "CI meaning", a: "Continuous Integration" },
  ],
};

const web_dev: Topic = {
  id: "web_dev",
  title: "Web Development",
  questions: [
    { q: "HTML role", a: "Structure" },
    { q: "CSS role", a: "Presentation" },
    { q: "JS role", a: "Behavior" },
    { q: "Flexbox axis terms", a: "Main axis / cross axis" },
    { q: "Responsive design", a: "Adapts to screen sizes" },
    { q: "Accessibility attribute example", a: "aria-label" },
    { q: "HTTP status 200", a: "OK" },
    { q: "HTTP status 404", a: "Not Found" },
    { q: "CORS purpose", a: "Cross-origin resource sharing rules" },
    { q: "Service worker use", a: "Offline caching, PWA" },
  ],
};

const data_science: Topic = {
  id: "data_science",
  title: "Data Science",
  questions: [
    {
      q: "Train/validation/test split",
      a: "Separate sets for fit, tune, evaluate",
    },
    { q: "Overfitting", a: "Fits noise; poor generalization" },
    { q: "Regularization", a: "Penalize complexity (L1/L2)" },
    { q: "Feature scaling", a: "Normalize/standardize inputs" },
    { q: "Confusion matrix cells", a: "TP, FP, TN, FN" },
    { q: "Precision vs recall", a: "Precision=TP/(TP+FP), Recall=TP/(TP+FN)" },
    { q: "AUC meaning", a: "Area under ROC" },
    { q: "k-fold CV", a: "Rotate validation folds" },
    { q: "Baseline model", a: "Simple reference performance" },
    { q: "EDA stands for", a: "Exploratory Data Analysis" },
  ],
};

const ai_basics: Topic = {
  id: "ai_basics",
  title: "AI & ML Basics",
  questions: [
    { q: "Supervised vs unsupervised", a: "Labeled targets vs none" },
    {
      q: "Classification vs regression",
      a: "Discrete labels vs continuous values",
    },
    { q: "Loss function purpose", a: "Quantify prediction error" },
    { q: "Gradient descent", a: "Iterative minimization by gradients" },
    { q: "Neural network unit", a: "Neuron (weighted sum + activation)" },
    { q: "Overparameterization risk", a: "Overfitting" },
    { q: "Regularizers", a: "Dropout, L1, L2, early stopping" },
    { q: "Transfer learning", a: "Reuse pre-trained features" },
    { q: "Prompt engineering", a: "Shaping instructions for LLMs" },
    { q: "Embedding", a: "Vector representation of text/items" },
  ],
};

const logic: Topic = {
  id: "logic",
  title: "Logic & Reasoning",
  questions: [
    { q: "Modus ponens", a: "If P→Q and P, then Q" },
    { q: "Modus tollens", a: "If P→Q and ¬Q, then ¬P" },
    { q: "Fallacy: ad hominem", a: "Attack person, not argument" },
    { q: "Fallacy: straw man", a: "Misrepresent argument to attack" },
    {
      q: "Valid vs sound",
      a: "Valid: correct form; Sound: valid + true premises",
    },
    { q: "Inductive reasoning", a: "Generalize from examples" },
    { q: "Deductive reasoning", a: "Derive specific from general" },
    { q: "Contradiction symbol", a: "⊥ (falsum)" },
    { q: "Contrapositive of P→Q", a: "¬Q → ¬P (logically equivalent)" },
    { q: "De Morgan’s laws", a: "¬(P∧Q)=¬P∨¬Q; ¬(P∨Q)=¬P∧¬Q" },
  ],
};

const writing: Topic = {
  id: "writing",
  title: "Writing & Composition",
  questions: [
    { q: "Thesis statement", a: "Central claim of essay" },
    { q: "Topic sentence", a: "Main idea of paragraph" },
    { q: "Coherence", a: "Logical flow across sentences" },
    { q: "Cohesion device example", a: "Transitions (however, therefore…)" },
    { q: "Active vs passive voice", a: "Doer-focused vs object-focused" },
    { q: "Hook", a: "Attention-grabbing opener" },
    { q: "Outline helps with", a: "Organization" },
    { q: "Revision vs proofreading", a: "Ideas/structure vs grammar/typos" },
    { q: "Plagiarism", a: "Using others’ work without credit" },
    { q: "Tone", a: "Author’s attitude/style" },
  ],
};

const grammar: Topic = {
  id: "grammar",
  title: "English Grammar",
  questions: [
    { q: "Subject–verb agreement", a: "Singular with singular, etc." },
    { q: "Pronoun antecedent", a: "Noun a pronoun replaces" },
    { q: "Oxford comma", a: "Comma before 'and' in lists" },
    { q: "Its vs it’s", a: "Possessive vs 'it is'" },
    { q: "Who vs whom", a: "Subject vs object" },
    { q: "Affect vs effect", a: "Verb vs noun (usually)" },
    { q: "Parallelism", a: "Match grammatical forms" },
    { q: "Dangling modifier", a: "Modifier with no clear target" },
    { q: "Clause vs phrase", a: "Clause has subject & verb" },
    { q: "Semicolon use", a: "Join related independent clauses" },
  ],
};

const study_skills: Topic = {
  id: "study_skills",
  title: "Study Skills",
  questions: [
    { q: "Pomodoro length (classic)", a: "25-minute focus + 5-minute break" },
    { q: "Spaced repetition benefit", a: "Improves long-term retention" },
    { q: "Active recall", a: "Practice retrieving information" },
    { q: "Interleaving practice", a: "Mix problem types" },
    { q: "Elaboration", a: "Explain in own words" },
    { q: "Dual coding", a: "Combine words & visuals" },
    { q: "Sleep impact", a: "Consolidates memory" },
    { q: "Test effect", a: "Testing improves learning" },
    { q: "Mind map", a: "Visual web of ideas" },
    { q: "Goal setting acronym", a: "SMART" },
  ],
};

const test_prep: Topic = {
  id: "test_prep",
  title: "Test Prep",
  questions: [
    { q: "SAT timing strategy", a: "Pace by section; skip/return" },
    { q: "ACT guessing penalty?", a: "No penalty; guess if unsure" },
    { q: "Eliminate choices technique", a: "Process of elimination" },
    { q: "Math plug-in strategy", a: "Try numbers to test choices" },
    { q: "Reading evidence questions", a: "Cite lines for support" },
    { q: "Write thesis quickly", a: "Clear claim + reasons" },
    { q: "Calculator usage tip", a: "Avoid for simple steps" },
    { q: "Bubble timing", a: "Fill as you go to avoid loss" },
    { q: "Careless error fix", a: "Underline units/keywords" },
    { q: "Practice tests role", a: "Build stamina & timing" },
  ],
};

/* --- money & business --- */

const economics: Topic = {
  id: "economics",
  title: "Economics",
  questions: [
    { q: "Law of demand", a: "Price ↑ → Qd ↓" },
    { q: "Law of supply", a: "Price ↑ → Qs ↑" },
    { q: "GDP", a: "Gross Domestic Product" },
    { q: "Inflation", a: "General price rise" },
    { q: "Monopoly", a: "Single seller" },
    { q: "Oligopoly", a: "Few firms dominate" },
    { q: "Fiscal policy", a: "Gov spending & taxes" },
    { q: "Monetary policy", a: "Money supply & interest rates" },
    { q: "Opportunity cost", a: "Next best forgone" },
    { q: "Comparative advantage", a: "Lower opportunity cost" },
    { q: "Elastic demand", a: "Responsive to price" },
    { q: "Unemployment rate", a: "% of labor force jobless" },
    { q: "CPI", a: "Consumer Price Index" },
    { q: "Externality", a: "External cost/benefit" },
    { q: "Recession definition", a: "Typically 2+ quarters GDP decline" },
  ],
};

const finance: Topic = {
  id: "finance",
  title: "Personal Finance",
  questions: [
    { q: "Budget 50/30/20 rule", a: "Needs 50, wants 30, savings/debt 20%" },
    { q: "Emergency fund size", a: "3–6 months expenses" },
    { q: "Simple vs compound interest", a: "Linear vs interest on interest" },
    { q: "Credit utilization sweet spot", a: "Generally <30%" },
    { q: "Index fund", a: "Tracks market index" },
    { q: "Diversification", a: "Spread risk across assets" },
    { q: "Tax-advantaged account", a: "401(k), IRA, HSA (varies by country)" },
    {
      q: "Debt snowball vs avalanche",
      a: "Smallest balance first vs highest rate first",
    },
    { q: "Net worth", a: "Assets − liabilities" },
    { q: "Dollar-cost averaging", a: "Invest fixed amount regularly" },
  ],
};

const business: Topic = {
  id: "business",
  title: "Business & Entrepreneurship",
  questions: [
    { q: "MVP stands for", a: "Minimum Viable Product" },
    { q: "Product–market fit", a: "Product satisfies strong market demand" },
    { q: "Unit economics", a: "Revenue/cost per customer/unit" },
    { q: "CAC vs LTV", a: "Acquisition cost vs lifetime value" },
    { q: "Moat", a: "Sustainable competitive advantage" },
    { q: "Churn", a: "Customers leaving over time" },
    { q: "OKRs", a: "Objectives and Key Results" },
    { q: "Gross margin", a: "(Revenue − COGS)/Revenue" },
    { q: "Runway", a: "Time until cash out at current burn" },
    { q: "Freemium model", a: "Free base, paid premium features" },
  ],
};

const marketing: Topic = {
  id: "marketing",
  title: "Marketing",
  questions: [
    { q: "4 Ps", a: "Product, Price, Place, Promotion" },
    { q: "Positioning", a: "How you’re perceived vs competitors" },
    { q: "Segmentation", a: "Divide market into groups" },
    { q: "A/B test", a: "Compare variants on outcome" },
    {
      q: "Funnel stages",
      a: "Awareness, Consideration, Conversion, Retention",
    },
    { q: "Loyalty programs goal", a: "Retention & repeat purchase" },
    { q: "NPS asks", a: "Likelihood to recommend (0–10)" },
    { q: "CPA", a: "Cost per acquisition" },
    { q: "Attribution model", a: "Assign credit to touchpoints" },
    { q: "Brand equity", a: "Value from brand perception" },
  ],
};

const project_mgmt: Topic = {
  id: "project_mgmt",
  title: "Project Management",
  questions: [
    { q: "Triple constraint", a: "Scope, time, cost (quality affected)" },
    { q: "Agile vs Waterfall", a: "Iterative vs sequential" },
    { q: "Scrum roles", a: "PO, Scrum Master, Dev Team" },
    { q: "Kanban limit", a: "WIP limit" },
    { q: "Critical path", a: "Longest sequence of dependent tasks" },
    { q: "Risk register", a: "Log of risks & responses" },
    { q: "Stakeholder analysis", a: "Power/interest mapping" },
    { q: "Retrospective goal", a: "Continuous improvement" },
    { q: "User story format", a: "As a … I want … so that …" },
    { q: "Definition of Done", a: "Agreed criteria for completion" },
  ],
};

/* --- language & wellness --- */

const foreign_language: Topic = {
  id: "foreign_language",
  title: "Language Learning",
  questions: [
    { q: "Comprehensible input", a: "Slightly above current level" },
    { q: "Spaced repetition benefit", a: "Retention of vocab" },
    { q: "Pronunciation tip", a: "Mimic native audio, minimal pairs" },
    {
      q: "Interleaving skill practice",
      a: "Mix speaking, listening, reading, writing",
    },
    { q: "Shadowing", a: "Speak along with native audio" },
    { q: "False friends", a: "Look similar, mean different" },
    { q: "Cognate", a: "Similar form & meaning across languages" },
    { q: "Gendered nouns", a: "Nouns with grammatical gender" },
    { q: "Register", a: "Formal vs informal usage" },
    { q: "Immersion", a: "Max exposure in target language" },
  ],
};

const health_wellness: Topic = {
  id: "health_wellness",
  title: "Health & Wellness",
  questions: [
    { q: "Adults sleep recommendation", a: "≈7–9 hours/night" },
    {
      q: "Aerobic guidelines (weekly)",
      a: "≈150 min moderate or 75 min vigorous",
    },
    { q: "Strength training frequency", a: "2+ days/week" },
    { q: "Hydration cue", a: "Thirst + pale straw urine" },
    { q: "Mindfulness benefit", a: "Reduces stress, improves attention" },
    { q: "Sunscreen SPF meaning", a: "Sunburn protection factor vs UVB" },
    { q: "Warm-up purpose", a: "Increase blood flow, prep joints" },
    { q: "Cool-down purpose", a: "Gradual recovery" },
    {
      q: "Ultra-processed food trait",
      a: "Industrial formulations with additives",
    },
    { q: "Habit loop", a: "Cue → routine → reward" },
  ],
};

const dinosaurs: Topic = {
  id: "dinosaurs",
  title: "Dinosaurs",
  questions: [
    { q: "Meaning of Tyrannosaurus rex", a: "Tyrant lizard king" },
    { q: "Stegosaurus tail spikes", a: "Thagomizer" },
    { q: "Velociraptor size", a: "About turkey-sized" },
    { q: "T. rex period", a: "Late Cretaceous" },
    { q: "Triceratops feature", a: "Three horns & frill" },
    { q: "Extinction time", a: "≈66 million years ago" },
    { q: "Main extinction theory", a: "Asteroid impact" },
    { q: "Pterosaurs are", a: "Flying reptiles, not dinosaurs" },
    { q: "Sauropods walk", a: "On four legs" },
    { q: "Hadrosaurs nickname", a: "Duck-billed dinosaurs" },
  ],
  flashcards: [
    { front: "Ankylosaurus", back: "Armor & club tail" },
    { front: "Fossil", back: "Preserved remains/traces" },
  ],
};

const astronomy: Topic = {
  id: "astronomy",
  title: "Astronomy",
  questions: [
    { q: "Nearest star after Sun", a: "Proxima Centauri" },
    { q: "Our galaxy", a: "Milky Way" },
    { q: "Largest planet", a: "Jupiter" },
    { q: "Universe expansion law", a: "Hubble’s Law" },
    { q: "Sun energy source", a: "Nuclear fusion" },
    { q: "Light-year", a: "Distance light travels in a year" },
    { q: "Saturn’s largest moon", a: "Titan" },
    { q: "First Moon landing", a: "1969" },
    { q: "Dwarf planet example", a: "Pluto" },
    { q: "Aurora cause", a: "Solar wind & magnetosphere" },
  ],
};

const geography: Topic = {
  id: "geography",
  title: "Geography",
  questions: [
    { q: "Longest river (contested)", a: "Nile or Amazon" },
    { q: "Highest mountain", a: "Everest" },
    { q: "Largest ocean", a: "Pacific" },
    { q: "Largest desert (non-polar)", a: "Sahara" },
    { q: "Capital of Japan", a: "Tokyo" },
    { q: "Continent with most countries", a: "Africa" },
    { q: "Prime Meridian city", a: "Greenwich, London" },
    { q: "Ring of Fire", a: "Pacific basin volcanic belt" },
    { q: "Great Barrier Reef country", a: "Australia" },
    { q: "Smallest country", a: "Vatican City" },
  ],
};

const anatomy: Topic = {
  id: "anatomy",
  title: "Human Anatomy",
  questions: [
    { q: "Largest organ", a: "Skin" },
    { q: "Number of adult bones", a: "206" },
    { q: "Heart chambers", a: "4" },
    { q: "Lung gas exchange", a: "Alveoli" },
    { q: "Kidney function", a: "Filter blood" },
    { q: "Largest artery", a: "Aorta" },
    { q: "Tendons connect", a: "Muscle to bone" },
    { q: "Ligaments connect", a: "Bone to bone" },
    { q: "CNS", a: "Brain & spinal cord" },
    { q: "Hemoglobin role", a: "Carry oxygen" },
  ],
};

const nutrition: Topic = {
  id: "nutrition",
  title: "Nutrition",
  questions: [
    { q: "Macronutrients", a: "Carbs, proteins, fats" },
    { q: "Fiber helps", a: "Digestion & satiety" },
    { q: "Complete protein", a: "All essential amino acids" },
    { q: "Omega-3 sources", a: "Fatty fish, flax, chia" },
    { q: "Vitamin D role", a: "Bone health" },
    { q: "Iron deficiency", a: "Anemia" },
    { q: "Glycemic index", a: "Carb effect on blood sugar" },
    { q: "Electrolytes", a: "Na, K, Mg, etc." },
    { q: "Trans fats", a: "Raise CVD risk" },
    { q: "Micronutrients", a: "Vitamins & minerals" },
  ],
};

/* ===================== ORDER ===================== */

const TOPIC_ORDER: { id: string; title: string }[] = [
  { id: "algebra", title: "Basic Algebra" },
  { id: "geometry", title: "Geometry" },
  { id: "trigonometry", title: "Trigonometry" },
  { id: "calculus", title: "Calculus" },
  { id: "statistics", title: "Statistics" },
  { id: "biology", title: "Biology" },
  { id: "chemistry", title: "Chemistry" },
  { id: "physics", title: "Physics" },
  { id: "astronomy", title: "Astronomy" },
  { id: "economics", title: "Economics" },
  { id: "dinosaurs", title: "Dinosaurs" },
  { id: "history_us", title: "U.S. History" },
  { id: "world_history", title: "World History" },
  { id: "literature", title: "Literature" },
  { id: "computer_science", title: "Computer Science" },
  { id: "geography", title: "Geography" },
  { id: "anatomy", title: "Human Anatomy" },
  { id: "nutrition", title: "Nutrition" },
  { id: "civics", title: "Civics & Government" },
  { id: "earth_science", title: "Earth Science" },
  { id: "grammar", title: "English Grammar" },
  { id: "writing", title: "Writing & Composition" },
  { id: "programming", title: "Programming Fundamentals" },
  { id: "web_dev", title: "Web Development" },
  { id: "data_science", title: "Data Science" },
  { id: "ai_basics", title: "AI & ML Basics" },
  { id: "logic", title: "Logic & Reasoning" },
  { id: "philosophy", title: "Philosophy" },
  { id: "psychology", title: "Psychology" },
  { id: "sociology", title: "Sociology" },
  { id: "art_history", title: "Art History" },
  { id: "music_theory", title: "Music Theory" },
  { id: "finance", title: "Personal Finance" },
  { id: "business", title: "Business & Entrepreneurship" },
  { id: "marketing", title: "Marketing" },
  { id: "project_mgmt", title: "Project Management" },
  { id: "study_skills", title: "Study Skills" },
  { id: "test_prep", title: "Test Prep" },
  { id: "foreign_language", title: "Language Learning" },
  { id: "health_wellness", title: "Health & Wellness" },
];

/* ===================== MERGE & EXPORT ===================== */

const RICH_BY_ID: Record<string, Topic> = {
  algebra,
  geometry,
  trigonometry,
  calculus,
  statistics,
  biology,
  chemistry,
  physics,
  astronomy,
  economics,
  dinosaurs,
  history_us,
  world_history,
  literature,
  computer_science,
  geography,
  anatomy,
  nutrition,
  civics,
  earth_science,
  grammar,
  writing,
  programming,
  web_dev,
  data_science,
  ai_basics,
  logic,
  philosophy,
  psychology,
  sociology,
  art_history,
  music_theory,
  finance,
  business,
  marketing,
  project_mgmt,
  study_skills,
  test_prep,
  foreign_language,
  health_wellness,
};

export const ALL_TOPICS: Topic[] = TOPIC_ORDER.map(({ id, title }) =>
  RICH_BY_ID[id] ? RICH_BY_ID[id] : makeFallbackTopic(id, title),
);
