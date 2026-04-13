"use client";

import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";
import type { DrillConfidence, DrillLevel, DemoDrill } from "@/app/dashboard/demo-data";
import { playSound } from "@/lib/sounds";

type DrillCardPhase = "prompt" | "retry" | "result";

const LEVEL_BADGE: Record<DrillLevel, string> = {
  1: "bg-muted text-muted-foreground",
  2: "bg-accent/30 text-accent",
  3: "bg-accent/60 text-white",
  4: "bg-accent text-accent-foreground",
};

/** Render text with `backtick` spans as inline <code> elements */
function renderInlineCode(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="font-mono text-[0.9em] bg-card border border-border rounded px-1 py-0.5 text-accent">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Infer a return type hint from expectedCode */
function inferReturnHint(code: string): string | null {
  if (/\bCounter\(/.test(code)) return "→ Counter (dict-like)";
  if (/\bdefaultdict\(/.test(code)) return "→ defaultdict";
  if (/\bdict\(/.test(code) || /\bzip\(/.test(code) && /\bdict\(/.test(code)) return "→ dict";
  if (/\{[^}]*:/.test(code) && !/\bfor\b/.test(code.split("\n")[0] ?? "")) return "→ dict";
  if (/\{.*\bfor\b/.test(code)) return "→ dict / set (comprehension)";
  if (/\bset\(/.test(code)) return "→ set";
  if (/\bsorted\(/.test(code)) return "→ list";
  if (/\bTrue\b|\bFalse\b|\breturn\s+(True|False)/.test(code)) return "→ bool";
  if (/\.append\(/.test(code) || /\bresult\s*=\s*\[/.test(code)) return "→ list";
  if (/\bheapq\./.test(code)) return "→ heap (list)";
  if (/\bdeque\(/.test(code)) return "→ deque";
  return null;
}

/* ── Code normalization & tokenization ── */

function normalize(code: string): string {
  return code
    .split("\n")
    .map((line) => line.replace(/#.*$/, "").trimEnd())
    .filter((line) => line.trim() !== "")
    .join("\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenize(code: string): string[] {
  return normalize(code).split(/[\s()\[\]{},.:;=<>+\-*/%!&|^~@#]+/).filter(Boolean);
}

type MatchResult = {
  verdict: "correct" | "close" | "incorrect";
  similarity: number;
  confidence: DrillConfidence;
};

/**
 * Score user code against expected + alternatives.
 *
 * L1/L2: exact normalized match only — no fuzzy scoring.
 *   "Close but wrong" at atom level almost always means wrong concept.
 *
 * L3+: recall-biased coverage — intersection / expectedTokens.
 *   Does not punish extra tokens (variable name choices, preamble).
 *   Punishes missing expected tokens.
 *
 * Thresholds (L3+): ≥0.85 correct (conf 4), ≥0.75 good (conf 3),
 *   ≥0.65 hard (conf 2), <0.65 incorrect (conf 1).
 */
function checkCode(
  userCode: string,
  expectedCode: string,
  alternatives: string[] = [],
  level: DrillLevel = 4,
): MatchResult {
  const userNorm = normalize(userCode);
  const candidates = [expectedCode, ...alternatives];

  // Exact match — all levels
  for (const candidate of candidates) {
    if (normalize(candidate) === userNorm) {
      return { verdict: "correct", similarity: 1, confidence: 4 };
    }
  }

  // L1/L2: exact match only — if no exact match, it's incorrect
  if (level <= 2) {
    return { verdict: "incorrect", similarity: 0, confidence: 1 };
  }

  // L3+: recall-biased coverage
  const userTokens = new Set(tokenize(userCode));
  if (userTokens.size === 0) {
    return { verdict: "incorrect", similarity: 0, confidence: 1 };
  }

  let bestCoverage = 0;
  for (const candidate of candidates) {
    const expTokens = new Set(tokenize(candidate));
    if (expTokens.size === 0) continue;
    const intersectionCount = [...userTokens].filter((t) => expTokens.has(t)).length;
    const coverage = intersectionCount / expTokens.size;
    bestCoverage = Math.max(bestCoverage, coverage);
  }

  if (bestCoverage >= 0.85) return { verdict: "correct", similarity: bestCoverage, confidence: 4 };
  if (bestCoverage >= 0.75) return { verdict: "close", similarity: bestCoverage, confidence: 3 };
  if (bestCoverage >= 0.65) return { verdict: "close", similarity: bestCoverage, confidence: 2 };
  return { verdict: "incorrect", similarity: bestCoverage, confidence: 1 };
}

/** Fisher-Yates shuffle (returns new array) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const VERDICT_STYLES = {
  correct: { border: "border-green-500/40", bg: "bg-green-500/10", text: "text-green-500", label: "Correct!", icon: "✓" },
  close: { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-500", label: "Close — review the differences", icon: "≈" },
  incorrect: { border: "border-red-500/40", bg: "bg-red-500/10", text: "text-red-500", label: "Not quite — study the expected answer", icon: "✗" },
};

interface DrillCardProps {
  drill: DemoDrill;
  onRate: (confidence: DrillConfidence, userCode: string) => void;
  onPrevious?: () => void;
  muted?: boolean;
  autoContinue?: boolean;
  position?: number;
  total?: number;
}

export function DrillCard({ drill, onRate, onPrevious, muted = false, autoContinue = false, position, total }: DrillCardProps) {
  const [phase, setPhase] = useState<DrillCardPhase>("prompt");

  // Restore draft from sessionStorage on mount
  const [userCode, setUserCode] = useState(() => {
    try {
      return sessionStorage.getItem(`drill-draft-${drill.id}`) ?? "";
    } catch {
      return "";
    }
  });

  // Type-it mode: L1 starts in MC mode (typeitMode = false); L2+ start in textarea mode
  const [typeitMode, setTypeitMode] = useState<boolean>(drill.level !== 1);

  const [result, setResult] = useState<MatchResult | null>(null);

  // Retry flow state
  const [firstAttemptCode, setFirstAttemptCode] = useState<string | null>(null);
  const [retryCode, setRetryCode] = useState("");

  // Inline discard prompt (shown when Ctrl+. is pressed with dirty textarea)
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  // Verdict animation class — applied once on result entry, then cleared to allow re-trigger
  const [verdictAnimClass, setVerdictAnimClass] = useState("");
  const [textareaAnimClass, setTextareaAnimClass] = useState("");
  const autoContinueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shuffled MC options — stable per drill id
  const mcOptions = useMemo(
    () => shuffle([drill.expectedCode, ...(drill.alternatives ?? [])]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drill.id],
  );

  const handleCodeChange = useCallback(
    (value: string) => {
      setUserCode(value);
      setShowDiscardPrompt(false);
      try {
        if (value.trim()) {
          sessionStorage.setItem(`drill-draft-${drill.id}`, value);
        } else {
          sessionStorage.removeItem(`drill-draft-${drill.id}`);
        }
      } catch {
        // sessionStorage may be unavailable (SSR / private browsing edge case)
      }
    },
    [drill.id],
  );

  /** Shared transition into result phase: sets result, plays sound, triggers animations, starts auto-continue timer */
  const enterResult = useCallback(
    (match: MatchResult, code: string) => {
      setResult(match);
      setPhase("result");
      try { sessionStorage.removeItem(`drill-draft-${drill.id}`); } catch { /* ok */ }

      // Sound
      if (match.confidence === 4) playSound("correct", muted);
      else if (match.confidence >= 2) playSound("partial", muted);
      else playSound("wrong", muted);

      // Animations — set class, then clear after animation duration so it can re-trigger
      if (match.verdict === "correct") {
        setVerdictAnimClass("drill-anim-correct-glow");
        setTimeout(() => setVerdictAnimClass(""), 400);
      } else if (match.verdict === "close") {
        setVerdictAnimClass("drill-anim-partial");
        setTimeout(() => setVerdictAnimClass(""), 450);
      } else {
        setTextareaAnimClass("drill-anim-wrong-shake");
        setTimeout(() => setTextareaAnimClass(""), 260);
      }

      // Auto-continue: only on clean correct (conf 4), 800ms delay
      if (autoContinue && match.confidence === 4) {
        autoContinueTimerRef.current = setTimeout(() => {
          onRate(match.confidence, code);
        }, 800);
      }
    },
    [drill.id, muted, autoContinue, onRate],
  );

  /** First attempt submit (prompt phase) */
  const handleSubmit = useCallback(() => {
    const match = checkCode(userCode, drill.expectedCode, drill.alternatives ?? [], drill.level);

    if (match.confidence < 4) {
      // Below threshold — show retry flow
      setFirstAttemptCode(userCode);
      setRetryCode("");
      setResult(match);
      setPhase("retry");
      // Wrong sound on first failed attempt
      playSound(match.confidence >= 2 ? "partial" : "wrong", muted);
    } else {
      enterResult(match, userCode);
    }
  }, [userCode, drill, muted, enterResult]);

  /** MC option click (L1, MC path) */
  const handleMcClick = useCallback(
    (option: string) => {
      // All MC options are correct equivalents — clicking any confirms recognition
      const match = checkCode(option, drill.expectedCode, drill.alternatives ?? [], drill.level);
      setUserCode(option);
      enterResult(match, option);
    },
    [drill, enterResult],
  );

  /** Second attempt submit (retry phase) */
  const handleRetrySubmit = useCallback(() => {
    const match = checkCode(retryCode, drill.expectedCode, drill.alternatives ?? [], drill.level);
    // Second attempt: correct/close → cap at conf 2; wrong → conf 1
    const cappedConfidence: DrillConfidence = match.confidence >= 2 ? 2 : 1;
    const capped = { ...match, confidence: cappedConfidence };
    enterResult(capped, retryCode);
  }, [retryCode, drill, enterResult]);

  const handleNext = useCallback(() => {
    if (autoContinueTimerRef.current) {
      clearTimeout(autoContinueTimerRef.current);
      autoContinueTimerRef.current = null;
    }
    if (result) {
      onRate(result.confidence, userCode);
    }
  }, [result, userCode, onRate]);

  const verdict = result ? VERDICT_STYLES[result.verdict] : null;
  const isL1Mc = drill.level === 1 && !typeitMode;
  const returnHint = inferReturnHint(drill.expectedCode);

  // Tab → switch L1 from MC mode to type-it mode
  useEffect(() => {
    if (!isL1Mc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setTypeitMode(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isL1Mc]);

  // Keyboard shortcuts: Ctrl+. (advance) · Ctrl+, (previous)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inTextarea = target.tagName === "TEXTAREA";

      if (e.ctrlKey && !e.shiftKey && e.key === ".") {
        e.preventDefault();
        if (phase === "result" && result) {
          handleNext();
        } else if (phase === "prompt" && userCode.trim() && !inTextarea) {
          setShowDiscardPrompt(true);
        } else if (phase === "prompt" && !userCode.trim()) {
          // Empty textarea — skip with lowest confidence
          onRate(1, "");
        }
      }

      if (e.ctrlKey && !e.shiftKey && e.key === ",") {
        e.preventDefault();
        onPrevious?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [phase, result, userCode, handleNext, onRate, onPrevious]);

  return (
    <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${LEVEL_BADGE[drill.level]}`}>
            L{drill.level}
          </span>
          <span className="text-xs text-muted-foreground">{drill.category}</span>
        </div>
        {position != null && total != null && (
          <span className="text-xs text-muted-foreground tabular-nums">
            Drill {position}/{total}
          </span>
        )}
      </div>

      {/* Title & Prompt */}
      <div>
        <h3 className="text-sm font-medium text-foreground">{drill.title}</h3>
        <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
          {renderInlineCode(drill.prompt)}
        </p>
        {returnHint && (
          <p className="text-[11px] text-accent/70 font-mono mt-1">{returnHint}</p>
        )}
      </div>

      {/* ── PROMPT PHASE ── */}
      {phase === "prompt" && (
        <>
          {isL1Mc ? (
            /* L1 MC path */
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Select the correct code
              </p>
              <div className="grid gap-2">
                {mcOptions.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleMcClick(opt)}
                    className="w-full text-left rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground transition-colors hover:border-accent/50 hover:bg-accent/5"
                  >
                    <pre className="whitespace-pre-wrap">{opt}</pre>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tab to switch to free-type mode
              </p>
            </div>
          ) : (
            /* Free-type path (L2+ always, L1 after Tab) */
            <div>
              {drill.level === 1 && (
                <p className="text-[10px] text-accent/70 mb-1">Type-it mode</p>
              )}
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Your code</p>
              <textarea
                value={userCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Write your code here…"
                rows={5}
                autoFocus={drill.level !== 1}
                className={`w-full font-mono text-sm bg-card border border-border rounded-lg p-3 text-foreground placeholder:text-muted-foreground/50 resize-y focus:outline-none focus:border-accent/50 ${textareaAnimClass}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey && e.shiftKey) {
                    e.preventDefault();
                    if (userCode.trim()) handleSubmit();
                  }
                }}
              />
            </div>
          )}


          {/* Discard prompt */}
          {showDiscardPrompt && (
            <div className="rounded-md border border-border/50 bg-background px-3 py-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Discard draft and skip?</span>
              <button
                onClick={() => { onRate(1, ""); }}
                className="text-xs text-red-500 hover:text-red-400 font-medium"
              >
                Skip
              </button>
              <button
                onClick={() => setShowDiscardPrompt(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Submit button (type-it path only) */}
          {!isL1Mc && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={userCode.trim().length === 0}
                className="inline-flex h-8 items-center rounded-md bg-accent px-4 text-xs font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Check Answer
              </button>
              <span className="text-[10px] text-muted-foreground">Ctrl+Shift+Enter</span>
            </div>
          )}
        </>
      )}

      {/* ── RETRY PHASE — wrong code read-only above, fresh textarea below ── */}
      {phase === "retry" && (
        <div className="space-y-3">
          {/* First attempt — read-only, dimmed */}
          <div className="rounded-lg border border-border/50 bg-card/50 p-3 opacity-60">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Your attempt
            </p>
            <pre className="font-mono text-sm text-foreground/70 whitespace-pre-wrap">
              {firstAttemptCode}
            </pre>
          </div>

          {/* Fresh textarea */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Write it from scratch
            </p>
            <textarea
              value={retryCode}
              onChange={(e) => setRetryCode(e.target.value)}
              placeholder="Try again…"
              rows={5}
              autoFocus
              className="w-full font-mono text-sm bg-card border border-border rounded-lg p-3 text-foreground placeholder:text-muted-foreground/50 resize-y focus:outline-none focus:border-accent/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey && e.shiftKey) {
                  e.preventDefault();
                  if (retryCode.trim()) handleRetrySubmit();
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRetrySubmit}
              disabled={retryCode.trim().length === 0}
              className="inline-flex h-8 items-center rounded-md bg-accent px-4 text-xs font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Check Again
            </button>
            <span className="text-[10px] text-muted-foreground">Ctrl+Shift+Enter</span>
          </div>
        </div>
      )}

      {/* ── RESULT PHASE — verdict + expected + explanation + next ── */}
      {phase === "result" && result && verdict && (
        <div className="space-y-3">
          {/* Verdict banner — animated on entry */}
          <div className={`rounded-lg border ${verdict.border} ${verdict.bg} px-3 py-2 flex items-center gap-2 ${verdictAnimClass}`}>
            <span className={`text-lg font-bold ${verdict.text} ${result.verdict === "correct" ? "drill-anim-correct-pop" : ""}`}>
              {verdict.icon}
            </span>
            <span className={`text-sm font-medium ${verdict.text}`}>{verdict.label}</span>
            {result.verdict !== "correct" && result.similarity > 0 && (
              <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
                {Math.round(result.similarity * 100)}% match
              </span>
            )}
            {firstAttemptCode !== null && (
              <span className="text-[10px] text-muted-foreground ml-auto">2nd attempt</span>
            )}
            {autoContinue && result.confidence === 4 && (
              <span className="text-[10px] text-green-500/70 ml-auto">auto-advancing…</span>
            )}
          </div>

          {/* Expected code — always shown */}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Expected</p>
            <pre className="font-mono text-sm text-foreground whitespace-pre-wrap">{drill.expectedCode}</pre>
          </div>

          {/* Explanation */}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Why</p>
            <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
              {drill.explanation.split("\n\n").map((paragraph, i) => (
                <p key={i} className="whitespace-pre-wrap">{renderInlineCode(paragraph)}</p>
              ))}
            </div>
          </div>

          {/* Next button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleNext}
              className="inline-flex h-8 items-center rounded-md bg-accent px-4 text-xs font-medium text-accent-foreground transition-colors hover:opacity-90"
            >
              Next →
            </button>
            <span className="text-[10px] text-muted-foreground">
              Auto-rated:{" "}
              <span className={
                result.confidence === 4 ? "text-green-500 font-medium" :
                result.confidence === 3 ? "text-accent font-medium" :
                result.confidence === 2 ? "text-orange-500 font-medium" :
                "text-red-500 font-medium"
              }>
                {result.confidence === 4 ? "Easy" : result.confidence === 3 ? "Good" : result.confidence === 2 ? "Hard" : "Again"}
              </span>
              {" "}— SRS scheduling based on your accuracy
            </span>
          </div>

          {/* Navigation hint */}
          <p className="text-[10px] text-muted-foreground/60">Ctrl+. next · Ctrl+, previous</p>
        </div>
      )}
    </div>
  );
}
