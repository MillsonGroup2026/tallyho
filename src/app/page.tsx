import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { RevealDemo } from "@/components/RevealDemo";

const STEPS = [
  {
    n: "1",
    title: "Build your group",
    body: "Add everyone's names, pick a vibe, and we spin up a private portal with a share code.",
    color: "text-magenta",
  },
  {
    n: "2",
    title: "Everyone fills out",
    body: "Members answer feud questions about each other from their phones. Captains pick trivia topics. You watch it fill in live.",
    color: "text-cyan",
  },
  {
    n: "3",
    title: "Play on the TV",
    body: "Mirror your phone to the big screen and host. Guess what your crew said, answer trivia, rack up points.",
    color: "text-gold",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark size="sm" />
        <nav className="flex items-center gap-3">
          <Link href="/join" className="btn btn-ghost text-sm">
            Join a game
          </Link>
          <Link href="/login" className="btn btn-primary text-sm">
            Start a game
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-10 lg:grid-cols-2 lg:py-16">
        <div>
          <span className="chip mb-5 cursor-default">🎤 Party game · your crew is the survey</span>
          <h1 className="font-display text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            It&apos;s not <span className="text-cream/60 line-through decoration-magenta/70">Survey</span>{" "}
            says.
            <br />
            It&apos;s <span className="text-magenta text-glow">your group</span> says.
          </h1>
          <p className="mt-5 max-w-md text-lg text-cream/70">
            A Family-Feud-style showdown built around the people in the room. Guess what your friends
            really said about each other, then battle it out on trivia your captains picked.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-primary">
              Start a game →
            </Link>
            <Link href="/join" className="btn btn-ghost">
              I have a code
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <RevealDemo />
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-cream/80">
          Three steps to chaos
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-6">
              <div className={`font-display text-5xl font-black ${s.color}`}>{s.n}</div>
              <h3 className="mt-3 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-cream/65">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* footer */}
      <footer className="mx-auto w-full max-w-6xl px-6 py-10 text-sm text-cream/40">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <Wordmark size="sm" />
          <span>Gather your people. Mirror to the TV. Find out who really knows who.</span>
        </div>
      </footer>
    </main>
  );
}
