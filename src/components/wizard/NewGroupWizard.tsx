"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SaysReveal } from "@/components/SaysReveal";
import { CATEGORY_LABELS } from "@/lib/brand";
import { createGroup, type CreateGroupInput } from "@/app/dashboard/new/actions";
import type { GroupCategory, TeamAssignment } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = ["Name", "Roster", "Vibe", "Good to know", "Teams", "Review"] as const;
const CATEGORIES: GroupCategory[] = [
  "friends",
  "family",
  "work",
  "travel",
  "church",
  "general",
  "custom",
];
const DYNAMIC_EXAMPLES = [
  "We're all skiers",
  "Same company, different departments",
  "Keep it saucy 😏",
  "Lighthearted — nothing too deep",
  "Huge sports crew",
  "College friends, 10 years deep",
];
const TEAM_DOTS = ["bg-magenta", "bg-cyan", "bg-gold", "bg-green"];

export function NewGroupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [members, setMembers] = useState<string[]>(["", "", "", ""]);
  const [category, setCategory] = useState<GroupCategory>("friends");
  const [customDesc, setCustomDesc] = useState("");
  const [dynamicNote, setDynamicNote] = useState("");
  const [numTeams, setNumTeams] = useState(2);
  const [teamAssignment, setTeamAssignment] = useState<TeamAssignment>("random");
  const [memberTeams, setMemberTeams] = useState<Record<number, number>>({});

  const filled = members
    .map((m, i) => ({ name: m.trim(), i }))
    .filter((m) => m.name.length > 0);

  const isLast = step === STEPS.length - 1;

  function canAdvance(): boolean {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return filled.length >= 2;
    if (step === 2) return category !== "custom" || customDesc.trim().length > 0;
    return true;
  }

  function submit() {
    setError(null);
    const input: CreateGroupInput = {
      name: name.trim(),
      category,
      categoryCustomDesc: customDesc,
      dynamicNote,
      numTeams,
      teamAssignment,
      members: members
        .map((m, i) => ({
          name: m,
          teamIndex: teamAssignment === "admin" ? (memberTeams[i] ?? 0) % numTeams : null,
        }))
        .filter((m) => m.name.trim().length > 0),
    };
    startTransition(async () => {
      const res = await createGroup(input);
      if (res.ok) router.push(`/dashboard/g/${res.groupId}?created=1`);
      else setError(res.error);
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* stepper */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                i === step
                  ? "bg-magenta text-white"
                  : i < step
                    ? "bg-green/20 text-green"
                    : "bg-white/8 text-cream/40",
              )}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "text-xs font-semibold",
                i === step ? "text-cream" : "text-cream/40",
              )}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && <span className="text-cream/20">·</span>}
          </div>
        ))}
      </div>

      <div className="card min-h-[320px] p-6 sm:p-8">
        {/* STEP 0 — NAME */}
        {step === 0 && (
          <div>
            <h2 className="font-display text-2xl font-bold">What&apos;s the group called?</h2>
            <p className="mt-1 text-sm text-cream/60">
              This is the star of every reveal. Watch:
            </p>
            <input
              autoFocus
              className="input mt-5 text-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mile High"
              maxLength={32}
            />
            <div className="mt-6 flex min-h-[80px] items-center justify-center rounded-2xl bg-black/20 p-4">
              <SaysReveal groupName={name} size="md" />
            </div>
          </div>
        )}

        {/* STEP 1 — ROSTER */}
        {step === 1 && (
          <div>
            <h2 className="font-display text-2xl font-bold">Who&apos;s playing?</h2>
            <p className="mt-1 text-sm text-cream/60">
              Add everyone&apos;s names. You can add more anytime, even after people start
              filling out.
            </p>
            <div className="mt-5 space-y-2">
              {members.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-right text-sm text-cream/40">{i + 1}</span>
                  <input
                    className="input"
                    value={m}
                    onChange={(e) =>
                      setMembers((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))
                    }
                    placeholder={`Player ${i + 1}`}
                    maxLength={40}
                  />
                  <button
                    type="button"
                    onClick={() => setMembers((prev) => prev.filter((_, idx) => idx !== i))}
                    className="px-2 text-cream/40 hover:text-magenta"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMembers((prev) => [...prev, ""])}
                className="btn btn-ghost text-sm"
              >
                + Add player
              </button>
              <span className="text-sm text-cream/50">{filled.length} added</span>
            </div>
          </div>
        )}

        {/* STEP 2 — VIBE / CATEGORY */}
        {step === 2 && (
          <div>
            <h2 className="font-display text-2xl font-bold">What kind of group?</h2>
            <p className="mt-1 text-sm text-cream/60">
              Helps us tune the questions and trivia to your crew.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition",
                    category === c
                      ? "border-magenta bg-magenta/10 text-cream"
                      : "border-white/10 bg-white/5 text-cream/70 hover:border-white/25",
                  )}
                >
                  {CATEGORY_LABELS[c] ?? c}
                </button>
              ))}
            </div>
            {category === "custom" && (
              <div className="mt-4">
                <label className="label">Describe your group</label>
                <input
                  className="input mt-1"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="e.g. fantasy football league since 2014"
                  maxLength={120}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — DYNAMIC NOTE */}
        {step === 3 && (
          <div>
            <h2 className="font-display text-2xl font-bold">Anything good to know?</h2>
            <p className="mt-1 text-sm text-cream/60">
              The inside-joke fuel. Topical focus, how spicy to go, shared history — all of it
              shapes the questions.
            </p>
            <textarea
              className="input mt-5 min-h-[110px] resize-y"
              value={dynamicNote}
              onChange={(e) => setDynamicNote(e.target.value)}
              placeholder="We're all skiers, half of us work together, and nobody lets Dave forget the cabin trip."
              maxLength={400}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {DYNAMIC_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="chip hover:bg-white/15"
                  onClick={() =>
                    setDynamicNote((prev) => (prev.trim() ? `${prev}, ${ex}` : ex))
                  }
                >
                  + {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4 — TEAMS */}
        {step === 4 && (
          <div>
            <h2 className="font-display text-2xl font-bold">Teams</h2>
            <p className="mt-1 text-sm text-cream/60">
              How many teams, and how to split everyone up?
            </p>

            <div className="mt-5">
              <label className="label">Number of teams</label>
              <div className="mt-2 flex gap-2">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumTeams(n)}
                    className={cn(
                      "h-11 w-11 rounded-xl border font-display font-bold transition",
                      numTeams === n
                        ? "border-magenta bg-magenta/10"
                        : "border-white/10 bg-white/5 text-cream/70 hover:border-white/25",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="label">Assignment</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["random", "admin"] as TeamAssignment[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setTeamAssignment(a)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-sm font-semibold transition",
                      teamAssignment === a
                        ? "border-magenta bg-magenta/10 text-cream"
                        : "border-white/10 bg-white/5 text-cream/70 hover:border-white/25",
                    )}
                  >
                    {a === "random" ? "🎲 Random split" : "✋ I'll pick"}
                  </button>
                ))}
              </div>
            </div>

            {teamAssignment === "admin" && (
              <div className="mt-5 space-y-2">
                <label className="label">Assign players to teams</label>
                {filled.map(({ name: pname, i }) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
                    <span className="truncate text-sm">{pname}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: numTeams }, (_, t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setMemberTeams((prev) => ({ ...prev, [i]: t }))}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold",
                            (memberTeams[i] ?? 0) === t
                              ? `${TEAM_DOTS[t]} text-white`
                              : "bg-white/8 text-cream/50",
                          )}
                        >
                          {t + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 5 — REVIEW */}
        {step === 5 && (
          <div>
            <h2 className="font-display text-2xl font-bold">Look right?</h2>
            <div className="mt-5 space-y-3 text-sm">
              <Row label="Group">
                <SaysReveal groupName={name} size="md" />
              </Row>
              <Row label="Players">{filled.length} added</Row>
              <Row label="Vibe">{CATEGORY_LABELS[category] ?? category}</Row>
              {dynamicNote.trim() && <Row label="Good to know">{dynamicNote.trim()}</Row>}
              <Row label="Teams">
                {numTeams} · {teamAssignment === "random" ? "random split" : "you pick"}
              </Row>
            </div>
            <p className="mt-5 text-xs text-cream/50">
              We&apos;ll generate a join code, build the teams, and pick a captain for each. You
              can tweak everything afterward.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-magenta/30 bg-magenta/10 px-4 py-3 text-sm text-magenta-soft">
          {error}
        </p>
      )}

      {/* nav */}
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="btn btn-ghost"
          disabled={step === 0 || pending}
        >
          ← Back
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={submit}
            className="btn btn-primary"
            disabled={pending || filled.length < 2}
          >
            {pending ? "Creating…" : "Create group 🎉"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="btn btn-primary"
            disabled={!canAdvance()}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-3">
      <span className="label pt-1">{label}</span>
      <span className="text-right text-cream/90">{children}</span>
    </div>
  );
}
