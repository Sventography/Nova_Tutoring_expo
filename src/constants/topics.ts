export type Flashcard = { front: string; back: string };
export type QuizQ = {
  question: string;
  choices: string[];
  answerIndex: number;
};

export type Topic = {
  id: string;
  title: string;
  flashcards: Flashcard[];
  quiz: QuizQ[];
};

export const TOPICS: Topic[] = [
  {
    id: "algebra",
    title: "Basic Algebra",
    flashcards: [
      { front: "Solve: 2x + 3 = 11", back: "x = 4" },
      { front: "Solve: 3(x − 2) = 12", back: "x = 6" },
      { front: "Simplify: 2x + 5x", back: "7x" },
      { front: "Solve: x/5 = 3", back: "x = 15" },
      { front: "Distribute: 4(2x + 3)", back: "8x + 12" },
      { front: "Solve: 7 − x = 2", back: "x = 5" },
      { front: "Combine: 6x − 2x", back: "4x" },
      { front: "Solve: 5x = 45", back: "x = 9" },
      { front: "Evaluate: 2x when x=7", back: "14" },
      { front: "Solve: x + 8 = 3", back: "x = −5" },
      { front: "Factor: x² − 9", back: "(x − 3)(x + 3)" },
      { front: "Expand: (x + 2)(x + 3)", back: "x² + 5x + 6" },
      { front: "Slope of y = 3x + 1", back: "3" },
      { front: "y-intercept of y = −2x + 5", back: "5" },
      { front: "Solve: 2x − 7 = 1", back: "x = 4" },
      { front: "Solve: 4x + 6 = 2", back: "x = −1" },
      { front: "Simplify: (3x + 4) − (x − 2)", back: "2x + 6" },
      { front: "Solve: (x/3) + 2 = 5", back: "x = 9" },
      { front: "Zero of y = x − 9", back: "x = 9" },
      { front: "Vertex form keyword", back: "y = a(x − h)² + k" },
    ],
    quiz: [
      {
        question: "Solve: 2x + 3 = 11",
        choices: ["x=3", "x=4", "x=5", "x=8"],
        answerIndex: 1,
      },
      {
        question: "Solve: 3(x − 2) = 12",
        choices: ["x=6", "x=4", "x=2", "x=8"],
        answerIndex: 0,
      },
      {
        question: "Simplify: 2x + 5x",
        choices: ["5x", "7x", "9x", "x²"],
        answerIndex: 1,
      },
      {
        question: "Solve: x/5 = 3",
        choices: ["x=8", "x=10", "x=15", "x=20"],
        answerIndex: 2,
      },
      {
        question: "Distribute: 4(2x + 3)",
        choices: ["8x+3", "8x+12", "6x+12", "2x+12"],
        answerIndex: 1,
      },
      {
        question: "Solve: 7 − x = 2",
        choices: ["x=9", "x=5", "x=−5", "x=3"],
        answerIndex: 1,
      },
      {
        question: "6x − 2x =",
        choices: ["2x", "8x", "4x", "x"],
        answerIndex: 2,
      },
      {
        question: "5x = 45 ⇒ x =",
        choices: ["7", "8", "9", "10"],
        answerIndex: 2,
      },
      {
        question: "2x when x=7",
        choices: ["9", "12", "14", "21"],
        answerIndex: 2,
      },
      {
        question: "x + 8 = 3 ⇒ x =",
        choices: ["5", "−5", "−11", "11"],
        answerIndex: 1,
      },
      {
        question: "Factor: x² − 9",
        choices: ["(x−9)(x+1)", "(x−3)(x+3)", "(x−1)(x+9)", "(x−3)²"],
        answerIndex: 1,
      },
      {
        question: "Expand: (x + 2)(x + 3)",
        choices: ["x²+6", "x²+2x+3", "x²+5x+6", "x²+3x+2"],
        answerIndex: 2,
      },
      {
        question: "Slope of y = 3x + 1",
        choices: ["1", "3", "−3", "0"],
        answerIndex: 1,
      },
      {
        question: "Intercept of y = −2x + 5",
        choices: ["x=5", "y=−2", "y=5", "x=−2"],
        answerIndex: 2,
      },
      {
        question: "2x − 7 = 1 ⇒ x =",
        choices: ["2", "3", "4", "−4"],
        answerIndex: 2,
      },
      {
        question: "4x + 6 = 2 ⇒ x =",
        choices: ["−1", "1", "2", "−2"],
        answerIndex: 0,
      },
      {
        question: "(3x + 4) − (x − 2) =",
        choices: ["2x+6", "2x−6", "4x+2", "2x+2"],
        answerIndex: 0,
      },
      {
        question: "(x/3)+2=5 ⇒ x =",
        choices: ["6", "7", "8", "9"],
        answerIndex: 3,
      },
      {
        question: "Zero of y = x − 9",
        choices: ["x=0", "x=9", "x=−9", "x=1"],
        answerIndex: 1,
      },
      {
        question: "Vertex form:",
        choices: ["y=mx+b", "ax²+bx+c", "y=a(x−h)²+k", "y=k/x"],
        answerIndex: 2,
      },
    ],
  },
  {
    id: "astronomy",
    title: "Astronomy",
    flashcards: [
      { front: "Closest star to Earth", back: "The Sun" },
      { front: "Galaxy we live in", back: "Milky Way" },
      { front: "Black hole boundary name", back: "Event horizon" },
      { front: "Planet with the Great Red Spot", back: "Jupiter" },
      { front: "Hottest planet (average)", back: "Venus" },
      { front: "Order: Mercury, Venus, ___", back: "Earth" },
      { front: "Light-year measures", back: "Distance" },
      { front: "Nearest galaxy (major) to Milky Way", back: "Andromeda" },
      { front: "Star birth clouds", back: "Nebulae" },
      { front: "Moon causes ocean ____", back: "Tides" },
      { front: "Sun’s primary fusion fuel", back: "Hydrogen" },
      { front: "Dwarf planet in Kuiper Belt", back: "Pluto" },
      { front: "Mars nickname", back: "The Red Planet" },
      { front: "Rings most prominent on", back: "Saturn" },
      { front: "Our star type", back: "G-type main-sequence (G2V)" },
      { front: "Auroras are caused by", back: "Solar wind & magnetosphere" },
      { front: "Exoplanet means", back: "Planet outside our solar system" },
      { front: "Galaxy shape of Milky Way", back: "Barred spiral" },
      {
        front: "Telescope that sees infrared (famously JWST)",
        back: "Space infrared telescope",
      },
      { front: "Big Bang suggests the universe is", back: "Expanding" },
    ],
    quiz: [
      {
        question: "Closest star to Earth",
        choices: ["Sirius", "Alpha Centauri", "The Sun", "Betelgeuse"],
        answerIndex: 2,
      },
      {
        question: "Galaxy we live in",
        choices: ["Andromeda", "Triangulum", "Whirlpool", "Milky Way"],
        answerIndex: 3,
      },
      {
        question: "Black hole boundary",
        choices: [
          "Photon ring",
          "Event horizon",
          "Accretion disk",
          "Singularity",
        ],
        answerIndex: 1,
      },
      {
        question: "Great Red Spot planet",
        choices: ["Jupiter", "Saturn", "Neptune", "Mars"],
        answerIndex: 0,
      },
      {
        question: "Hottest average planet",
        choices: ["Mercury", "Venus", "Mars", "Earth"],
        answerIndex: 1,
      },
      {
        question: "Order after Venus",
        choices: ["Mars", "Earth", "Jupiter", "Mercury"],
        answerIndex: 1,
      },
      {
        question: "A light-year measures",
        choices: ["Time", "Brightness", "Distance", "Mass"],
        answerIndex: 2,
      },
      {
        question: "Nearest major galaxy",
        choices: [
          "Andromeda",
          "Whirlpool",
          "Sombrero",
          "Large Magellanic Cloud",
        ],
        answerIndex: 0,
      },
      {
        question: "Stars form in",
        choices: ["Asteroids", "Nebulae", "Comets", "Meteor belts"],
        answerIndex: 1,
      },
      {
        question: "The Moon influences",
        choices: ["Volcanoes", "Tides", "Earth’s tilt", "Seasons"],
        answerIndex: 1,
      },
      {
        question: "Sun fuses primarily",
        choices: ["Helium", "Hydrogen", "Carbon", "Oxygen"],
        answerIndex: 1,
      },
      {
        question: "Dwarf planet in Kuiper Belt",
        choices: ["Ceres", "Eris", "Pluto", "Haumea"],
        answerIndex: 2,
      },
      {
        question: "Mars is known as",
        choices: ["Blue planet", "Red planet", "Green planet", "Ringed planet"],
        answerIndex: 1,
      },
      {
        question: "Most prominent rings",
        choices: ["Jupiter", "Uranus", "Neptune", "Saturn"],
        answerIndex: 3,
      },
      {
        question: "Sun’s spectral type",
        choices: ["M", "G", "K", "F"],
        answerIndex: 1,
      },
      {
        question: "Auroras result from",
        choices: [
          "Moonlight",
          "Solar wind + magnetosphere",
          "Volcanoes",
          "Cosmic rays only",
        ],
        answerIndex: 1,
      },
      {
        question: "Exoplanet means",
        choices: [
          "Rogue planet",
          "Outside our solar system",
          "Binary star",
          "Dwarf star",
        ],
        answerIndex: 1,
      },
      {
        question: "Milky Way shape",
        choices: ["Elliptical", "Irregular", "Barred spiral", "Ring"],
        answerIndex: 2,
      },
      {
        question: "JWST mainly observes",
        choices: ["Gamma rays", "X-rays", "Infrared", "Radio"],
        answerIndex: 2,
      },
      {
        question: "Big Bang implies universe is",
        choices: ["Static", "Contracting", "Expanding", "Rotating"],
        answerIndex: 2,
      },
    ],
  },
  {
    id: "biology",
    title: "Human Biology",
    flashcards: [
      { front: "Basic unit of life", back: "Cell" },
      { front: "Organelle for energy", back: "Mitochondrion" },
      { front: "Blood oxygen carrier", back: "Hemoglobin" },
      { front: "Largest organ", back: "Skin" },
      { front: "Brain–body network", back: "Nervous system" },
      { front: "DNA shape", back: "Double helix" },
      { front: "Cell division for growth", back: "Mitosis" },
      { front: "Gas inhaled most", back: "Nitrogen (≈78%)" },
      { front: "Where gas exchange occurs in lungs", back: "Alveoli" },
      { front: "Filters blood to make urine", back: "Kidneys" },
      { front: "Blood sugar hormone lowers glucose", back: "Insulin" },
      { front: "Protein builders", back: "Ribosomes" },
      { front: "Heart chambers", back: "4" },
      { front: "Immune memory cells", back: "B cells" },
      { front: "Muscle that pumps blood", back: "Cardiac muscle" },
      { front: "Genetic code carrier", back: "DNA" },
      { front: "Digestive enzyme in saliva", back: "Amylase" },
      { front: "Oxygen binds to which cell type", back: "Red blood cells" },
      { front: "Bone–muscle connector", back: "Tendon" },
      { front: "Organ for detox & bile", back: "Liver" },
    ],
    quiz: [
      {
        question: "Basic unit of life",
        choices: ["Atom", "Cell", "Tissue", "Organ"],
        answerIndex: 1,
      },
      {
        question: "Powerhouse organelle",
        choices: ["Nucleus", "Ribosome", "Mitochondrion", "Golgi"],
        answerIndex: 2,
      },
      {
        question: "O₂ carried by",
        choices: ["Platelets", "Hemoglobin", "Plasma", "Lymph"],
        answerIndex: 1,
      },
      {
        question: "Largest organ",
        choices: ["Liver", "Lungs", "Skin", "Brain"],
        answerIndex: 2,
      },
      {
        question: "Nervous system function",
        choices: [
          "Circulation",
          "Communication & control",
          "Digestion",
          "Excretion",
        ],
        answerIndex: 1,
      },
      {
        question: "DNA shape",
        choices: ["Single helix", "Double helix", "Beta sheet", "Alpha helix"],
        answerIndex: 1,
      },
      {
        question: "Mitosis is for",
        choices: [
          "Gametes",
          "Growth/repair",
          "Fermentation",
          "Immune response",
        ],
        answerIndex: 1,
      },
      {
        question: "Air is mostly",
        choices: ["O₂", "CO₂", "N₂", "Ar"],
        answerIndex: 2,
      },
      {
        question: "Gas exchange site",
        choices: ["Trachea", "Bronchi", "Alveoli", "Diaphragm"],
        answerIndex: 2,
      },
      {
        question: "Urine is formed by",
        choices: ["Liver", "Kidneys", "Spleen", "Pancreas"],
        answerIndex: 1,
      },
      {
        question: "Insulin lowers",
        choices: ["Blood pressure", "Heart rate", "Blood glucose", "Body temp"],
        answerIndex: 2,
      },
      {
        question: "Protein synthesis site",
        choices: ["Lysosome", "Ribosome", "Centriole", "Vacuole"],
        answerIndex: 1,
      },
      {
        question: "Heart chambers",
        choices: ["2", "3", "4", "5"],
        answerIndex: 2,
      },
      {
        question: "Immune memory cells",
        choices: ["RBCs", "Neurons", "B cells", "Keratinocytes"],
        answerIndex: 2,
      },
      {
        question: "Heart muscle type",
        choices: ["Smooth", "Skeletal", "Cardiac", "Connective"],
        answerIndex: 2,
      },
      {
        question: "Genetic material",
        choices: ["RNA only", "DNA", "Proteins", "Lipids"],
        answerIndex: 1,
      },
      {
        question: "Salivary enzyme",
        choices: ["Lipase", "Pepsin", "Amylase", "Trypsin"],
        answerIndex: 2,
      },
      {
        question: "Oxygen binds to",
        choices: ["WBCs", "RBCs", "Platelets", "Plasma"],
        answerIndex: 1,
      },
      {
        question: "Connects muscle to bone",
        choices: ["Ligament", "Cartilage", "Tendon", "Fascia"],
        answerIndex: 2,
      },
      {
        question: "Bile is produced by",
        choices: ["Gallbladder", "Liver", "Pancreas", "Stomach"],
        answerIndex: 1,
      },
    ],
  },
  {
    id: "geography",
    title: "World Geography",
    flashcards: [
      { front: "Capital of Japan", back: "Tokyo" },
      { front: "Largest ocean", back: "Pacific Ocean" },
      { front: "River through Egypt", back: "Nile" },
      { front: "Mount Everest is in", back: "Himalayas" },
      { front: "Capital of Canada", back: "Ottawa" },
      { front: "Continent of Brazil", back: "South America" },
      { front: "Sahara is a", back: "Desert" },
      { front: "Capital of Australia", back: "Canberra" },
      { front: "Country with cities Mumbai & Delhi", back: "India" },
      { front: "Capital of France", back: "Paris" },
      { front: "Iceland’s capital", back: "Reykjavík" },
      { front: "Landlocked African country: Niger or Nigeria?", back: "Niger" },
      { front: "Amazon is a", back: "River (and rainforest)" },
      { front: "Spain’s capital", back: "Madrid" },
      { front: "U.S. state with Honolulu", back: "Hawaiʻi" },
      { front: "Largest country by area", back: "Russia" },
      { front: "Great Barrier Reef is near", back: "Australia" },
      { front: "Capital of Kenya", back: "Nairobi" },
      { front: "Capital of Egypt", back: "Cairo" },
      {
        front: "South Africa has how many capitals?",
        back: "3 (Pretoria, Cape Town, Bloemfontein)",
      },
    ],
    quiz: [
      {
        question: "Capital of Japan",
        choices: ["Osaka", "Kyoto", "Tokyo", "Nagoya"],
        answerIndex: 2,
      },
      {
        question: "Largest ocean",
        choices: ["Atlantic", "Indian", "Arctic", "Pacific"],
        answerIndex: 3,
      },
      {
        question: "River through Egypt",
        choices: ["Amazon", "Yangtze", "Nile", "Danube"],
        answerIndex: 2,
      },
      {
        question: "Mount Everest range",
        choices: ["Andes", "Alps", "Himalayas", "Rockies"],
        answerIndex: 2,
      },
      {
        question: "Capital of Canada",
        choices: ["Toronto", "Ottawa", "Vancouver", "Montreal"],
        answerIndex: 1,
      },
      {
        question: "Brazil is in",
        choices: ["Europe", "Africa", "South America", "Asia"],
        answerIndex: 2,
      },
      {
        question: "Sahara is a",
        choices: ["Forest", "Desert", "Plateau", "Delta"],
        answerIndex: 1,
      },
      {
        question: "Capital of Australia",
        choices: ["Sydney", "Melbourne", "Brisbane", "Canberra"],
        answerIndex: 3,
      },
      {
        question: "Mumbai & Delhi are in",
        choices: ["Pakistan", "India", "Bangladesh", "Nepal"],
        answerIndex: 1,
      },
      {
        question: "Capital of France",
        choices: ["Lyon", "Paris", "Nice", "Bordeaux"],
        answerIndex: 1,
      },
      {
        question: "Iceland’s capital",
        choices: ["Oslo", "Helsinki", "Reykjavík", "Copenhagen"],
        answerIndex: 2,
      },
      {
        question: "Landlocked: Niger or Nigeria?",
        choices: ["Nigeria", "Niger", "Both", "Neither"],
        answerIndex: 1,
      },
      {
        question: "Amazon is a",
        choices: ["Desert", "Sea", "River", "Mountain"],
        answerIndex: 2,
      },
      {
        question: "Capital of Spain",
        choices: ["Barcelona", "Seville", "Madrid", "Valencia"],
        answerIndex: 2,
      },
      {
        question: "Honolulu is in",
        choices: ["California", "Alaska", "Hawaiʻi", "Florida"],
        answerIndex: 2,
      },
      {
        question: "Largest country by area",
        choices: ["China", "Canada", "USA", "Russia"],
        answerIndex: 3,
      },
      {
        question: "Great Barrier Reef is near",
        choices: ["Mexico", "Australia", "Indonesia", "Philippines"],
        answerIndex: 1,
      },
      {
        question: "Capital of Kenya",
        choices: ["Nairobi", "Mombasa", "Kisumu", "Eldoret"],
        answerIndex: 0,
      },
      {
        question: "Capital of Egypt",
        choices: ["Giza", "Cairo", "Alexandria", "Luxor"],
        answerIndex: 1,
      },
      {
        question: "South Africa capitals",
        choices: ["1", "2", "3", "4"],
        answerIndex: 2,
      },
    ],
  },
];
