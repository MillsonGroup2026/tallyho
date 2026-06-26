"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
