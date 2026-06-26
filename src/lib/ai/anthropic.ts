import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

/** Whether an API key is configured. Callers use this to decide whether to
 *  attempt AI generation or go straight to deterministic fallbacks. */
export function hasAI(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

interface GenerateArgs {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Ask the model for JSON and parse it. Returns null on any failure (no key,
 * API error, unparseable output) so every caller can fall back gracefully —
 * gameplay must never block on the AI.
 */
export async function generateJSON<T>(args: GenerateArgs): Promise<T | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const msg = await client.messages.create({
      model: AI_MODEL,
      max_tokens: args.maxTokens ?? 1500,
      temperature: args.temperature ?? 0.8,
      system: args.system,
      messages: [{ role: "user", content: args.prompt }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return extractJSON<T>(text);
  } catch (err) {
    console.error("[ai] generateJSON failed:", err);
    return null;
  }
}

/** Plain-text generation with the same graceful-failure contract. */
export async function generateText(args: GenerateArgs): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const msg = await client.messages.create({
      model: AI_MODEL,
      max_tokens: args.maxTokens ?? 400,
      temperature: args.temperature ?? 0.9,
      system: args.system,
      messages: [{ role: "user", content: args.prompt }],
    });
    return msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  } catch (err) {
    console.error("[ai] generateText failed:", err);
    return null;
  }
}

/** Tolerant JSON extraction: strips code fences and slices the outer braces. */
function extractJSON<T>(text: string): T | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
