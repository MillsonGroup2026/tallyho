// Topic catalog (5 categories x 15 topics) captains choose from, plus a
// balanced starter question pool used when no Anthropic key is present.
// Phase 2 / "true bank": the AI trivia generator produces topic-tailored
// questions and replaces the starter pool (see generateTriviaBank).

export interface TopicCategory {
  category: string;
  topics: string[];
}

export const TOPIC_CATALOG: TopicCategory[] = [
  {
    category: "Sports",
    topics: ["Baseball", "Basketball", "NFL Football", "Soccer", "Tennis", "Golf", "Hockey", "Olympics", "Boxing", "Formula 1", "Cycling", "Swimming", "Track & Field", "College Sports", "Extreme Sports"],
  },
  {
    category: "Geography",
    topics: ["World Capitals", "US States", "Rivers & Lakes", "Mountains", "Oceans & Seas", "Deserts", "European Geography", "Asian Geography", "African Geography", "Flags", "Landmarks", "Islands", "Volcanoes", "Borders", "Map Trivia"],
  },
  {
    category: "Literature",
    topics: ["Shakespeare", "Classic Novels", "20th Century Fiction", "Poetry", "Children's Books", "Fantasy", "Sci-Fi", "Mystery & Crime", "Harry Potter", "Greek Mythology", "Famous Authors", "Banned Books", "Pulitzer Winners", "Modern Bestsellers", "First Lines"],
  },
  {
    category: "Entertainment",
    topics: ["Disney", "90s Movies", "Marvel", "Star Wars", "Sitcoms", "Pop Music", "Classic Rock", "Broadway", "Reality TV", "Video Games", "The Oscars", "Animated Films", "Horror Movies", "Streaming Shows", "Boy Bands"],
  },
  {
    category: "Science & Nature",
    topics: ["Space", "The Human Body", "Animals", "Chemistry", "Physics", "Geology", "Weather", "Dinosaurs", "Plants", "Inventions", "The Ocean", "Genetics", "Astronomy", "The Periodic Table", "Ecology"],
  },
];

export interface StarterQuestion {
  category: string;
  topic: string;
  prompt: string;
  answer: string;
  variants: string[];
}

// General-knowledge pool, each tagged to a catalog topic so the live game can
// label it. Balanced selection happens in generateTriviaBank.
export const STARTER_POOL: StarterQuestion[] = [
  // Sports
  { category: "Sports", topic: "Baseball", prompt: "How many strikes make an out in baseball?", answer: "3", variants: ["three"] },
  { category: "Sports", topic: "NFL Football", prompt: "How many points is a touchdown worth, before the extra point?", answer: "6", variants: ["six"] },
  { category: "Sports", topic: "Basketball", prompt: "How many players from one team are on the court in basketball?", answer: "5", variants: ["five"] },
  { category: "Sports", topic: "Soccer", prompt: "How many players are on the field per soccer team?", answer: "11", variants: ["eleven"] },
  { category: "Sports", topic: "Golf", prompt: "What's the term for one stroke under par?", answer: "Birdie", variants: [] },
  { category: "Sports", topic: "Tennis", prompt: "What surface is Wimbledon played on?", answer: "Grass", variants: [] },
  { category: "Sports", topic: "Olympics", prompt: "How many years apart are the Summer Olympics held?", answer: "4", variants: ["four", "every four years"] },
  // Geography
  { category: "Geography", topic: "World Capitals", prompt: "What is the capital of Japan?", answer: "Tokyo", variants: [] },
  { category: "Geography", topic: "World Capitals", prompt: "What is the capital of Australia?", answer: "Canberra", variants: [] },
  { category: "Geography", topic: "US States", prompt: "Which US state is nicknamed the Sunshine State?", answer: "Florida", variants: [] },
  { category: "Geography", topic: "Rivers & Lakes", prompt: "Which river flows through Egypt?", answer: "Nile", variants: ["the nile"] },
  { category: "Geography", topic: "Mountains", prompt: "What is the tallest mountain on Earth?", answer: "Mount Everest", variants: ["everest"] },
  { category: "Geography", topic: "Oceans & Seas", prompt: "What is the largest ocean on Earth?", answer: "Pacific", variants: ["pacific ocean"] },
  { category: "Geography", topic: "Landmarks", prompt: "In which city is the Eiffel Tower?", answer: "Paris", variants: [] },
  // Literature
  { category: "Literature", topic: "Shakespeare", prompt: "Who wrote Romeo and Juliet?", answer: "Shakespeare", variants: ["william shakespeare"] },
  { category: "Literature", topic: "Harry Potter", prompt: "Which Hogwarts house is Harry Potter sorted into?", answer: "Gryffindor", variants: [] },
  { category: "Literature", topic: "Classic Novels", prompt: "Who wrote Pride and Prejudice?", answer: "Jane Austen", variants: ["austen"] },
  { category: "Literature", topic: "Greek Mythology", prompt: "Who is the Greek god of the sea?", answer: "Poseidon", variants: [] },
  { category: "Literature", topic: "Fantasy", prompt: "Who wrote The Lord of the Rings?", answer: "Tolkien", variants: ["jrr tolkien", "j.r.r. tolkien"] },
  { category: "Literature", topic: "Sci-Fi", prompt: "Which dystopian novel features Big Brother?", answer: "1984", variants: ["nineteen eighty-four"] },
  // Entertainment
  { category: "Entertainment", topic: "Disney", prompt: "In Frozen, what is the name of Elsa's younger sister?", answer: "Anna", variants: ["princess anna"] },
  { category: "Entertainment", topic: "90s Movies", prompt: "In the 1997 blockbuster, what was the name of the ship that sank?", answer: "Titanic", variants: ["rms titanic"] },
  { category: "Entertainment", topic: "Marvel", prompt: "What metal coats Wolverine's skeleton?", answer: "Adamantium", variants: [] },
  { category: "Entertainment", topic: "Star Wars", prompt: "Who is Luke Skywalker's father?", answer: "Darth Vader", variants: ["vader", "anakin", "anakin skywalker"] },
  { category: "Entertainment", topic: "Classic Rock", prompt: "Which band recorded 'Stairway to Heaven'?", answer: "Led Zeppelin", variants: ["zeppelin"] },
  { category: "Entertainment", topic: "Video Games", prompt: "Which company created Mario?", answer: "Nintendo", variants: [] },
  { category: "Entertainment", topic: "Pop Music", prompt: "Which artist released 'Bad Guy' in 2019?", answer: "Billie Eilish", variants: ["eilish"] },
  // Science & Nature
  { category: "Science & Nature", topic: "Space", prompt: "Which planet is known as the Red Planet?", answer: "Mars", variants: [] },
  { category: "Science & Nature", topic: "The Human Body", prompt: "How many bones are in the adult human body?", answer: "206", variants: ["two hundred six"] },
  { category: "Science & Nature", topic: "Animals", prompt: "What is the largest land animal on Earth?", answer: "Elephant", variants: ["african elephant"] },
  { category: "Science & Nature", topic: "Chemistry", prompt: "What is the chemical symbol for gold?", answer: "Au", variants: [] },
  { category: "Science & Nature", topic: "Physics", prompt: "What force pulls objects toward the Earth?", answer: "Gravity", variants: [] },
  { category: "Science & Nature", topic: "The Ocean", prompt: "What is the largest animal that has ever lived?", answer: "Blue Whale", variants: ["blue whale", "whale"] },
  { category: "Science & Nature", topic: "Dinosaurs", prompt: "Complete the dinosaur name: Tyrannosaurus ___", answer: "Rex", variants: ["tyrannosaurus rex"] },
];

export const CATEGORY_OF_TOPIC: Record<string, string> = Object.fromEntries(
  TOPIC_CATALOG.flatMap((c) => c.topics.map((t) => [t, c.category])),
);
