import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Member/captain self-service helpers. These run in API route handlers behind
// the service-role key, gated by the group's join code (members don't auth).

export async function lookupGroup(code: string) {
  const supabase = createSupabaseAdminClient();
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, dynamic_note, join_code")
    .eq("join_code", code.trim().toUpperCase())
    .maybeSingle();
  if (!group) return null;

  const [{ data: members }, { data: teams }] = await Promise.all([
    supabase
      .from("members")
      .select("id, display_name, is_captain, team_id")
      .eq("group_id", group.id)
      .order("created_at"),
    supabase.from("teams").select("id, name, team_index").eq("group_id", group.id).order("team_index"),
  ]);
  return { group, members: members ?? [], teams: teams ?? [] };
}

export async function validateMember(code: string, memberId: string) {
  const ctx = await lookupGroup(code);
  if (!ctx) return null;
  const member = ctx.members.find((m) => m.id === memberId);
  if (!member) return null;
  return { ...ctx, member };
}

/**
 * Ensure this member has a fresh holdout question assigned (one they will NOT
 * answer, to play live). Requires at least as many questions as members.
 * Returns the holdout question id, or null if not enough questions yet.
 */
export async function ensureHoldout(groupId: string, memberId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("feud_question_assignments")
    .select("question_id")
    .eq("group_id", groupId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (existing) return existing.question_id;

  const [{ data: questions }, { count: memberCount }, { data: held }, { data: answered }] =
    await Promise.all([
      supabase.from("feud_questions").select("id").eq("group_id", groupId).order("created_at"),
      supabase.from("members").select("id", { count: "exact", head: true }).eq("group_id", groupId),
      supabase.from("feud_question_assignments").select("question_id").eq("group_id", groupId),
      supabase.from("feud_responses").select("question_id").eq("member_id", memberId),
    ]);

  const ids = (questions ?? []).map((q) => q.id);
  if (ids.length < (memberCount ?? 0)) return null; // need M >= N before holding any out

  const heldSet = new Set((held ?? []).map((h) => h.question_id));
  const answeredSet = new Set((answered ?? []).map((a) => a.question_id));
  const candidate =
    ids.find((id) => !heldSet.has(id) && !answeredSet.has(id)) ??
    ids.find((id) => !heldSet.has(id));
  if (!candidate) return null;

  const { error } = await supabase
    .from("feud_question_assignments")
    .insert({ group_id: groupId, question_id: candidate, member_id: memberId });
  if (error) {
    // Lost a race on the unique constraint — re-read whatever stuck.
    const { data: again } = await supabase
      .from("feud_question_assignments")
      .select("question_id")
      .eq("group_id", groupId)
      .eq("member_id", memberId)
      .maybeSingle();
    return again?.question_id ?? null;
  }
  return candidate;
}

export async function getMemberTasks(code: string, memberId: string) {
  const ctx = await validateMember(code, memberId);
  if (!ctx) return null;
  const supabase = createSupabaseAdminClient();

  const holdout = await ensureHoldout(ctx.group.id, memberId);
  const [{ data: questions }, { data: answered }] = await Promise.all([
    supabase
      .from("feud_questions")
      .select("id, prompt, type, options")
      .eq("group_id", ctx.group.id)
      .order("created_at"),
    supabase.from("feud_responses").select("question_id").eq("member_id", memberId),
  ]);

  const answeredSet = new Set((answered ?? []).map((a) => a.question_id));
  const allForMember = (questions ?? []).filter((q) => q.id !== holdout);
  const toAnswer = allForMember.filter((q) => !answeredSet.has(q.id));

  let captain: { teamId: string; teamName: string; selected: string[] } | null = null;
  if (ctx.member.is_captain && ctx.member.team_id) {
    const { data: sel } = await supabase
      .from("trivia_topics")
      .select("name")
      .eq("team_id", ctx.member.team_id)
      .eq("selected", true);
    const team = ctx.teams.find((t) => t.id === ctx.member.team_id);
    captain = {
      teamId: ctx.member.team_id,
      teamName: team?.name ?? "your team",
      selected: (sel ?? []).map((s) => s.name),
    };
  }

  return {
    groupName: ctx.group.name,
    member: {
      id: ctx.member.id,
      name: ctx.member.display_name,
      isCaptain: ctx.member.is_captain,
      teamId: ctx.member.team_id,
    },
    roster: ctx.members.map((m) => ({ id: m.id, name: m.display_name })),
    toAnswer,
    answeredCount: allForMember.length - toAnswer.length,
    totalForMember: allForMember.length,
    holdoutAssigned: Boolean(holdout),
    captain,
  };
}
