import { NextResponse } from "next/server";
import { validateMember } from "@/lib/join";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_OF_TOPIC } from "@/lib/trivia/topics";

export async function POST(req: Request) {
  const { code, memberId, teamId, topics } = await req.json().catch(() => ({}));
  if (!code || !memberId || !teamId || !Array.isArray(topics)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ctx = await validateMember(String(code), String(memberId));
  if (!ctx) return NextResponse.json({ ok: false }, { status: 403 });
  if (!ctx.member.is_captain || ctx.member.team_id !== teamId) {
    return NextResponse.json({ ok: false, error: "not captain of this team" }, { status: 403 });
  }

  // Enforce one topic per category (last pick wins per category).
  const byCategory = new Map<string, string>();
  for (const t of topics as unknown[]) {
    if (typeof t !== "string") continue;
    const cat = CATEGORY_OF_TOPIC[t];
    if (cat) byCategory.set(cat, t);
  }
  const names = [...byCategory.values()];

  const supabase = createSupabaseAdminClient();
  // Replace this team's topic selection.
  await supabase.from("trivia_topics").delete().eq("team_id", teamId);
  if (names.length) {
    await supabase.from("trivia_topics").insert(
      names.map((name) => ({
        group_id: ctx.group.id,
        team_id: teamId,
        category: CATEGORY_OF_TOPIC[name] ?? "Mixed",
        name,
        selected: true,
        source: "custom",
      })),
    );
  }
  return NextResponse.json({ ok: true, selected: names });
}
