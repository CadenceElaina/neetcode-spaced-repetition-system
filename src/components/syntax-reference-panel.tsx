"use client";

import { useState, useCallback } from "react";
import { CodeEditor } from "@/components/code-editor";
import { getPyodide } from "@/lib/pyodide";
import { SYNTAX_ENTRIES, type SyntaxEntry } from "@/components/syntax-entries";

export type { SyntaxEntry };

const ALL_CATEGORIES = [...new Set(SYNTAX_ENTRIES.map((e) => e.category))];

// O(1) lookup by id
const ENTRY_MAP = new Map(SYNTAX_ENTRIES.map((e) => [e.id, e]));

// Token index: each identifier token extracted from entry.name → first matching entry
// Tokens shorter than 3 chars are skipped to avoid matching noise like "in", "or", etc.
const ENTRY_TOKENS = new Map<string, SyntaxEntry>();
for (const entry of SYNTAX_ENTRIES) {
  const identifiers =
    entry.name.match(/[a-zA-Z_][a-zA-Z0-9_]*/g)?.filter((t) => t.length >= 3) ?? [];
  for (const tok of identifiers) {
    const key = tok.toLowerCase();
    if (!ENTRY_TOKENS.has(key)) ENTRY_TOKENS.set(key, entry);
  }
}

/**
 * Scan an entry's code content for Python identifiers that match other entries
 * by name token. Returns deduplicated list, excluding the entry itself.
 */
function detectMentionedEntries(entry: SyntaxEntry): SyntaxEntry[] {
  const codeText = [entry.syntax, entry.example, ...(entry.variants ?? [])].join("\n");
  const identifiers = new Set(
    (codeText.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []).map((t) => t.toLowerCase()),
  );
  const found = new Map<string, SyntaxEntry>();
  for (const id of identifiers) {
    const match = ENTRY_TOKENS.get(id);
    if (match && match.id !== entry.id) found.set(match.id, match);
  }
  return [...found.values()];
}

export function SyntaxReferencePanel() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Navigation — openId is current expanded entry; navHistory is the back-stack of IDs
  const [openId, setOpenId] = useState<string | null>(null);
  const [navHistory, setNavHistory] = useState<string[]>([]);

  // Variant cycling: per-entry index
  const [variantIdx, setVariantIdx] = useState<Record<string, number>>({});

  // Scratch pad state: per-entry
  const [scratchCode, setScratchCode] = useState<Record<string, string>>({});
  const [scratchOutput, setScratchOutput] = useState<Record<string, string | null>>({});
  const [scratchRunning, setScratchRunning] = useState<Record<string, boolean>>({});
  const [scratchError, setScratchError] = useState<Record<string, boolean>>({});

  /** Navigate to an entry via a cross-link — pushes current to history */
  const navigateTo = useCallback((id: string) => {
    setOpenId((prev) => {
      if (prev !== null) setNavHistory((h) => [...h, prev]);
      return id;
    });
    setQuery("");
    setActiveCategory(null);
  }, []);

  /** Toggle expand/collapse via header click — resets navigation history */
  const toggleEntry = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
    setNavHistory([]);
  }, []);

  /** Go back one step in navigation history */
  const goBack = useCallback(() => {
    setNavHistory((h) => {
      const prev = h[h.length - 1] ?? null;
      setOpenId(prev);
      return h.slice(0, -1);
    });
  }, []);

  /** Jump back to the first entry in the navigation chain */
  const goToStart = useCallback(() => {
    setNavHistory((h) => {
      setOpenId(h[0] ?? null);
      return [];
    });
  }, []);

  const cycleVariant = useCallback((entryId: string, dir: 1 | -1) => {
    setVariantIdx((prev) => {
      const entry = ENTRY_MAP.get(entryId);
      const len = entry?.variants?.length ?? 0;
      if (len === 0) return prev;
      const cur = prev[entryId] ?? 0;
      return { ...prev, [entryId]: (cur + dir + len) % len };
    });
  }, []);

  const runScratch = useCallback(
    async (entryId: string) => {
      const code = scratchCode[entryId] ?? "";
      if (!code.trim()) return;
      const pyodide = getPyodide();
      if (!pyodide.isReady()) return;
      setScratchRunning((r) => ({ ...r, [entryId]: true }));
      setScratchOutput((o) => ({ ...o, [entryId]: null }));
      setScratchError((e) => ({ ...e, [entryId]: false }));
      try {
        const out = await pyodide.runCode(code);
        setScratchOutput((o) => ({ ...o, [entryId]: out }));
        setScratchError((e) => ({ ...e, [entryId]: false }));
      } catch (err) {
        setScratchOutput((o) => ({
          ...o,
          [entryId]: err instanceof Error ? err.message : String(err),
        }));
        setScratchError((e) => ({ ...e, [entryId]: true }));
      } finally {
        setScratchRunning((r) => ({ ...r, [entryId]: false }));
      }
    },
    [scratchCode],
  );

  const filtered = SYNTAX_ENTRIES.filter((e) => {
    const matchesQuery =
      !query ||
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.summary.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !activeCategory || e.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  // If openId is set but filtered out, still show it at top (navigation overrides filter)
  const openEntry = openId ? ENTRY_MAP.get(openId) : null;
  const openIsFiltered = openEntry ? filtered.some((e) => e.id === openId) : false;
  const entriesToShow = openEntry && !openIsFiltered ? [openEntry, ...filtered] : filtered;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Search + filter (non-sticky, stays in flex flow) ── */}
      <div className="shrink-0 border-b border-border/50 pb-3 space-y-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search syntax… (e.g. defaultdict, heapq)"
          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50"
        />

        {ALL_CATEGORIES.length > 1 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium transition-colors ${
                activeCategory === null
                  ? "bg-accent/20 text-accent"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-accent/20 text-accent"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Back navigation (shown when navigating via cross-links) ── */}
      {navHistory.length > 0 && (
        <div className="shrink-0 flex items-center gap-2 mb-2">
          <button
            onClick={goBack}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← back to {ENTRY_MAP.get(navHistory[navHistory.length - 1]!)?.name ?? "…"}
          </button>
          {navHistory.length > 1 && (
            <button
              onClick={goToStart}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ↩ start ({ENTRY_MAP.get(navHistory[0]!)?.name ?? "…"})
            </button>
          )}
        </div>
      )}

      {/* ── Entry count ── */}
      <p className="shrink-0 text-[10px] text-muted-foreground mb-2">
        {entriesToShow.length} {entriesToShow.length === 1 ? "entry" : "entries"}
      </p>

      {/* ── Scrollable entries list ── */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
        {entriesToShow.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            No matches for &quot;{query}&quot;
          </p>
        )}

        {entriesToShow.map((entry) => {
          const isOpen = openId === entry.id;
          const variants = entry.variants ?? [];
          const vIdx = variantIdx[entry.id] ?? 0;
          const currentVariant = variants[vIdx] ?? "";

          // Auto-detect entries mentioned in this card's code content
          const mentioned = isOpen ? detectMentionedEntries(entry) : [];

          return (
            <div
              key={entry.id}
              className={`rounded-lg border bg-card overflow-hidden transition-colors shrink-0 ${
                isOpen ? "border-accent/30" : "border-border"
              }`}
            >
              {/* Entry header */}
              <button
                onClick={() => toggleEntry(entry.id)}
                className="w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-accent/5 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {entry.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
                      {entry.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {entry.summary}
                  </p>
                </div>
                <span className="text-muted-foreground/50 text-xs shrink-0 mt-0.5">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="border-t border-border/50 px-3 py-3 space-y-4">

                  {/* Syntax */}
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Syntax
                    </p>
                    <CodeEditor value={entry.syntax} onChange={() => {}} readOnly minHeight="auto" />
                  </div>

                  {/* Variants — single card with cycle buttons */}
                  {variants.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Variant
                        </p>
                        {variants.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => cycleVariant(entry.id, -1)}
                              className="inline-flex h-5 w-5 items-center justify-center rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors"
                            >
                              ←
                            </button>
                            <span className="text-[10px] text-muted-foreground tabular-nums min-w-[2.5rem] text-center">
                              {vIdx + 1} / {variants.length}
                            </span>
                            <button
                              onClick={() => cycleVariant(entry.id, 1)}
                              className="inline-flex h-5 w-5 items-center justify-center rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors"
                            >
                              →
                            </button>
                          </div>
                        )}
                      </div>
                      <code className="block font-mono text-xs text-accent/80 bg-muted rounded-md px-3 py-2 whitespace-pre">
                        {currentVariant}
                      </code>
                    </div>
                  )}

                  {/* Example */}
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Example
                    </p>
                    <CodeEditor value={entry.example} onChange={() => {}} readOnly minHeight="auto" />
                  </div>

                  {/* Auto-detected cross-links: other entries mentioned in this card's code */}
                  {mentioned.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                        In this card
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {mentioned.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => navigateTo(m.id)}
                            className="inline-flex h-6 items-center rounded-md border border-accent/30 bg-accent/10 px-2 text-[10px] font-medium text-accent hover:bg-accent/20 transition-colors"
                          >
                            {m.name} →
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scratch pad */}
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Scratch pad
                    </p>
                    <CodeEditor
                      value={scratchCode[entry.id] ?? ""}
                      onChange={(val) =>
                        setScratchCode((prev) => ({ ...prev, [entry.id]: val }))
                      }
                      placeholder="Try it here…"
                      minHeight="80px"
                      onSubmit={() => runScratch(entry.id)}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => runScratch(entry.id)}
                        disabled={
                          !getPyodide().isReady() ||
                          scratchRunning[entry.id] ||
                          !scratchCode[entry.id]?.trim()
                        }
                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {scratchRunning[entry.id]
                          ? "Running…"
                          : !getPyodide().isReady()
                          ? "Loading…"
                          : "▶ Run"}
                      </button>
                      {scratchOutput[entry.id] !== null &&
                        scratchOutput[entry.id] !== undefined && (
                          <button
                            onClick={() =>
                              setScratchOutput((o) => ({ ...o, [entry.id]: null }))
                            }
                            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                          >
                            clear
                          </button>
                        )}
                      <span className="text-[10px] text-muted-foreground/40">
                        Ctrl+Shift+Enter
                      </span>
                    </div>

                    {/* Output */}
                    {scratchOutput[entry.id] !== null &&
                      scratchOutput[entry.id] !== undefined && (
                        <div className="mt-2 rounded-md border border-border bg-muted p-3">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Output
                          </p>
                          <pre
                            className={`font-mono text-xs whitespace-pre-wrap ${
                              scratchError[entry.id] ? "text-red-400" : "text-foreground/70"
                            }`}
                          >
                            {scratchOutput[entry.id] || (
                              <span className="text-muted-foreground/40 italic">no output</span>
                            )}
                          </pre>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
