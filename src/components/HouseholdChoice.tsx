"use client";

import { useState } from "react";

const modes = [
  { value: "new", label: "Start a new one" },
  { value: "join", label: "Join with a code" },
] as const;

export default function HouseholdChoice() {
  const [mode, setMode] = useState<"new" | "join">("new");

  return (
    <fieldset className="space-y-3">
      <legend className="field-label">Your household</legend>

      <div role="radiogroup" aria-label="Household option" className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1">
        {modes.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={`h-9 rounded-md text-sm font-medium transition-colors ${
              mode === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "new" ? (
        <div>
          <label htmlFor="householdName" className="field-label">Household name</label>
          <input
            id="householdName"
            name="householdName"
            className="input"
            placeholder="e.g. Sharma family"
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-muted">
            Optional. We will set up a Cash account and the common categories for you.
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="inviteCode" className="field-label">Invite code</label>
          <input
            id="inviteCode"
            name="inviteCode"
            required
            className="input font-mono"
            placeholder="Paste the code from the owner"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="mt-1.5 text-xs text-muted">
            The household owner can copy it from their Overview page.
          </p>
        </div>
      )}
    </fieldset>
  );
}