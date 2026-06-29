import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS } from "@/lib/brand";
import { memberInvite, captainInvite, joinLink } from "@/lib/invites";
import { InviteCard } from "@/components/InviteCard";
import { CopyButton } from "@/components/CopyButton";
import { RosterEditor } from "@/components/RosterEditor";
import { addMember, generateTriviaBank } from "./actions";
import { startGame } from "@/app/play/actions";
import type { Group, Member, Team } from "@/lib/types";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: groupData } = await supabase.from("groups").select("*").eq("id", id).single();
  if (!groupData) notFound();
  const group = groupData as Group;

  const [
    { data: memberData },
    { data: teamData },
    { count: topicCount },
    { count: assignCount },
    { count: triviaCount },
  ] = await Promise.all([
    supabase.from("members").select("*").eq("group_id", id).order("created_at"),
    supabase.from("teams").select("*").eq("group_id", id).order("team_index"),
    supabase
      .from("trivia_topics")
      .select("id", { count: "exact", head: true })
      .eq("group_id", id)
      .eq("selected", true),
    supabase
      .from("feud_question_assignments")
      .select("id", { count: "exact", head: true })
      .eq("group_id", id),
    supabase
      .from("trivia_questions")
      .select("id", { count: "exact", head: true })
      .eq("group_id", id),
  ]);
  const members = (memberData ?? []) as Member[];
  const teams = (teamData ?? []) as Team[];

  const captainsSet = teams.length > 0 && teams.every((t) => t.captain_member_id);
  const link = joinLink(group, appUrl());
  const hostReady = (assignCount ?? 0) > 0 && (triviaCount ?? 0) > 0;

  const readiness = [
    { label: `Roster (${members.length} players)`, done: members.length >= 2, soon: false },
    { label: "Teams & captains assigned", done: captainsSet, soon: false },
    { label: "Captains picked trivia topics", done: (topicCount ?? 0) > 0, soon: (topicCount ?? 0) === 0 },
    { label: "Members filled out feud questions", done: (assignCount ?? 0) > 0, soon: (assignCount ?? 0) === 0 },
    { label: "Trivia bank generated", done: (triviaCount ?? 0) > 0, soon: (triviaCount ?? 0) === 0 },
  ];

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-cream/50 hover:text-cream">
        ← All groups
      </Link>

      {created && (
        <div className="mt-3 rounded-xl border border-green/30 bg-green/10 px-4 py-3 text-sm text-green">
          🎉 <span className="font-semibold">{group.name}</span> is live in setup mode. Send the
          invites below, and watch answers roll in.
        </div>
      )}

      {/* header */}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-black">{group.name}</h1>
          <p className="mt-1 text-sm text-cream/55">
            {CATEGORY_LABELS[group.category] ?? group.category}
            {group.dynamic_note ? ` · ${group.dynamic_note}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="label">Join code</div>
            <div className="font-mono text-2xl font-bold tracking-[0.3em] text-cream">
              {group.join_code}
            </div>
          </div>
          <CopyButton text={link} label="Copy link" className="text-sm" />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* left: readiness + roster */}
        <div className="space-y-6 lg:col-span-2">
          {/* readiness */}
          <section className="card p-5">
            <h2 className="font-display text-lg font-bold">Readiness</h2>
            <ul className="mt-3 space-y-2">
              {readiness.map((r) => (
                <li key={r.label} className="flex items-center gap-3 text-sm">
                  <span
                    className={
                      r.done
                        ? "text-green"
                        : r.soon
                          ? "text-cream/30"
                          : "text-magenta-soft"
                    }
                  >
                    {r.done ? "✓" : r.soon ? "○" : "○"}
                  </span>
                  <span className={r.done ? "text-cream" : "text-cream/60"}>{r.label}</span>
                  {r.soon && <span className="chip cursor-default ml-auto text-xs">up next</span>}
                </li>
              ))}
            </ul>
          </section>

          {/* setup tasks */}
          <section className="card p-5">
            <h2 className="font-display text-lg font-bold">Build the game</h2>
            <p className="mt-1 text-sm text-cream/55">
              Author feud questions; captains pick trivia topics from their phones, then generate
              the bank.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/g/${group.id}/questions`}
                className="btn btn-secondary text-sm"
              >
                ✏️ Feud questions
              </Link>
              <form action={generateTriviaBank}>
                <input type="hidden" name="groupId" value={group.id} />
                <button type="submit" className="btn btn-ghost text-sm">
                  ⚡ Generate trivia bank
                </button>
              </form>
            </div>
            <p className="mt-2 text-xs text-cream/45">
              {topicCount ?? 0} topics chosen · {triviaCount ?? 0} trivia questions in the bank
            </p>
          </section>

          {/* roster by team */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Roster</h2>
              <span className="text-sm text-cream/50">{members.length} players</span>
            </div>
            <p className="mt-1 text-xs text-cream/45">
              Use the dropdown to move a player; tap ★ to make someone captain.
            </p>
            <RosterEditor groupId={group.id} members={members} teams={teams} />

            {/* add member */}
            <form action={addMember} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="groupId" value={group.id} />
              <div className="flex-1">
                <label className="label" htmlFor="new-member">
                  Add a player
                </label>
                <input
                  id="new-member"
                  name="name"
                  className="input mt-1"
                  placeholder="New player's name"
                  maxLength={40}
                  required
                />
              </div>
              <select name="teamId" className="input w-auto" defaultValue="">
                <option value="">Balance automatically</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-ghost">
                Add
              </button>
            </form>
          </section>

          {/* host */}
          <section className="card p-5">
            <h2 className="font-display text-lg font-bold">Host the live game</h2>
            {hostReady ? (
              <>
                <p className="mt-1 text-sm text-cream/55">
                  Mirror your screen to the TV and run it from here. Feud is 25s per guess; trivia
                  is 3.5 min per question.
                </p>
                <form action={startGame} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="groupId" value={group.id} />
                  <div>
                    <label className="label" htmlFor="rounds">
                      Rounds
                    </label>
                    <select id="rounds" name="rounds" defaultValue="1" className="input mt-1 w-auto">
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary text-lg">
                    ▶ Host live game
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-1 text-sm text-cream/55">
                Finish setup first — you need filled-out feud questions and a trivia bank. (Tip: the
                demo group comes fully loaded and is ready to host immediately.)
              </p>
            )}
          </section>
        </div>

        {/* right: invites */}
        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold">Invite your crew</h2>
          <p className="-mt-2 text-sm text-cream/55">
            One-tap copy. Send the captain message to your captains, the member message to
            everyone else.
          </p>
          <InviteCard
            title="For members"
            emoji="🎤"
            message={memberInvite(group, appUrl())}
            accent="cyan"
          />
          <InviteCard
            title="For captains"
            emoji="🎖️"
            message={captainInvite(group, appUrl())}
            accent="magenta"
          />
        </div>
      </div>
    </div>
  );
}
