// ============================================================================
// Says Who?  —  brand + creative voice
//
// The ONE fixed brand element is the reveal mechanic: every reveal says
// "<Group Name> says…". Everything else here is our spin and can be tuned.
// To rename the whole game, change BRAND.name (and the wordmark in
// components/Wordmark.tsx).
// ============================================================================

export const BRAND = {
  name: "Tallyho",
  tagline: "Round up your crew and tally the truth.",
  // The fixed mechanic. Reveal copy is built from this everywhere.
  revealVerb: "says",
  // Celebratory shout used on big reveals.
  cheer: "Tally-ho!",
  hostVoice:
    "Cheeky, hype, and warm — a game-show host who's also clearly one of the group.",
} as const;

/** The signature reveal line, e.g. saysLine("Mile High") -> "Mile High says…" */
export function saysLine(groupName: string): string {
  const g = (groupName ?? "").trim() || "The group";
  return `${g} ${BRAND.revealVerb}…`;
}

/** Palette mirror of globals.css, for places that need the hex in JS (SVG, etc.) */
export const PALETTE = {
  ink: "#0B1026",
  inkSoft: "#141A36",
  magenta: "#FF2E88",
  cyan: "#22D3EE",
  gold: "#FFC53D",
  green: "#34D399",
  cream: "#FBF7EF",
} as const;

// ---------------------------------------------------------------------------
// Cached host-voice taglines. The AI tagline generator (M-pool, server-side)
// can top these up at setup time, but gameplay NEVER blocks on a live call —
// we always fall back to this pool.
// ---------------------------------------------------------------------------
export const TAGLINES = {
  feudBigHit: [
    "Tally-ho — the people have spoken!",
    "Big board, big feelings.",
    "You read that room like a book.",
    "That's a top-shelf answer.",
    "The hive mind salutes you.",
  ],
  feudSmallHit: [
    "Hey — points are points.",
    "A vote's a vote.",
    "Scrappy. We respect it.",
    "You found the lone wolf.",
  ],
  feudMiss: [
    "Don't shoot the messenger.",
    "Bold. Wrong, but bold.",
    "Not one single soul agreed. Iconic.",
    "We'll pretend that didn't happen.",
  ],
  triviaRight: [
    "Captain knows things.",
    "Lock it in — that's correct!",
    "Big brain energy.",
    "Textbook. Literally.",
  ],
  triviaWrong: [
    "So close you could taste it.",
    "The board says no.",
    "Not today, captain.",
    "File that one under 'nice try'.",
  ],
  roundFlip: [
    "Switch it up — other team's turn.",
    "New team, who dis.",
    "Fresh faces, same chaos.",
  ],
} as const;

export type TaglineBucket = keyof typeof TAGLINES;

/** Pick a tagline. Pass a seed for deterministic choice (e.g. by question id). */
export function pickTagline(bucket: TaglineBucket, seed?: number): string {
  const pool = TAGLINES[bucket];
  const i =
    seed === undefined
      ? Math.floor(Math.random() * pool.length)
      : Math.abs(seed) % pool.length;
  return pool[i];
}

export const CATEGORY_LABELS: Record<string, string> = {
  family: "Family",
  work: "Work / coworkers",
  travel: "Travel crew",
  church: "Church group",
  friends: "Friends",
  general: "General",
  custom: "Custom",
};
