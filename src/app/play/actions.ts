"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tallyBuckets, scoreFeudGuess } from "@/lib/feud";
import { fuzzyMatch } from "@/lib/match";
import type { Member, Team, VoteBucket } from "@/lib/types";

const DEFAULT_SETTINGS = { feudSeconds: 25, triviaSeconds: 210 };

export interface GameTurn {
  round: number;
  teamId: string;
  teamName: string;
  memberId: string;
  memberName: string;
  feudQuestionId: string;
}

export interface FeudResult {
  buckets: VoteBucket[];
  matched: string | null;
  points: number;
}

export interface TriviaResult {
  correct: boolean;
  points: number;
  correctAnswer: string;
}

async function addPoints(
  supabase: SupabaseClient,
  gameId: string,
  teamId: string,
  points: number,
) {
  if (points === 0) return;
  const { data } = await supabase
    .from("game_scores")
    .select("id, points")
    .eq("game_id", gameId)
    .eq("team_id", teamId)
    .single();
  if (data) {
    await supabase
      .from("game_scores")
      .update({ points: data.points + points })
      .eq("id", data.id);
  }
}

/** Create a game, build the interleaved turn queue, and jump to the play view. */
export async function startGame(formData: FormData) {
  const groupId = String(formData.get("groupId") || "");
  const numRounds = Math.max(1, Math.min(5, Number(formData.get("rounds") || 1)));
  if (!groupId) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: group } = await supabase.from("groups").select("*").eq("id", groupId).single();
  if (!group) redirect("/dashboard");

  const [{ data: teamData }, { data: memberData }, { data: assignmentData }] = await Promise.all([
    supabase.from("teams").select("*").eq("group_id", groupId).order("team_index"),
    supabase.from("members").select("*").eq("group_id", groupId).order("created_at"),
    supabase.from("feud_question_assignments").select("*").eq("group_id", groupId),
  ]);
  const teams = (teamData ?? []) as Team[];
  const members = (memberData ?? []) as Member[];
  const holdoutByMember = new Map<string, string>(
    (assignmentData ?? []).map((a) => [a.member_id, a.question_id]),
  );

  // Interleave teams' members: T0.m0, T1.m0, T0.m1, T1.m1, … for each round.
  const membersByTeam = new Map<string, Member[]>();
  for (const t of teams) {
    membersByTeam.set(
      t.id,
      members.filter((m) => m.team_id === t.id),
    );
  }
  const maxLen = Math.max(0, ...[...membersByTeam.values()].map((a) => a.length));
  const queue: GameTurn[] = [];
  for (let r = 1; r <= numRounds; r++) {
    for (let i = 0; i < maxLen; i++) {
      for (const t of teams) {
        const m = membersByTeam.get(t.id)?.[i];
        if (!m) continue;
        const feudQuestionId = holdoutByMember.get(m.id);
        if (!feudQuestionId) continue; // member without a fresh holdout sits out
        queue.push({
          round: r,
          teamId: t.id,
          teamName: t.name,
          memberId: m.id,
          memberName: m.display_name,
          feudQuestionId,
        });
      }
    }
  }
  if (queue.length === 0) redirect(`/dashboard/g/${groupId}`);

  const settings = {
    feudSeconds: DEFAULT_SETTINGS.feudSeconds,
    triviaSeconds: DEFAULT_SETTINGS.triviaSeconds,
  };
  const { data: gameRow, error } = await supabase
    .from("games")
    .insert({
      group_id: groupId,
      status: "active",
      num_teams: teams.length,
      num_rounds: numRounds,
      current_round: 1,
      current_team_id: queue[0].teamId,
      current_member_id: queue[0].memberId,
      current_phase: "feud",
      settings,
      state: { queue, cursor: 0 },
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !gameRow) redirect(`/dashboard/g/${groupId}`);

  await supabase
    .from("game_scores")
    .insert(teams.map((t) => ({ game_id: gameRow.id, team_id: t.id, points: 0 })));
  await supabase.from("groups").update({ status: "live" }).eq("id", groupId);

  redirect(`/play/${gameRow.id}`);
}

/** Tally the group's answers, fuzzy-match the guess, score it, and persist. */
export async function scoreFeud(input: {
  gameId: string;
  questionId: string;
  teamId: string;
  guess: string;
}): Promise<FeudResult> {
  const supabase = await createSupabaseServerClient();
  const { data: responses } = await supabase
    .from("feud_responses")
    .select("normalized_bucket, raw_answer")
    .eq("question_id", input.questionId);

  const answers = (responses ?? []).map((r) => r.normalized_bucket || r.raw_answer);
  const buckets = tallyBuckets(answers);
  const matched = fuzzyMatch(input.guess, buckets.map((b) => b.label));
  const points = scoreFeudGuess(buckets, matched);

  await addPoints(supabase, input.gameId, input.teamId, points);
  await supabase.from("game_events").insert({
    game_id: input.gameId,
    type: "feud_result",
    payload: { questionId: input.questionId, guess: input.guess, matched, points },
  });

  return { buckets, matched, points };
}

/** Match the captain's answer against accepted variants, score, and persist. */
export async function scoreTrivia(input: {
  gameId: string;
  questionId: string;
  teamId: string;
  answer: string;
}): Promise<TriviaResult> {
  const supabase = await createSupabaseServerClient();
  const { data: q } = await supabase
    .from("trivia_questions")
    .select("*")
    .eq("id", input.questionId)
    .single();
  if (!q) return { correct: false, points: 0, correctAnswer: "" };

  const candidates = [q.correct_answer, ...((q.accepted_variants as string[]) ?? [])];
  const matched = fuzzyMatch(input.answer, candidates);
  const correct = matched !== null;
  const points = correct ? q.point_value : 0;

  await supabase.from("trivia_questions").update({ used: true }).eq("id", q.id);
  await addPoints(supabase, input.gameId, input.teamId, points);
  await supabase.from("game_events").insert({
    game_id: input.gameId,
    type: "trivia_result",
    payload: { questionId: q.id, answer: input.answer, correct, points },
  });

  return { correct, points, correctAnswer: q.correct_answer };
}

/** Persist the turn cursor (so an admin refresh resumes at the right turn). */
export async function persistTurn(input: {
  gameId: string;
  cursor: number;
  finished?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  if (input.finished) {
    const { data: g } = await supabase
      .from("games")
      .update({ status: "done" })
      .eq("id", input.gameId)
      .select("group_id")
      .single();
    if (g) await supabase.from("groups").update({ status: "done" }).eq("id", g.group_id);
    return;
  }
  const { data: game } = await supabase
    .from("games")
    .select("state")
    .eq("id", input.gameId)
    .single();
  const queue = ((game?.state as { queue?: GameTurn[] })?.queue ?? []) as GameTurn[];
  const turn = queue[input.cursor];
  await supabase
    .from("games")
    .update({
      state: { queue, cursor: input.cursor },
      current_round: turn?.round ?? 1,
      current_team_id: turn?.teamId ?? null,
      current_member_id: turn?.memberId ?? null,
    })
    .eq("id", input.gameId);
}

export async function setGameStatus(input: { gameId: string; status: "active" | "paused" }) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("games").update({ status: input.status }).eq("id", input.gameId);
}

export async function setGameTimers(input: {
  gameId: string;
  feudSeconds: number;
  triviaSeconds: number;
}) {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("games")
    .update({ settings: { feudSeconds: input.feudSeconds, triviaSeconds: input.triviaSeconds } })
    .eq("id", input.gameId);
}
