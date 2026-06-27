"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recommendFeudQuestions, recommendedCount } from "@/lib/feud/recommend";
import { generateJSON, hasAI } from "@/lib/ai/anthropic";
import type { FeudQuestionType } from "@/lib/types";

const TYPES: FeudQuestionType[] = ["pick_person", "likelihood", "multiple_choice", "open_text"];

function cleanOptions(type: FeudQuestionType, options: string[] | null): string[] | null {
  if (type !== "multiple_choice" && type !== "likelihood") return null;
  const cleaned = (options ?? []).map((o) => o.trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

function revalidate(groupId: string) {
  revalidatePath(`/dashboard/g/${groupId}/questions`);
  revalidatePath(`/dashboard/g/${groupId}`);
}

export async function addQuestion(input: {
  groupId: string;
  prompt: string;
  type: FeudQuestionType;
  options: string[] | null;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const prompt = input.prompt.trim();
  if (!prompt || !TYPES.includes(input.type)) return;

  await supabase.from("feud_questions").insert({
    group_id: input.groupId,
    prompt,
    type: input.type,
    options: cleanOptions(input.type, input.options),
    source: "admin",
    ai_recommended: false,
    is_buffer: false,
  });
  revalidate(input.groupId);
}

export async function updateQuestion(input: {
  groupId: string;
  questionId: string;
  prompt: string;
  type: FeudQuestionType;
  options: string[] | null;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const prompt = input.prompt.trim();
  if (!prompt || !TYPES.includes(input.type)) return;

  await supabase
    .from("feud_questions")
    .update({ prompt, type: input.type, options: cleanOptions(input.type, input.options) })
    .eq("id", input.questionId);
  revalidate(input.groupId);
}

export async function deleteQuestion(input: { groupId: string; questionId: string }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("feud_questions").delete().eq("id", input.questionId);
  revalidate(input.groupId);
}

/** Insert a recommended overshoot set (AI if a key is present, else deterministic). */
export async function addRecommended(formData: FormData) {
  const groupId = String(formData.get("groupId") || "");
  if (!groupId) return;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from("groups").select("name, dynamic_note").eq("id", groupId).single(),
    supabase.from("members").select("display_name").eq("group_id", groupId),
  ]);
  const memberNames = (members ?? []).map((m) => m.display_name);
  const count = recommendedCount(memberNames.length);

  let recs = recommendFeudQuestions({
    groupName: group?.name ?? "the group",
    memberNames,
    count,
  });

  let aiUsed = false;
  if (hasAI()) {
    const ai = await generateJSON<{
      questions: { prompt: string; type: string; options?: string[] }[];
    }>({
      system:
        "You write fun, varied 'Family Feud'-style party questions about a specific friend group. Bias toward pick-a-person and multiple-choice for clean tallies. Return JSON only.",
      prompt: `Group "${group?.name}". Good to know: ${group?.dynamic_note || "n/a"}. Members: ${memberNames.join(", ")}.
Return exactly ${count} questions as JSON: {"questions":[{"prompt":string,"type":"pick_person"|"likelihood"|"multiple_choice"|"open_text","options"?:string[]}]}.
For pick_person and open_text omit options. For multiple_choice give 4 options. For likelihood give a 4-point scale.`,
      maxTokens: 2000,
    });
    const valid = (ai?.questions ?? []).filter(
      (q) => q.prompt && TYPES.includes(q.type as FeudQuestionType),
    );
    if (valid.length >= Math.min(6, count)) {
      recs = valid.slice(0, count).map((q) => ({
        prompt: q.prompt,
        type: q.type as FeudQuestionType,
        options: q.options,
      }));
      aiUsed = true;
    }
  }

  await supabase.from("feud_questions").insert(
    recs.map((r) => ({
      group_id: groupId,
      prompt: r.prompt,
      type: r.type,
      options: cleanOptions(r.type, r.options ?? null),
      source: "recommended",
      ai_recommended: aiUsed,
      is_buffer: false,
    })),
  );
  revalidate(groupId);
}
