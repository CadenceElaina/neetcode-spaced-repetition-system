"use client";

import { useState } from "react";
import type { Cheatsheet } from "@/lib/cheatsheets";
import { CheatsheetExpanded } from "@/app/cheatsheets/cheatsheets-client";

export function PatternCard({ sheet }: { sheet: Cheatsheet }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pattern</span>
          <span className="text-sm font-medium text-foreground">{sheet.category}</span>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border/40">
          <CheatsheetExpanded sheet={sheet} />
        </div>
      )}
    </div>
  );
}
