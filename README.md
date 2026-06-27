# Tallyho 🎤

**A Family-Feud-style party game built around your own crew.** Instead of "Survey
says…", every reveal lands as **"_[Group Name]_ says…"** — for a group called
_Mile High_, the host screen shouts **"Mile High says…"**. That dynamic naming is
the one fixed brand element; everything else is Tallyho's own spin.

- **Live:** https://tallyho-b24j.onrender.com
- **Two streams of play:** a **Feud** round (guess what your group collectively
  said about each other) and a **Team Trivia** round (topics your captains pick).

---

## How it plays

1. **Host** creates a group, adds the roster, picks a vibe + a "good to know" note.
2. Tallyho generates a **private portal** with a share code. Members answer feud
   questions from their phones; captains pick 5 trivia topics. (Self-service
   fill-out is **Phase 1 remaining** — see status below. The **demo** seeds all
   of this instantly.)
3. **Host** mirrors their phone to the TV and runs the live game on one device:
   alternating teams, a 25s feud guess per player, a 3.5-min trivia question per
   team, calibrated scoring, and the **"[Group] says…"** reveal with the full
   vote breakdown.

### The fresh-question guarantee
Each player faces a feud question **they personally didn't answer** but the rest
of the group did — so there's a real tally to guess against. We over-generate
questions (`M = ceil(N*1.5) + 3`), hold one out per member, and filter out
low-consensus questions (top answer must hold ≥ ⅓ of the votes).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (custom design tokens in `globals.css`) |
| DB / Auth / Realtime | Supabase (Postgres, RLS, Realtime) |
| AI | Anthropic API (`claude-sonnet-4-6`), **server-side only**, with deterministic fallbacks |
| Hosting | Render (web service, auto-deploy from `main`) |

**Security model:** Members/captains never authenticate. RLS lets only the admin
(`created_by = auth.uid()`) touch their data directly. Member/captain devices hit
server route handlers that validate the `join_code` and act via the service-role
key. The Anthropic key and service-role key are server-only (no `NEXT_PUBLIC_`).

---

## Local development

```bash
git clone https://github.com/MillsonGroup2026/tallyho
cd tallyho
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

| Var | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | safe to expose (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | bypasses RLS — never expose |
| `ANTHROPIC_API_KEY` | **server only** | optional; app uses deterministic fallbacks if absent |
| `ANTHROPIC_MODEL` | server | defaults to `claude-sonnet-4-6` |
| `NEXT_PUBLIC_APP_URL` | client + server | builds invite links |

### Database setup
Run `supabase/migrations/0001_init.sql` against your Supabase project — in the
**SQL Editor**, via `supabase db push`, or the Management API. It creates 11
tables, RLS policies on all of them, and adds the live tables to the
`supabase_realtime` publication. For frictionless signup, enable **auto-confirm**
in Auth settings (already on for the hosted project).

### Try it instantly
Sign up, then click **"Spin up a demo group"** — it seeds a complete, filled-out
group (_Mile High_: 9 members, 2 teams, captains, feud questions + responses, a
balanced trivia bank) with **no API key required**, so you can host a full game
immediately.

---

## Deploy (Render)

The hosted service (free plan, region `oregon`) builds from this repo's `main`
with `npm install && npm run build` / `npm run start` and auto-deploys on push.
`render.yaml` is included as a Blueprint. Set the env vars above in the Render
dashboard — the `NEXT_PUBLIC_*` ones are baked at **build** time, so changing them
requires a rebuild (clear cache).

---

## Scoring calibration

Feud points are bounded by group size: an answer is worth the number of members
who gave it (`1…N-1`). To keep trivia balanced against feud, we derive a
**calibration constant** from the group's own answer distributions rather than
hard-coding difficulty:

```
constant ≈ average top-bucket size across usable feud questions   (floor 2)
trivia point value = constant   → uniform, so both teams' per-round totals are equal
```

One round's feud potential ≈ its trivia potential per team. The constant is
stored on `groups.calibration_constant` and is tunable. See `src/lib/scoring.ts`.

---

## Phase 1 status

| Area | State |
|---|---|
| Foundation, design system, schema | ✅ |
| Admin auth | ✅ |
| Group creation wizard + portal | ✅ |
| Seed/demo mode (offline) | ✅ |
| **Live game loop** (feud + trivia, reveals, scoreboard, pause/resume, timers) | ✅ |
| Self-service captain topics + member fill-out + realtime dashboard | ⏳ |
| AI engines (recommender, topic suggester, trivia generator, normalizer, clusterer, taglines) | ⏳ |
| Live fresh-question pipeline (consensus filter, holdout assignment, top-up) | ⏳ (logic exists; drives the seed today) |

The **playable vertical slice is live**: create/seed a group → host → full round
of feud + trivia with scoring and the "[Group] says…" reveals.

---

## Phase 2 hook locations

Phase 2 is scaffolded, not built. Clear extension points:

- **Illustrated avatars / team crests** — `members.avatar_seed` and
  `teams.crest_seed` columns are ready; seed them from how each person answered.
- **AI engines** — `src/lib/ai/anthropic.ts` exposes `generateJSON` /
  `generateText` with graceful fallbacks; each engine is a thin server module.
- **Answer matching** — `src/lib/match.ts` (deterministic) is the fallback the
  AI Answer Normalizer wraps with the same return contract.
- **Learning recommender** — feud history lives in `feud_questions` /
  `feud_responses`; rank future recommendations from what's been used/skipped.
- **DB types** — regenerate `src/lib/types.ts` via
  `supabase gen types typescript`.
