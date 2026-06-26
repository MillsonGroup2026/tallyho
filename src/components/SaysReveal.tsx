"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

/**
 * The signature beat: "<Group Name> says…". Re-runs its slam animation whenever
 * the group name changes. Reused on the landing demo and on every live reveal.
 */
export function SaysReveal({
  groupName,
  className,
  size = "lg",
}: {
  groupName: string;
  className?: string;
  size?: "md" | "lg" | "xl";
}) {
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => setAnimKey((k) => k + 1), [groupName]);

  const sizeCls =
    size === "xl"
      ? "text-5xl sm:text-7xl"
      : size === "md"
        ? "text-2xl sm:text-3xl"
        : "text-4xl sm:text-6xl";

  const g = groupName?.trim() || "The group";

  return (
    <div
      key={animKey}
      className={cn("animate-slam font-display font-black leading-tight", sizeCls, className)}
    >
      <span className="text-magenta text-glow">{g}</span>
      <span className="text-cream"> {BRAND.revealVerb}…</span>
    </div>
  );
}
