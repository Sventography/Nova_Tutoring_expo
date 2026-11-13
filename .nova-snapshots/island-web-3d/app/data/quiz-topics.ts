// app/data/quiz-topics.ts
export type QuizQuestion = {
  prompt: string;
  correct: string;
  options: string[]; // must include `correct`; UI will shuffle
};

export type QuizTopic = {
  id: string;
  title: string;
  questions: QuizQuestion[]; // exactly 20 for your flow
};

export const QUIZ_TOPICS: QuizTopic[] = [
  {
    id: "solar",
    title: "Solar System Basics",
    questions: [
      { prompt: "Which planet is closest to the Sun?", correct: "Mercury", options: ["Mercury", "Venus", "Earth", "Mars"] },
      { prompt: "What is the largest planet in our solar system?", correct: "Jupiter", options: ["Jupiter", "Saturn", "Neptune", "Earth"] },
      { prompt: "Which planet is famous for its prominent rings?", correct: "Saturn", options: ["Saturn", "Jupiter", "Uranus", "Neptune"] },
      { prompt: "Which planet is known as the Red Planet?", correct: "Mars", options: ["Mars", "Venus", "Mercury", "Jupiter"] },
      { prompt: "Which dwarf planet orbits in the asteroid belt?", correct: "Ceres", options: ["Ceres", "Pluto", "Eris", "Haumea"] },
      { prompt: "The Great Red Spot is a storm on which planet?", correct: "Jupiter", options: ["Jupiter", "Mars", "Saturn", "Neptune"] },
      { prompt: "Which planet has a day longer than its year?", correct: "Venus", options: ["Venus", "Mercury", "Mars", "Neptune"] },
      { prompt: "Which planet has the highest average surface temperature?", correct: "Venus", options: ["Venus", "Mercury", "Earth", "Mars"] },
      { prompt: "Which planet has an extreme axial tilt (on its side)?", correct: "Uranus", options: ["Uranus", "Neptune", "Saturn", "Jupiter"] },
      { prompt: "Olympus Mons, the tallest volcano, is on which planet?", correct: "Mars", options: ["Mars", "Venus", "Mercury", "Earth"] },
      { prompt: "Earth takes how long to orbit the Sun once?", correct: "1 year", options: ["1 year", "1 month", "1 day", "10 years"] },
      { prompt: "What primarily causes Earth's seasons?", correct: "Tilt of Earth's axis", options: ["Tilt of Earth's axis", "Distance from Sun", "Ocean tides", "Moon's phases"] },
      { prompt: "The region beyond Neptune with many icy bodies is called the…", correct: "Kuiper Belt", options: ["Kuiper Belt", "Asteroid Belt", "Oort Cloud", "Van Allen belts"] },
      { prompt: "Nearest star to Earth after the Sun?", correct: "Proxima Centauri", options: ["Proxima Centauri", "Alpha Centauri A", "Sirius", "Betelgeuse"] },
      { prompt: "The Sun is best described as a…", correct: "G-type main-sequence star", options: ["G-type main-sequence star", "Red giant", "White dwarf", "Neutron star"] },
      { prompt: "Which planet has the fastest rotation period?", correct: "Jupiter", options: ["Jupiter", "Saturn", "Earth", "Mars"] },
      { prompt: "Light from the Sun reaches Earth in about…", correct: "8 minutes", options: ["8 minutes", "1 minute", "30 minutes", "1 hour"] },
      { prompt: "Comets are primarily composed of…", correct: "Ice and dust", options: ["Ice and dust", "Solid rock", "Liquid water", "Metal"] },
      { prompt: "The asteroid belt lies between which two planets?", correct: "Mars and Jupiter", options: ["Mars and Jupiter", "Earth and Mars", "Jupiter and Saturn", "Venus and Earth"] },
      { prompt: "Which planet appears deep blue due to methane?", correct: "Neptune", options: ["Neptune", "Uranus", "Earth", "Venus"] },
    ],
  },
  {
    id: "uscap1",
    title: "US State Capitals I",
    questions: [
      { prompt: "Capital of California?", correct: "Sacramento", options: ["Sacramento", "Los Angeles", "San Diego", "San Jose"] },
      { prompt: "Capital of Texas?", correct: "Austin", options: ["Austin", "Houston", "Dallas", "San Antonio"] },
      { prompt: "Capital of New York (state)?", correct: "Albany", options: ["Albany", "New York City", "Buffalo", "Rochester"] },
      { prompt: "Capital of Florida?", correct: "Tallahassee", options: ["Tallahassee", "Miami", "Orlando", "Tampa"] },
      { prompt: "Capital of Illinois?", correct: "Springfield", options: ["Springfield", "Chicago", "Peoria", "Naperville"] },
      { prompt: "Capital of Pennsylvania?", correct: "Harrisburg", options: ["Harrisburg", "Philadelphia", "Pittsburgh", "Allentown"] },
      { prompt: "Capital of Ohio?", correct: "Columbus", options: ["Columbus", "Cleveland", "Cincinnati", "Toledo"] },
      { prompt: "Capital of Georgia (state)?", correct: "Atlanta", options: ["Atlanta", "Savannah", "Macon", "Augusta"] },
      { prompt: "Capital of Michigan?", correct: "Lansing", options: ["Lansing", "Detroit", "Grand Rapids", "Flint"] },
      { prompt: "Capital of Massachusetts?", correct: "Boston", options: ["Boston", "Worcester", "Springfield", "Cambridge"] },
      { prompt: "Capital of Washington (state)?", correct: "Olympia", options: ["Olympia", "Seattle", "Spokane", "Tacoma"] },
      { prompt: "Capital of Oregon?", correct: "Salem", options: ["Salem", "Portland", "Eugene", "Bend"] },
      { prompt: "Capital of Arizona?", correct: "Phoenix", options: ["Phoenix", "Tucson", "Mesa", "Chandler"] },
      { prompt: "Capital of Colorado?", correct: "Denver", options: ["Denver", "Boulder", "Colorado Springs", "Aurora"] },
      { prompt: "Capital of Minnesota?", correct: "Saint Paul", options: ["Saint Paul", "Minneapolis", "Duluth", "Rochester"] },
      { prompt: "Capital of Missouri?", correct: "Jefferson City", options: ["Jefferson City", "Kansas City", "St. Louis", "Springfield"] },
      { prompt: "Capital of North Carolina?", correct: "Raleigh", options: ["Raleigh", "Charlotte", "Greensboro", "Durham"] },
      { prompt: "Capital of Virginia?", correct: "Richmond", options: ["Richmond", "Virginia Beach", "Norfolk", "Alexandria"] },
      { prompt: "Capital of Wisconsin?", correct: "Madison", options: ["Madison", "Milwaukee", "Green Bay", "Kenosha"] },
      { prompt: "Capital of New Jersey?", correct: "Trenton", options: ["Trenton", "Newark", "Jersey City", "Paterson"] },
    ],
  },
];

