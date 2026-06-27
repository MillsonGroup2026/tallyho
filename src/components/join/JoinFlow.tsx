"use client";

import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/Wordmark";

interface MemberLite {
  id: string;
  name: string;
  isCaptain: boolean;
}
interface Question {
  id: string;
  prompt: string;
  type: string;
  options: string[] | null;
}
interface Tasks {
  groupName: string;
  member: { id: string; name: string; isCaptain: boolean; teamId: string | null };
  roster: { id: string; name: string }[];
  toAnswer: Question[];
  answeredCount: number;
  totalForMember: number;
  holdoutAssigned: boolean;
}

type Phase = "code" | "identify" | "tasks";

export function JoinFlow({ initialCode }: { initialCode?: string }) {
  const [phase, setPhase] = useState<Phase>("code");
  const [code, setCode] = useState((initialCode ?? "").toUpperCase());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = useState<{ groupName: string; members: MemberLite[] } | null>(null);
  const [tasks, setTasks] = useState<Tasks | null>(null);
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const didAuto = useRef(false);

  useEffect(() => {
    if (initialCode && !didAuto.current) {
      didAuto.current = true;
      void lookup(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(c: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/join/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Couldn't find that group.");
        return;
      }
      setGroup({ groupName: data.groupName, members: data.members });
      setPhase("identify");
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function pickMe(memberId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/join/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, memberId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError("Something went wrong.");
        return;
      }
      setTasks(data);
      setIdx(0);
      setPhase("tasks");
    } finally {
      setBusy(false);
    }
  }

  async function answer(value: string) {
    if (!tasks) return;
    const q = tasks.toAnswer[idx];
    if (!q || !value.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/join/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, memberId: tasks.member.id, questionId: q.id, answer: value }),
      });
      setText("");
      setIdx((i) => i + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Wordmark size="sm" />
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-magenta/30 bg-magenta/10 px-4 py-3 text-center text-sm text-magenta-soft">
            {error}
          </p>
        )}

        {/* CODE */}
        {phase === "code" && (
          <div className="card p-6 text-center">
            <h1 className="font-display text-2xl font-bold">Join your group</h1>
            <p className="mt-1 text-sm text-cream/60">Enter the code your host sent you.</p>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && code && lookup(code)}
              placeholder="ABC123"
              maxLength={8}
              className="input mt-5 text-center text-2xl font-bold tracking-[0.4em]"
            />
            <button
              onClick={() => lookup(code)}
              disabled={busy || code.length < 4}
              className="btn btn-primary mt-5 w-full"
            >
              {busy ? "Looking…" : "Find my group →"}
            </button>
          </div>
        )}

        {/* IDENTIFY */}
        {phase === "identify" && group && (
          <div className="card p-6">
            <p className="text-center text-sm text-cream/60">You&apos;re joining</p>
            <h1 className="text-center font-display text-2xl font-bold">{group.groupName}</h1>
            <p className="mt-5 mb-2 text-center label">Who are you?</p>
            <div className="grid grid-cols-2 gap-2">
              {group.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => pickMe(m.id)}
                  disabled={busy}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold transition hover:border-magenta hover:bg-magenta/10 disabled:opacity-50"
                >
                  {m.name}
                  {m.isCaptain && <span className="ml-1">🎖️</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TASKS */}
        {phase === "tasks" && tasks && <TaskView tasks={tasks} idx={idx} text={text} setText={setText} busy={busy} onAnswer={answer} />}
      </div>
    </main>
  );
}

function TaskView({
  tasks,
  idx,
  text,
  setText,
  busy,
  onAnswer,
}: {
  tasks: Tasks;
  idx: number;
  text: string;
  setText: (v: string) => void;
  busy: boolean;
  onAnswer: (v: string) => void;
}) {
  const done = idx >= tasks.toAnswer.length;

  if (tasks.totalForMember === 0) {
    return (
      <div className="card p-7 text-center">
        <div className="text-5xl">⏳</div>
        <h1 className="mt-3 font-display text-2xl font-bold">Hey {tasks.member.name}!</h1>
        <p className="mt-2 text-sm text-cream/60">
          No questions are ready yet. Check back once your host has set them up.
        </p>
        {tasks.member.isCaptain && (
          <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold">
            🎖️ You&apos;re a captain — topic picking opens here soon.
          </p>
        )}
      </div>
    );
  }

  if (done) {
    return (
      <div className="card p-7 text-center">
        <div className="animate-pop text-6xl">🎉</div>
        <h1 className="mt-3 font-display text-2xl font-bold">All set, {tasks.member.name}!</h1>
        <p className="mt-2 text-sm text-cream/60">
          You answered {tasks.totalForMember} question{tasks.totalForMember === 1 ? "" : "s"}. Your
          host will take it from here.
        </p>
        {tasks.member.isCaptain && (
          <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold">
            🎖️ Captain bonus: trivia topic picking opens here soon.
          </p>
        )}
      </div>
    );
  }

  const q = tasks.toAnswer[idx];
  const total = tasks.totalForMember;
  const current = tasks.answeredCount + idx + 1;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between text-xs text-cream/50">
        <span>
          Question {current} of {total}
        </span>
        <span>{tasks.member.name}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-magenta transition-all" style={{ width: `${(current - 1) / total * 100}%` }} />
      </div>

      <h2 className="mt-5 font-display text-xl font-bold leading-snug">{q.prompt}</h2>

      <div className="mt-5">
        {q.type === "pick_person" && (
          <div className="grid grid-cols-2 gap-2">
            {tasks.roster.map((m) => (
              <button
                key={m.id}
                onClick={() => onAnswer(m.name)}
                disabled={busy}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold transition hover:border-magenta hover:bg-magenta/10 disabled:opacity-50"
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        {(q.type === "multiple_choice" || q.type === "likelihood") && (
          <div className="space-y-2">
            {(q.options ?? []).map((o) => (
              <button
                key={o}
                onClick={() => onAnswer(o)}
                disabled={busy}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold transition hover:border-cyan hover:bg-cyan/10 disabled:opacity-50"
              >
                {o}
              </button>
            ))}
          </div>
        )}

        {q.type === "open_text" && (
          <div className="flex gap-2">
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAnswer(text)}
              placeholder="Type your answer…"
              maxLength={80}
              className="input"
            />
            <button onClick={() => onAnswer(text)} disabled={busy || !text.trim()} className="btn btn-primary">
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
