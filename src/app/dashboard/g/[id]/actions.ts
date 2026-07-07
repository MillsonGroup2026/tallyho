"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildStarterBank } from "@/lib/trivia/generate";
import { tallyBuckets } from "@/lib/feud";
import { calibrationConstant, averageTopBucket } from "@/lib/scoring";
import { generateJSON, hasAI } from "@/lib/ai/anthropic";
import { ensureAllHoldouts } from "@/lib/holdouts";

/**
 * Add a member to an existing group at any time (including after others have
 * started filling out). If no team is chosen, the new member joins the
 * smallest team to keep things balanced.
 */
export async function addMember(formData: FormData) {
  const groupId = String(formData.get("groupId") || "");
  const name = String(formData.get("name") || "").trim();
  let teamId = String(formData.get("teamId") || "") || null;
  if (!groupId || !name) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Balance to the smallest team if none specified. RLS ensures the caller
  // owns this group.
  if (!teamId) {
    const { data: members } = await supabase
      .from("members")
      .select("team_id")
      .eq("group_id", groupId);
    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("group_id", groupId)
      .order("team_index");
    if (teams && teams.length > 0) {
      const counts = new Map<string, number>(teams.map((t) => [t.id, 0]));
      (members ?? []).forEach((m) => {
        if (m.team_id && counts.has(m.team_id)) counts.set(m.team_id, counts.get(m.team_id)! + 1);
      });
      teamId = [...counts.entries()].sort((a, b) => a[1] - b[1])[0][0];
    }
  }

  await supabase.from("members").insert({
    group_id: groupId,
    display_name: name,
    team_id: teamId,
    is_captain: false,
  });

  revalidatePath(`/dashboard/g/${groupId}`);
}

/** Move a player to a different team. They drop captaincy on the move (the old
 *  team's captain slot is cleared if it was them); reassign with setCaptain. */
export async function moveMember(input: { groupId: string; memberId: string; teamId: string }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: m } = await supabase
    .from("members")
    .select("team_id")
    .eq("id", input.memberId)
    .single();

  await supabase
    .from("members")
    .update({ team_id: input.teamId, is_captain: false })
    .eq("id", input.memberId);

  if (m?.team_id) {
    await supabase
      .from("teams")
      .update({ captain_member_id: null })
      .eq("id", m.team_id)
      .eq("captain_member_id", input.memberId);
  }

  revalidatePath(`/dashboard/g/${input.groupId}`);
}

/** Make a player the captain of their team (replaces the team's current captain). */
export async function setCaptain(input: { groupId: string; memberId: string }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: m } = await supabase
    .from("members")
    .select("team_id")
    .eq("id", input.memberId)
    .single();
  if (!m?.team_id) return;

  await supabase.from("members").update({ is_captain: false }).eq("team_id", m.team_id);
  await supabase.from("members").update({ is_captain: true }).eq("id", input.memberId);
  await supabase
    .from("teams")
    .update({ captain_member_id: input.memberId })
    .eq("id", m.team_id);

  revalidatePath(`/dashboard/g/${input.groupId}`);
}

// --- trivia bank generation -------------------------------------------------

interface TeamInput {
  id: string;
  name: string;
  selectedTopics: string[];
}

/** Calibration constant from the group's own answer distributions (floor 2). */
async function computeCalibration(
  supabase: SupabaseClient,
  groupId: string,
  memberCount: number,
): Promise<number> {
  const { data: qs } = await supabase.from("feud_questions").select("id").eq("group_id", groupId);
  const ids = (qs ?? []).map((q: { id: string }) => q.id);
  if (!ids.length) return Math.max(2, Math.round(memberCount / 2));

  const { data: resp } = await supabase
    .from("feud_responses")
    .select("question_id, normalized_bucket, raw_answer")
    .in("question_id", ids);

  const byQ = new Map<string, string[]>();
  for (const r of resp ?? []) {
    const arr = byQ.get(r.question_id) ?? [];
    arr.push(r.normalized_bucket || r.raw_answer);
    byQ.set(r.question_id, arr);
  }
  const tops: number[] = [];
  for (const [, answers] of byQ) {
    const buckets = tallyBuckets(answers);
    if (buckets.length) tops.push(buckets[0].count);
  }
  if (!tops.length) return Math.max(2, Math.round(memberCount / 2));
  return calibrationConstant(averageTopBucket(tops));
}

/** Topic-tailored trivia via AI. Returns null on failure so the caller falls
 *  back to the starter pool (and keeps both teams balanced). */
async function aiTriviaBank(teams: TeamInput[], countPerTeam: number, pointValue: number) {
  const out: {
    teamId: string;
    topic: string;
    prompt: string;
    correct_answer: string;
    accepted_variants: string[];
    point_value: number;
  }[] = [];
  for (const team of teams) {
    const topics = team.selectedTopics.length ? team.selectedTopics : ["General Knowledge"];
    const ai = await generateJSON<{
      questions: { topic: string; prompt: string; answer: string; variants?: string[] }[];
    }>({
      system:
        "You write trivia questions with one clear correct answer and a few accepted answer variants. Return JSON only.",
      prompt: `Write ${countPerTeam} trivia questions spread across these topics: ${topics.join(", ")}.
JSON: {"questions":[{"topic":string,"prompt":string,"answer":string,"variants":string[]}]}`,
      maxTokens: 1600,
    });
    const valid = (ai?.questions ?? []).filter((q) => q.prompt && q.answer).slice(0, countPerTeam);
    if (valid.length < countPerTeam) return null;
    for (const q of valid) {
      out.push({
        teamId: team.id,
        topic: q.topic || topics[0],
        prompt: q.prompt,
        correct_answer: q.answer,
        accepted_variants: q.variants ?? [],
        point_value: pointValue,
      });
    }
  }
  return out;
}

/** (Re)generate the trivia bank: balanced + calibrated, AI-tailored if a key is
 *  set, otherwise the starter pool biased to each team's chosen topics. */
export async function generateTriviaBank(formData: FormData) {
  const groupId = String(formData.get("groupId") || "");
  if (!groupId) return;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Generating the bank is the admin's "prepare to host" step — make sure every
  // member has a fresh holdout assigned while we're here.
  await ensureAllHoldouts(supabase, groupId);

  const [{ data: teams }, { data: members }, { data: selected }] = await Promise.all([
    supabase.from("teams").select("id, name").eq("group_id", groupId).order("team_index"),
    supabase.from("members").select("id, team_id").eq("group_id", groupId),
    supabase.from("trivia_topics").select("team_id, name").eq("group_id", groupId).eq("selected", true),
  ]);
  if (!teams || teams.length === 0) return;

  const memberCount = (members ?? []).length;
  const constant = await computeCalibration(supabase, groupId, memberCount);

  const sizeByTeam = new Map<string, number>();
  for (const m of members ?? []) {
    if (m.team_id) sizeByTeam.set(m.team_id, (sizeByTeam.get(m.team_id) ?? 0) + 1);
  }
  const countPerTeam = Math.max(5, 0, ...[...sizeByTeam.values()]);

  const topicsByTeam = new Map<string, string[]>();
  for (const t of selected ?? []) {
    const arr = topicsByTeam.get(t.team_id) ?? [];
    arr.push(t.name);
    topicsByTeam.set(t.team_id, arr);
  }
  const teamInputs: TeamInput[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    selectedTopics: topicsByTeam.get(t.id) ?? [],
  }));

  let rows = buildStarterBank({
    teams: teamInputs.map((t) => ({ id: t.id, selectedTopics: t.selectedTopics })),
    countPerTeam,
    pointValue: constant,
  });
  if (hasAI()) {
    const ai = await aiTriviaBank(teamInputs, countPerTeam, constant);
    if (ai && ai.length) rows = ai;
  }

  await supabase.from("trivia_questions").delete().eq("group_id", groupId);
  await supabase.from("trivia_questions").insert(
    rows.map((r) => ({
      group_id: groupId,
      team_id: r.teamId,
      topic: r.topic,
      prompt: r.prompt,
      correct_answer: r.correct_answer,
      accepted_variants: r.accepted_variants,
      point_value: r.point_value,
      round_no: 1,
    })),
  );
  await supabase.from("groups").update({ calibration_constant: constant }).eq("id", groupId);
  revalidatePath(`/dashboard/g/${groupId}`);
}
