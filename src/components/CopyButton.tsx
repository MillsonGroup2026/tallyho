"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (e.g. insecure context) — select fallback could go here.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn("btn", copied ? "btn-secondary" : "btn-ghost", className)}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
