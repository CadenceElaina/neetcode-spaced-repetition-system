"use client";

import { useState } from "react";
import type { Cheatsheet } from "@/lib/cheatsheets";

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border/40 bg-muted/50 p-3 text-xs leading-relaxed text-foreground/90">
      <code>{code}</code>
    </pre>
  );
}

export function CheatsheetExpanded({ sheet }: { sheet: Cheatsheet }) {
  const [showTemplate, setShowTemplate] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);

  return (
    <div className="space-y-4 px-4 pb-5 pt-3">
      {/* Key idea — most important, shown first */}
      <div className="rounded-md border border-accent/20 bg-accent/8 px-4 py-3">
        <p className="text-sm leading-relaxed text-foreground">{sheet.keyIdea}</p>
      </div>

      {/* Recognize it when */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recognize it when</p>
        <ul className="space-y-1.5">
          {sheet.triggers.map((t, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-foreground/85">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Watch out — elevated above template */}
      <div className="rounded-md border border-amber-500/20 bg-amber-500/8 px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-400">Watch out</p>
        <ul className="space-y-1.5">
          {sheet.watchOut.map((w, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground/80">
              <span className="mt-0.5 shrink-0 text-amber-400">⚠</span>
              {w}
            </li>
          ))}
        </ul>
      </div>

      {/* Template — hidden by default; reveal after recall attempt */}
      <div>
        <button
          onClick={() => setShowTemplate((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-accent hover:underline"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={`transition-transform ${showTemplate ? "rotate-90" : ""}`}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {showTemplate ? "Hide template" : "Show template"}
        </button>
        {showTemplate && (
          <div className="mt-2 space-y-3">
            {sheet.templates.map((t, i) => (
              <div key={i}>
                {sheet.templates.length > 1 && (
                  <p className="mb-1 text-xs text-muted-foreground">{t.label}</p>
                )}
                <CodeBlock code={t.code} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secondary — variants, complexity, canonical; collapsed by default */}
      <div>
        <button
          onClick={() => setShowSecondary((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={`transition-transform ${showSecondary ? "rotate-90" : ""}`}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {showSecondary ? "Less detail" : "Variants · Complexity · Examples"}
        </button>
        {showSecondary && (
          <div className="mt-3 space-y-4">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Variants</p>
              <ul className="space-y-1">
                {sheet.variants.map((v, i) => (
                  <li key={i} className="flex gap-2 text-xs text-foreground/80">
                    <span className="mt-0.5 shrink-0 text-accent">·</span>
                    {v}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Complexity</p>
                <p className="font-mono text-xs text-foreground">{sheet.complexity}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Canonical</p>
                <ul className="space-y-0.5">
                  {sheet.canonicalProblems.map((p, i) => (
                    <li key={i} className="text-xs text-foreground/80">
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-1 text-muted-foreground">— {p.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CheatsheetCard({ sheet }: { sheet: Cheatsheet }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/60 bg-background overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/20 transition-colors"
      >
        <span className="font-medium text-foreground">{sheet.category}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && <CheatsheetExpanded sheet={sheet} />}
    </div>
  );
}

export function CheatsheetClient({ sheets }: { sheets: Cheatsheet[] }) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? sheets.filter((s) =>
        s.category.toLowerCase().includes(search.toLowerCase()) ||
        s.triggers.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
        s.keyIdea.toLowerCase().includes(search.toLowerCase())
      )
    : sheets;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Cheatsheets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pattern reference for all {sheets.length} categories — click any to expand.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search patterns or triggers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
      />

      <div className="space-y-2">
        {filtered.map((sheet) => (
          <CheatsheetCard key={sheet.category} sheet={sheet} />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No cheatsheets match &ldquo;{search}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}
