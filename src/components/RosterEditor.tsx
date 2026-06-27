"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveMember, setCaptain } from "@/app/dashboard/g/[id]/actions";
import type { Member, Team } from "@/lib/types";

export function RosterEditor({
  groupId,
  members,
  teams,
}: {
  groupId: string;
  members: Member[];
  teams: Team[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function move(memberId: string, teamId: string) {
    start(async () => {
      await moveMember({ groupId, memberId, teamId });
      router.refresh();
    });
  }
  function makeCaptain(memberId: string) {
    start(async () => {
      await setCaptain({ groupId, memberId });
      router.refresh();
    });
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {teams.map((team) => {
        const teamMembers = members.filter((m) => m.team_id === team.id);
        return (
          <div key={team.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="font-display font-bold">{team.name}</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {teamMembers.length === 0 && <li className="text-cream/40">No players yet</li>}
              {teamMembers.map((m) => {
                const isCap = m.is_captain || team.captain_member_id === m.id;
                return (
                  <li key={m.id} className="flex items-center gap-2">
                    <span className="flex-1 truncate">{m.display_name}</span>
                    {isCap ? (
                      <span className="chip cursor-default text-xs" title="Captain">
                        🎖️
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => makeCaptain(m.id)}
                        disabled={pending}
                        className="text-cream/35 hover:text-gold disabled:opacity-50"
                        title="Make captain"
                      >
                        ★
                      </button>
                    )}
                    <select
                      value={team.id}
                      disabled={pending}
                      onChange={(e) => move(m.id, e.target.value)}
                      className="rounded-lg border border-white/10 bg-ink-soft px-2 py-1 text-xs text-cream outline-none focus:border-magenta disabled:opacity-50"
                      title="Move to team"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
