"use client";

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { DrillConfidence, DrillLevel, DrillTestCase, DemoDrill } from "@/app/dashboard/demo-data";
import { playSound } from "@/lib/sounds";
import { getPyodide, passRateToConfidence, type TestCaseResult } from "@/lib/pyodide";
import { CodeEditor } from "@/components/code-editor";

type DrillCardPhase = "prompt" | "retry" | "result" | "self-rate" | "running-tests";

const LEVEL_BADGE: Record<DrillLevel, string> = {
  1: "bg-muted text-muted-foreground",
  2: "bg-accent/30 text-accent",
  3: "bg-accent/60 text-white",
  4: "bg-accent text-accent-foreground",
  5: "bg-purple-600 text-white",
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
  if (/\bdict\(/.test(code) || (/\bzip\(/.test(code) && /\bdict\(/.test(code))) return "→ dict";
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

const VERDICT_STYLES = {
  correct:   { border: "border-green-500/40", bg: "bg-green-500/10", text: "text-green-500", label: "Correct!", icon: "✓" },
  close:     { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-500", label: "Close — review the differences", icon: "≈" },
  incorrect: { border: "border-red-500/40",   bg: "bg-red-500/10",   text: "text-red-500",   label: "Not quite — study the expected answer", icon: "✗" },
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

  const [result, setResult] = useState<MatchResult | null>(null);

  // Retry flow state
  const [firstAttemptCode, setFirstAttemptCode] = useState<string | null>(null);
  const [retryCode, setRetryCode] = useState("");

  // Inline discard prompt (shown when Ctrl+. is pressed with dirty editor)
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  // Result phase: toggle between user code and expected code
  const [showUserCode, setShowUserCode] = useState(false);

  // Verdict animation — applied to verdict banner on result entry
  const [verdictAnimClass, setVerdictAnimClass] = useState("");
  // Editor shake animation — wraps CodeEditor on wrong answer in prompt phase
  const [editorAnimClass, setEditorAnimClass] = useState("");
  const autoContinueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup all pending timers on unmount
  useEffect(() => {
    return () => {
      if (autoContinueTimerRef.current) clearTimeout(autoContinueTimerRef.current);
      animTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // L5 Pyodide test results
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);

  // Run button state (scratch code execution)
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [runError, setRunError] = useState(false);
  const [runLoading, setRunLoading] = useState(false);

  const returnHint = inferReturnHint(drill.expectedCode);

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
      animTimersRef.current.forEach(clearTimeout);
      animTimersRef.current = [];
      if (match.verdict === "correct") {
        setVerdictAnimClass("drill-anim-correct-glow");
        animTimersRef.current.push(setTimeout(() => setVerdictAnimClass(""), 400));
      } else if (match.verdict === "close") {
        setVerdictAnimClass("drill-anim-partial");
        animTimersRef.current.push(setTimeout(() => setVerdictAnimClass(""), 450));
      } else {
        setEditorAnimClass("drill-anim-wrong-shake");
        animTimersRef.current.push(setTimeout(() => setEditorAnimClass(""), 260));
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

  /** Run user code via Pyodide (scratch execution, not grading) */
  const handleRun = useCallback(async () => {
    const pyodide = getPyodide();
    if (!pyodide.isReady() || !userCode.trim()) return;
    setRunLoading(true);
    setRunOutput(null);
    setRunError(false);
    try {
      const output = await pyodide.runCode(userCode);
      setRunOutput(output);
      setRunError(false);
    } catch (err) {
      setRunOutput(err instanceof Error ? err.message : String(err));
      setRunError(true);
    } finally {
      setRunLoading(false);
    }
  }, [userCode]);

  /** First attempt submit */
  const handleSubmit = useCallback(() => {
    // L5: try Pyodide auto-grading, fall back to self-rate
    if (drill.level === 5) {
      const pyodide = getPyodide();
      if (pyodide.isReady() && drill.testCases && drill.testCases.length > 0) {
        setPhase("running-tests");
        pyodide
          .runTests(userCode, drill.testCases)
          .then((results) => {
            setTestResults(results);
            const passed = results.filter((r) => r.passed).length;
            const confidence = passRateToConfidence(passed, results.length);
            enterResult(
              {
                verdict: confidence >= 3 ? "correct" : confidence === 2 ? "close" : "incorrect",
                similarity: passed / results.length,
                confidence,
              },
              userCode,
            );
          })
          .catch(() => {
            setPhase("self-rate");
          });
        return;
      }
      // Pyodide not ready — self-rate
      setPhase("self-rate");
      return;
    }

    const match = checkCode(userCode, drill.expectedCode, drill.alternatives ?? [], drill.level);

    if (match.confidence < 4) {
      // Below threshold — show retry flow
      setFirstAttemptCode(userCode);
      setRetryCode("");
      setResult(match);
      setPhase("retry");
      playSound(match.confidence >= 2 ? "partial" : "wrong", muted);
    } else {
      enterResult(match, userCode);
    }
  }, [userCode, drill, muted, enterResult]);

  /** Second attempt submit (retry phase) */
  const handleRetrySubmit = useCallback(() => {
    const match = checkCode(retryCode, drill.expectedCode, drill.alternatives ?? [], drill.level);
    // Second attempt: correct/close → cap at conf 2; wrong → conf 1
    const cappedConfidence: DrillConfidence = match.confidence >= 2 ? 2 : 1;
    enterResult({ ...match, confidence: cappedConfidence }, retryCode);
  }, [retryCode, drill, enterResult]);

  /** Self-rate handler (L5 — user rates after seeing reference solution) */
  const handleSelfRate = useCallback(
    (confidence: DrillConfidence) => {
      const labelMap: Record<DrillConfidence, "correct" | "close" | "incorrect"> = {
        4: "correct", 3: "correct", 2: "close", 1: "incorrect",
      };
      enterResult({ verdict: labelMap[confidence], similarity: confidence >= 3 ? 1 : confidence === 2 ? 0.7 : 0, confidence }, userCode);
    },
    [userCode, enterResult],
  );

  const handleNext = useCallback(() => {
    if (autoContinueTimerRef.current) {
      clearTimeout(autoContinueTimerRef.current);
      autoContinueTimerRef.current = null;
    }
    if (result) onRate(result.confidence, userCode);
  }, [result, userCode, onRate]);

  const verdict = result ? VERDICT_STYLES[result.verdict] : null;

  // Keyboard shortcuts: Ctrl+. (advance/skip) · Ctrl+, (previous)
  // Note: Ctrl+Shift+Enter submit is handled inside CodeEditor via onSubmit prop.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inEditor = target.closest(".cm-editor") !== null;

      if (e.ctrlKey && !e.shiftKey && e.key === ".") {
        e.preventDefault();
        if (phase === "result" && result) {
          handleNext();
        } else if (phase === "prompt" && userCode.trim() && !inEditor) {
          setShowDiscardPrompt(true);
        } else if (phase === "prompt" && !userCode.trim()) {
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
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Your code</p>
            {/* Wrapper captures the shake animation since CodeEditor doesn't accept className */}
            <div className={editorAnimClass}>
              <CodeEditor
                value={userCode}
                onChange={handleCodeChange}
                placeholder="Write your code here…"
                minHeight="120px"
                autoFocus
                onSubmit={() => { if (userCode.trim()) handleSubmit(); }}
              />
            </div>
          </div>

          {showDiscardPrompt && (
            <div className="rounded-md border border-border/50 bg-background px-3 py-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Discard draft and skip?</span>
              <button
                onClick={() => onRate(1, "")}
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={userCode.trim().length === 0}
              className="inline-flex h-8 items-center rounded-md bg-accent px-4 text-xs font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
            {drill.level < 5 && (
              <button
                onClick={handleRun}
                disabled={!getPyodide().isReady() || runLoading || !userCode.trim()}
                className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {runLoading ? "Running…" : !getPyodide().isReady() ? "Loading…" : "▶ Run"}
              </button>
            )}
            <span className="text-[10px] text-muted-foreground">Ctrl+Shift+Enter</span>
            <div className="ml-auto">
              <button
                onClick={() => onRate(1, "")}
                className="inline-flex h-8 items-center rounded-md px-3 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground hover:bg-muted"
              >
                Skip
              </button>
            </div>
          </div>

          {/* Run output panel */}
          {runOutput !== null && (
            <div className="rounded-lg border border-border bg-card p-3 font-mono text-xs">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Output</p>
              <pre className={`whitespace-pre-wrap ${runError ? "text-red-400" : "text-foreground/70"}`}>
                {runOutput || <span className="text-muted-foreground/40 italic">no output</span>}
              </pre>
            </div>
          )}
        </>
      )}

      {/* ── RETRY PHASE ── */}
      {phase === "retry" && result && (
        <div className="space-y-3">
          {/* Verdict banner */}
          {(() => {
            const v = VERDICT_STYLES[result.verdict];
            return (
              <div className={`rounded-lg border ${v.border} ${v.bg} px-3 py-2 flex items-center gap-2`}>
                <span className={`text-sm font-bold ${v.text}`}>{v.icon}</span>
                <span className={`text-sm font-medium ${v.text}`}>
                  {result.verdict === "close" ? "Almost — try again from scratch" : "Incorrect — try again from scratch"}
                </span>
              </div>
            );
          })()}

          {/* When fully incorrect, show expected code so they can study before retrying */}
          {result.verdict === "incorrect" && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Expected answer</p>
              <CodeEditor value={drill.expectedCode} onChange={() => {}} readOnly minHeight="auto" />
            </div>
          )}

          {/* First attempt — read-only, dimmed */}
          <div className="opacity-60">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Your attempt
            </p>
            <CodeEditor value={firstAttemptCode ?? ""} onChange={() => {}} readOnly minHeight="auto" />
          </div>

          {/* Fresh editor */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Write it from scratch
            </p>
            <CodeEditor
              value={retryCode}
              onChange={setRetryCode}
              placeholder="Try again…"
              minHeight="120px"
              autoFocus
              onSubmit={() => { if (retryCode.trim()) handleRetrySubmit(); }}
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

      {/* ── RUNNING TESTS PHASE — L5: Pyodide executing ── */}
      {phase === "running-tests" && (
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Running Python tests…</span>
        </div>
      )}

      {/* ── SELF-RATE PHASE — L5: show reference + test cases, user self-rates ── */}
      {phase === "self-rate" && (
        <div className="space-y-3">
          <div className="opacity-70">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Your code</p>
            <CodeEditor value={userCode} onChange={() => {}} readOnly minHeight="auto" />
          </div>

          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Reference solution</p>
            <CodeEditor value={drill.expectedCode} onChange={() => {}} readOnly minHeight="auto" />
          </div>

          {drill.testCases && drill.testCases.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Test cases</p>
              <div className="space-y-1.5">
                {drill.testCases.map((tc: DrillTestCase, i: number) => (
                  <div key={i} className="flex gap-2 text-xs font-mono">
                    <span className="text-muted-foreground shrink-0">#{i + 1}</span>
                    <span className="text-foreground/70">Input: {tc.input}</span>
                    <span className="text-accent/70">→ {tc.expected}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Why</p>
            <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
              {drill.explanation.split("\n\n").map((paragraph, i) => (
                <p key={i} className="whitespace-pre-wrap">{renderInlineCode(paragraph)}</p>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">How did you do?</p>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSelfRate(4)} className="inline-flex h-8 items-center rounded-md bg-green-600/20 border border-green-500/30 px-3 text-xs font-medium text-green-500 transition-colors hover:bg-green-600/30">
                Got it
              </button>
              <button onClick={() => handleSelfRate(2)} className="inline-flex h-8 items-center rounded-md bg-amber-600/20 border border-amber-500/30 px-3 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-600/30">
                Partially
              </button>
              <button onClick={() => handleSelfRate(1)} className="inline-flex h-8 items-center rounded-md bg-red-600/20 border border-red-500/30 px-3 text-xs font-medium text-red-500 transition-colors hover:bg-red-600/30">
                Missed it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULT PHASE ── */}
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

          {/* Pyodide test results (L5 auto-graded path) */}
          {testResults && testResults.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Test results — {testResults.filter((r) => r.passed).length}/{testResults.length} passed
              </p>
              <div className="space-y-1.5">
                {testResults.map((tr, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs font-mono">
                    <span className={tr.passed ? "text-green-500" : "text-red-500"}>
                      {tr.passed ? "✓" : "✗"}
                    </span>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Input: {tr.input}</span>
                      {!tr.passed && (
                        <>
                          <br />
                          <span className="text-red-400">Got: {tr.actual}</span>
                          <br />
                          <span className="text-green-400">Expected: {tr.expected}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expected / Your code toggle */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                onClick={() => setShowUserCode(false)}
                className={`text-[10px] font-medium uppercase tracking-wide transition-colors ${
                  !showUserCode ? "text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Expected
              </button>
              <span className="text-muted-foreground/30 text-[10px]">|</span>
              <button
                onClick={() => setShowUserCode(true)}
                className={`text-[10px] font-medium uppercase tracking-wide transition-colors ${
                  showUserCode ? "text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Your code
              </button>
            </div>
            <CodeEditor
              value={showUserCode ? (firstAttemptCode ?? userCode) : drill.expectedCode}
              onChange={() => {}}
              readOnly
              minHeight="auto"
            />
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

          {/* Next button — sticky so it stays visible on long explanations */}
          <div className="sticky bottom-0 bg-muted pt-2 pb-1 flex items-center justify-between border-t border-border/40 mt-1">
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
              {" — SRS scheduling based on your accuracy"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground opacity-50">Ctrl+. next · Ctrl+, prev</span>
              <button
                onClick={handleNext}
                className="inline-flex h-8 items-center rounded-md bg-accent px-4 text-xs font-medium text-accent-foreground transition-colors hover:opacity-90"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
