"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureAllHoldouts } from "@/lib/holdouts";
import { regenerateTriviaBank } from "@/lib/trivia/regenerate";

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
  await supabase.from("teams").update({ captain_member_id: input.memberId }).eq("id", m.team_id);

  revalidatePath(`/dashboard/g/${input.groupId}`);
}

/** (Re)generate the trivia bank (balanced + calibrated; AI-tailored with a key,
 *  else the starter pool). Also ensures every member has a fresh holdout. */
export async function generateTriviaBank(formData: FormData) {
  const groupId = String(formData.get("groupId") || "");
  if (!groupId) return;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await ensureAllHoldouts(supabase, groupId);
  await regenerateTriviaBank(supabase, groupId);
  revalidatePath(`/dashboard/g/${groupId}`);
}
