"use client";

import { useState } from "react";
import { SaysReveal } from "./SaysReveal";

const EXAMPLES = ["Mile High", "The Cousins", "Sales Team", "Book Club", "Camp Crew"];

/** Interactive hero demo — type a group name, feel the reveal. */
export function RevealDemo() {
  const [name, setName] = useState("Mile High");

  return (
    <div className="card w-full max-w-xl p-6 sm:p-8">
      <p className="label mb-2">Try it — type your group&apos;s name</p>
      <input
        className="input mb-6"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Mile High"
        maxLength={28}
        aria-label="Group name"
      />
      <div className="flex min-h-[92px] items-center">
        <SaysReveal groupName={name} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setName(ex)}
            className="chip hover:bg-white/15"
            type="button"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
