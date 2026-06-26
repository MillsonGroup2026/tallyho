import { clsx, type ClassValue } from "clsx";

/** Conditional className helper. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// Human-friendly join codes — no ambiguous characters (0/O, 1/I/L).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Split a list into `n` roughly-equal groups (used for random team assignment). */
export function partition<T>(arr: readonly T[], n: number): T[][] {
  const buckets: T[][] = Array.from({ length: n }, () => []);
  arr.forEach((item, i) => buckets[i % n].push(item));
  return buckets;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
