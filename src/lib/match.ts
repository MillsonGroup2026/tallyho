// ============================================================================
// Deterministic, generous answer matching.
//
// Runs instantly with no API key, so live gameplay never blocks. The AI Answer
// Normalizer (M5/M6) can wrap this with the same return contract for even more
// forgiving matching, falling back here when the API is slow or unavailable.
// ============================================================================

export function normalize(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (combining marks)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[m];
}

// Common nickname equivalences (extend freely). Symmetric lookups handled below.
const NICKNAMES: Record<string, string[]> = {
  nicholas: ["nick", "nik"],
  david: ["dave", "davey"],
  michael: ["mike", "mikey"],
  robert: ["rob", "bob", "bobby"],
  william: ["will", "bill", "billy"],
  elizabeth: ["liz", "beth", "lizzie", "eliza"],
  matthew: ["matt"],
  joseph: ["joe", "joey"],
  jonathan: ["jon", "jonny"],
  jordan: ["jord"],
  katherine: ["kate", "katie", "kathy"],
  margaret: ["maggie", "meg", "peggy"],
  priyanka: ["priya"],
  alexander: ["alex", "xander"],
  samuel: ["sam", "sammy"],
  benjamin: ["ben", "benny"],
  thomas: ["tom", "tommy"],
  charles: ["charlie", "chuck"],
};

function nicknameMatch(a: string, b: string): boolean {
  for (const [full, nicks] of Object.entries(NICKNAMES)) {
    const set = new Set([full, ...nicks]);
    if (set.has(a) && set.has(b)) return true;
  }
  return false;
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (nicknameMatch(a, b)) return true;
  const dist = levenshtein(a, b);
  const tol = a.length <= 4 ? 1 : a.length <= 7 ? 2 : 3;
  return dist <= tol;
}

/**
 * Match a free-text guess against candidate labels. Returns the matched
 * candidate (original casing) or null. Order of attempts: exact normalized →
 * containment → nickname/typo tolerance.
 */
export function fuzzyMatch(guess: string, candidates: string[]): string | null {
  const g = normalize(guess);
  if (!g) return null;

  for (const c of candidates) {
    if (normalize(c) === g) return c;
  }
  for (const c of candidates) {
    const nc = normalize(c);
    if (nc.length >= 3 && (nc.includes(g) || g.includes(nc))) return c;
  }
  let best: { c: string; d: number } | null = null;
  for (const c of candidates) {
    const nc = normalize(c);
    if (tokensMatch(g, nc)) {
      const d = levenshtein(g, nc);
      if (!best || d < best.d) best = { c, d };
    }
  }
  return best ? best.c : null;
}
