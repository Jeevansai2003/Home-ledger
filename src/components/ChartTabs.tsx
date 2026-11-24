"use client";

import { useId, useState } from "react";

type Tab = { id: string; label: string; content: React.ReactNode };

// Small button group that switches between different views of the same data.
export default function ChartTabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const [active, setActive] = useState(tabs[0].id);
  const uid = useId();

  function move(from: number, step: number) {
    const next = (from + step + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    document.getElementById(`${uid}-tab-${tabs[next].id}`)?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="inline-flex rounded-lg bg-canvas p-1">
        {tabs.map((t, i) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") { e.preventDefault(); move(i, 1); }
                if (e.key === "ArrowLeft") { e.preventDefault(); move(i, -1); }
              }}
              className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${
                selected ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${uid}-panel-${t.id}`}
          aria-labelledby={`${uid}-tab-${t.id}`}
          hidden={active !== t.id}
          className="mt-4"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
