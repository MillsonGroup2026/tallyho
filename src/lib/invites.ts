import { BRAND } from "@/lib/brand";
import type { Group } from "@/lib/types";

export function joinLink(group: Pick<Group, "join_code">, appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/join?code=${group.join_code}`;
}

/** Copy-paste message for regular members. */
export function memberInvite(
  group: Pick<Group, "name" | "join_code">,
  appUrl: string,
): string {
  const link = joinLink(group, appUrl);
  return [
    `🎤 You're invited to ${group.name}'s game of ${BRAND.name}!`,
    ``,
    `Tap the link, pick your name, and answer a few quick questions about the group. It takes ~3 minutes — don't overthink it.`,
    ``,
    link,
    `Group code: ${group.join_code}`,
  ].join("\n");
}

/** Copy-paste message for team captains (topic-picking + their own answers). */
export function captainInvite(
  group: Pick<Group, "name" | "join_code">,
  appUrl: string,
): string {
  const link = joinLink(group, appUrl);
  return [
    `🎖️ You're a TEAM CAPTAIN for ${group.name}'s game of ${BRAND.name}!`,
    ``,
    `Two jobs:`,
    `  1) Pick your team's 5 trivia topics`,
    `  2) Answer your feud questions like everyone else`,
    ``,
    `Tap the link, pick your name, and you'll see your captain tasks:`,
    ``,
    link,
    `Group code: ${group.join_code}`,
  ].join("\n");
}
