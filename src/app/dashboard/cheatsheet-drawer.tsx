"use client";

import { useState } from "react";
import type { Cheatsheet } from "@/lib/cheatsheets";
import { CheatsheetExpanded } from "@/app/cheatsheets/cheatsheets-client";

export function InlinePatternPanel({
  sheets,
  onClose,
  reviewCount,
}: {
  sheets: Cheatsheet[];
  onClose: () => void;
  reviewCount?: number;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = sheets[Math.min(activeIdx, sheets.length - 1)] ?? sheets[0];
  if (!active) return null;

  return (
    <div className="relative z-10 flex flex-col h-full rounded-lg border border-border bg-muted overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 shrink-0">
        <div>
          <p className="text-sm font-semibold text-foreground">{active.category}</p>
          <p className="text-[11px] text-muted-foreground">
            Glance before attempting · then solve from memory
            {reviewCount != null && reviewCount > 0 && (
              <span className="ml-2 text-muted-foreground/60">{reviewCount} left</span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Back to stats"
          title="Back to stats"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tab strip — only when multiple categories */}
      {sheets.length > 1 && (
        <div className="flex gap-1 border-b border-border/60 px-3 py-2 shrink-0 overflow-x-auto scrollbar-none">
          {sheets.map((s, i) => (
            <button
              key={s.category}
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 rounded px-2.5 py-1 text-xs transition-colors ${
                i === activeIdx
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              }`}
            >
              {s.category}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <CheatsheetExpanded sheet={active} />
      </div>
    </div>
  );
}
