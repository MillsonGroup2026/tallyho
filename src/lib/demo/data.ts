// ============================================================================
// Deterministic demo data — no AI key required.
//
// Powers "Spin up a demo group": a fully filled-out group so the live game can
// be played instantly. Distributions are crafted to have clear consensus
// (every usable question's top bucket holds well over a third of the votes).
//
// Holdout questions (one per member) have `dist` summing to N-1 (8); buffer
// questions (answered by everyone) sum to N (9).
// ============================================================================

import type { FeudQuestionType, GroupCategory } from "@/lib/types";

export const DEMO_GROUP = {
  name: "Mile High",
  category: "friends" as GroupCategory,
  dynamicNote: "Denver crew — mostly skiers, and nobody lets Dave forget the cabin trip.",
};

export const DEMO_TEAMS = [
  { name: "Powder Hounds", index: 0, members: ["Noah", "Dave", "Mia", "Priya", "Lily"], captain: "Noah" },
  { name: "Summit Squad", index: 1, members: ["Nick", "Sarah", "Jordan", "Marcus"], captain: "Sarah" },
];

export interface DemoFeudQuestion {
  prompt: string;
  type: FeudQuestionType;
  options?: string[];
  holdout: string | null; // the member who PLAYS it live (null = buffer, everyone answered)
  dist: [string, number][]; // answer -> count
}

export const DEMO_FEUD: DemoFeudQuestion[] = [
  { prompt: "Who in the group is most likely to get engaged first?", type: "pick_person", holdout: "Noah",
    dist: [["Sarah", 5], ["Mia", 2], ["Jordan", 1]] },
  { prompt: "Who would survive longest stranded in the mountains?", type: "pick_person", holdout: "Nick",
    dist: [["Dave", 4], ["Marcus", 3], ["Noah", 1]] },
  { prompt: "Who's most likely to show up late to everything?", type: "pick_person", holdout: "Dave",
    dist: [["Nick", 5], ["Jordan", 2], ["Lily", 1]] },
  { prompt: "Who's the secret reality-TV addict?", type: "pick_person", holdout: "Sarah",
    dist: [["Priya", 4], ["Mia", 3], ["Lily", 1]] },
  { prompt: "Who would win a hot-dog eating contest?", type: "pick_person", holdout: "Mia",
    dist: [["Marcus", 6], ["Dave", 2]] },
  { prompt: "Who's most likely to start a podcast nobody asked for?", type: "pick_person", holdout: "Jordan",
    dist: [["Noah", 5], ["Priya", 2], ["Nick", 1]] },
  { prompt: "Who texts back the slowest?", type: "pick_person", holdout: "Priya",
    dist: [["Dave", 4], ["Jordan", 3], ["Marcus", 1]] },
  { prompt: "Who's most likely to cry at a movie?", type: "pick_person", holdout: "Marcus",
    dist: [["Lily", 5], ["Sarah", 2], ["Mia", 1]] },
  { prompt: "Who would accidentally join a cult?", type: "pick_person", holdout: "Lily",
    dist: [["Jordan", 4], ["Nick", 3], ["Noah", 1]] },

  // buffers (answered by all 9 — overshoot spares + variety of types)
  { prompt: "How does Dave react when he's proven wrong?", type: "multiple_choice", holdout: null,
    options: ["Doubles down", "Changes the subject", "Admits it instantly", "Blames the cabin"],
    dist: [["Doubles down", 6], ["Changes the subject", 2], ["Blames the cabin", 1]] },
  { prompt: "How likely is Nick to be late?", type: "likelihood", holdout: null,
    options: ["Never", "Sometimes", "Usually", "Always"],
    dist: [["Always", 5], ["Usually", 3], ["Sometimes", 1]] },
  { prompt: "First word that comes to mind: 'cabin trip'?", type: "open_text", holdout: null,
    dist: [["Chaos", 4], ["Dave", 3], ["Snow", 2]] },
];

export interface DemoTriviaQuestion {
  category: string;
  topic: string;
  prompt: string;
  answer: string;
  variants: string[];
}

// One question per chosen topic (5 topics per team = 5 trivia per round).
export const DEMO_TRIVIA_BY_TEAM: { team: number; questions: DemoTriviaQuestion[] }[] = [
  {
    team: 0,
    questions: [
      { category: "Sports", topic: "Baseball", prompt: "How many strikes make an out in baseball?", answer: "3", variants: ["three"] },
      { category: "Entertainment", topic: "Disney", prompt: "In Frozen, what is the name of Elsa's younger sister?", answer: "Anna", variants: ["princess anna"] },
      { category: "Geography", topic: "World Capitals", prompt: "What is the capital of Japan?", answer: "Tokyo", variants: [] },
      { category: "Science & Nature", topic: "Space", prompt: "Which planet is known as the Red Planet?", answer: "Mars", variants: [] },
      { category: "Entertainment", topic: "90s Movies", prompt: "In the 1997 blockbuster, what was the name of the ship that sank?", answer: "Titanic", variants: ["rms titanic"] },
    ],
  },
  {
    team: 1,
    questions: [
      { category: "Sports", topic: "NFL Football", prompt: "How many points is a touchdown worth, before the extra point?", answer: "6", variants: ["six"] },
      { category: "Literature", topic: "Harry Potter", prompt: "Which Hogwarts house is Harry Potter sorted into?", answer: "Gryffindor", variants: [] },
      { category: "Geography", topic: "US States", prompt: "Which US state is nicknamed the Sunshine State?", answer: "Florida", variants: [] },
      { category: "Science & Nature", topic: "Animals", prompt: "What is the largest land animal on Earth?", answer: "Elephant", variants: ["african elephant", "african bush elephant"] },
      { category: "Entertainment", topic: "Classic Rock", prompt: "Which band recorded the song 'Stairway to Heaven'?", answer: "Led Zeppelin", variants: ["zeppelin"] },
    ],
  },
];
