import { STARTER_POOL, CATEGORY_OF_TOPIC } from "@/lib/trivia/topics";
import { shuffle } from "@/lib/utils";

export interface TriviaRow {
  teamId: string;
  topic: string;
  prompt: string;
  correct_answer: string;
  accepted_variants: string[];
  point_value: number;
}

/**
 * Build a balanced starter bank: each team gets the same number of questions at
 * the same point value (so per-team round totals are equal), preferring
 * questions that match the team's chosen topics/categories.
 */
export function buildStarterBank(opts: {
  teams: { id: string; selectedTopics: string[] }[];
  countPerTeam: number;
  pointValue: number;
}): TriviaRow[] {
  const rows: TriviaRow[] = [];
  for (const team of opts.teams) {
    const selectedCategories = new Set(
      team.selectedTopics.map((t) => CATEGORY_OF_TOPIC[t]).filter(Boolean),
    );
    const preferred = STARTER_POOL.filter(
      (q) => team.selectedTopics.includes(q.topic) || selectedCategories.has(q.category),
    );
    const rest = STARTER_POOL.filter((q) => !preferred.includes(q));
    const picks = [...shuffle(preferred), ...shuffle(rest)].slice(0, opts.countPerTeam);
    for (const q of picks) {
      rows.push({
        teamId: team.id,
        topic: q.topic,
        prompt: q.prompt,
        correct_answer: q.answer,
        accepted_variants: q.variants,
        point_value: opts.pointValue,
      });
    }
  }
  return rows;
}
