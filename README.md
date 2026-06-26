# Says Who? 🎤

A web-based party game in the spirit of Family Feud, but the survey population is
**your own group**. Every reveal lands as **"_[Group Name]_ says…"** — for a group
called _Mile High_, the screen says **"Mile High says…"**. That dynamic naming is the
fixed brand mechanic; everything else (the name _Says Who?_, the palette, the host
voice) is the creative spin.

Each game blends two streams:

1. **Feud round** — players guess what their own group collectively answered about each
   other ("Who's most likely to…", "How would Nick react when…"). Points = how many group
   members gave that same answer.
2. **Team trivia round** — teams answer real trivia in topics their captains pre-selected.

---

## Tech stack

| Layer            | Choice                                                            |
| ---------------- | ----------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router) + TypeScript                              |
| Styling          | Tailwind CSS v4 (CSS-first `@theme` tokens)                       |
| DB / realtime    | Supabase (Postgres + Realtime)                                    |
| Auth             | Supabase Auth (email/password; magic-link-ready)                  |
| AI               | Anthropic API (`claude-sonnet-4-6`), **server-side only**         |
| Hosting          | Render (web service) — see `render.yaml`                          |

All AI and data logic runs in **server-side route handlers**. The Anthropic key and the
Supabase service-role key are never exposed to the browser and never committed.

---

## Two operating modes

- **Mode A — Pre-game, multi-device (self-service).** Each member fills out their
  questions from their own phone via a share link + group code. Captains pick topics from
  their phones. The admin watches progress fill in live (Supabase Realtime).
- **Mode B — Live game, single-device.** The live game runs entirely on the admin's
  phone, typically screen-mirrored to a TV. No remote answering during play.

Multi-device sync only matters **before** the game starts.

---

## Local development

### Prerequisites

- Node 22+
- A Supabase project (free tier is fine)
- An Anthropic API key (optional for the demo — see [Seed/demo mode](#seeddemo-mode))

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values (see [Environment variables](#environment-variables)).

### 3. Set up the database

Open your Supabase project's **SQL editor** and run the migration:

```
supabase/migrations/0001_init.sql
```

(Or, with the Supabase CLI: `supabase db push`.) This creates all tables, row-level
security policies, and the realtime publication.

### 4. Run

```bash
npm run dev
```

Visit http://localhost:3000.

> **Tip:** run `npm run build` locally before deploying — a failed build on Render keeps
> the previous version live, so catching it locally saves a bad deploy.

---

## Environment variables

| Variable                        | Exposed to browser? | Purpose                                            |
| ------------------------------- | ------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅ (safe)           | Supabase project URL                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ (safe, RLS)      | Supabase anon key (public by design)               |
| `SUPABASE_SERVICE_ROLE_KEY`     | ❌ **server-only**  | Bypasses RLS; used by member-facing route handlers |
| `ANTHROPIC_API_KEY`             | ❌ **server-only**  | Anthropic API key                                  |
| `ANTHROPIC_MODEL`               | server              | Model id (default `claude-sonnet-4-6`)             |
| `NEXT_PUBLIC_APP_URL`           | ✅                  | Base URL used to build share links                 |

The two server-only keys have **no** `NEXT_PUBLIC_` prefix, so Next.js will never bundle
them into client code.

---

## Security / access model

Members and captains **don't have accounts**. Row Level Security restricts direct DB
access to the admin who owns a group (`groups.created_by = auth.uid()`). Member/captain
devices talk to **server route handlers** that validate the group's `join_code` and then
act via the **service-role** client (which bypasses RLS). Anon clients never touch the
database directly.

---

## Seed/demo mode

_(M4 — coming in this build.)_ A one-click, **deterministic, offline** demo creates a full
group (members, teams, captains, chosen topics, filled-out feud responses, and a generated
trivia bank) so you can play the live game instantly without rounding up real people or
even setting an API key.

---

## Scoring calibration

_(M8 — documented here once implemented.)_ Feud points are bounded by group size (1 to
N−1). Trivia point values are derived from the group's feud expected-value so that one
round's feud potential ≈ one round's trivia potential per team, and the two teams carry
equal total trivia value per round. The calibration constant is stored on the group and is
tunable.

---

## Deploy to Render

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, point it at the repo (it reads `render.yaml`).
3. Set the `sync: false` secrets in the Render dashboard:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL`.
4. Deploy. The build runs `npm install && npm run build`; the service starts with
   `npm run start`.

---

## Project structure

```
src/
  app/                 # routes (App Router)
  components/          # shared UI (Wordmark, SaysReveal, …)
  lib/
    brand.ts           # name, palette, tagline pool, saysLine()
    types.ts           # domain types (mirror of the schema)
    utils.ts           # cn(), join codes, shuffle/partition
    supabase/
      server.ts        # admin's authed SSR client (RLS applies)
      client.ts        # browser client for Realtime
      admin.ts         # service-role client (server-only)
    ai/
      anthropic.ts     # server-only AI plumbing + graceful fallbacks
supabase/
  migrations/          # SQL schema + RLS + realtime
```

---

## Phase 2 hooks (scaffolded, not built)

Clear extension points are marked with `PHASE 2` comments in code:

- **Illustrated avatars** — `members.avatar_seed` column; seed composed from how each
  person answered. Compose from a free SVG trait kit (no image-gen cost).
- **Team crests** — `teams.crest_seed` column; AI-generated crest from the team name.
- **Learning recommender** — feud recommendations that improve from this group's history
  (which questions were used/skipped). Hook in the feud recommender route.
- **Richer animations / sound / character reactions** — reveal components are isolated so
  they can be upgraded without touching game logic.

---

## Build status

Phase 1 milestones (see the in-repo task list):

- [x] M1 — Foundation (schema, clients, design system, landing)
- [ ] M2 — Admin auth
- [ ] M3 — Group creation wizard
- [ ] M4 — Seed/demo mode
- [ ] M5 — Captain topics + member fill-out
- [ ] M6 — Fresh-question guarantee
- [ ] M7 — Trivia bank
- [ ] M8 — Scoring calibration
- [ ] M9 — Live game loop
- [ ] M10 — Readiness + deploy/docs
```
