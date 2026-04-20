"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { DifficultyBadge } from "@/components/difficulty-badge";

type Outcome = "NO_SOLUTION" | "PARTIAL" | "SOLVED";

const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Can't solve or pseudocode",
  2: "Can pseudocode brute force",
  3: "Can pseudocode optimal, maybe code",
  4: "Can code it, minor bugs possible",
  5: "Solve cold, no issues",
};

export type LogModalProblem = {
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  isReview: boolean;
  /** Optional pre-filled date, e.g. from GitHub commit */
  attemptDate?: string | null;
  /** For pending submissions — id to confirm after logging */
  pendingId?: string | null;
  /** Source tag for the attempt (github, manual, import) */
  source?: string;
};

export type LogModalResult = {
  attemptId: string;
  srs: { oldStability: number; newStability: number; nextReviewAt: string; masteryPct: number };
};

type Props = {
  problem: LogModalProblem;
  onClose: () => void;
  onLogged: (result: LogModalResult) => void;
};

export function LogAttemptModal({ problem, onClose, onLogged }: Props) {
  const [outcome, setOutcome] = useState<Outcome>("SOLVED");
  const [quality, setQuality] = useState<"OPTIMAL" | "BRUTE_FORCE">("OPTIMAL");
  const [confidence, setConfidence] = useState(3);
  const [solveTime, setSolveTime] = useState(problem.isReview ? 15 : 20);
  const [rewrote, setRewrote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [expandNotes, setExpandNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [customDate, setCustomDate] = useState(
    problem.attemptDate ? new Date(problem.attemptDate).toISOString().split("T")[0] : ""
  );

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const buildBody = useCallback((force = false) => {
    let solvedIndependently: string;
    let solutionQuality: string;

    if (outcome === "NO_SOLUTION") {
      solvedIndependently = "NO";
      solutionQuality = "NONE";
    } else if (outcome === "PARTIAL") {
      solvedIndependently = "PARTIAL";
      solutionQuality = "BRUTE_FORCE";
    } else {
      solvedIndependently = "YES";
      solutionQuality = quality;
    }

    return {
      problemId: problem.problemId,
      solvedIndependently,
      solutionQuality,
      userTimeComplexity: "N/A",
      userSpaceComplexity: "N/A",
      confidence,
      solveTimeMinutes: solveTime || null,
      rewroteFromScratch: rewrote ? "YES" : "NO",
      ...(notes.trim() && { notes: notes.trim() }),
      ...(force && { force: true }),
      ...(problem.source && { source: problem.source }),
      ...(customDate && { attemptDate: new Date(customDate + "T12:00:00").toISOString() }),
    };
  }, [outcome, quality, confidence, solveTime, rewrote, notes, customDate, problem]);

  async function handleSubmit(force = false) {
    setSubmitting(true);
    setError(null);
    if (!force) setDuplicateWarning(null);

    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(force)),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && !force) {
          const existingTime = (data as { existingTime?: string }).existingTime;
          const timeLabel = existingTime
            ? new Date(existingTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
            : "earlier";
          setDuplicateWarning(timeLabel);
          setSubmitting(false);
          return;
        }
        setError((data as { error?: string }).error || "Something went wrong");
        setSubmitting(false);
        return;
      }

      const data = await res.json();

      // If this was a pending submission, confirm it
      if (problem.pendingId) {
        await fetch("/api/pending", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: problem.pendingId, action: "confirm" }),
        });
      }

      onLogged({
        attemptId: data.id,
        srs: data.srs,
      });
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  const btnBase = "inline-flex h-8 items-center justify-center rounded-md px-3 text-xs transition-colors duration-150 border";
  const btnActive = "border-accent bg-accent/10 text-accent font-medium";
  const btnInactive = "border-border text-muted-foreground hover:bg-muted hover:text-foreground";

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Log attempt"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-lg border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            {problem.leetcodeNumber && (
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">{problem.leetcodeNumber}.</span>
            )}
            <span className="text-sm font-medium truncate">{problem.title}</span>
            <DifficultyBadge difficulty={problem.difficulty} />
            {problem.isReview && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-500 font-medium shrink-0">Review</span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm ml-2 shrink-0" aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          {/* Outcome */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">How did it go?</p>
            <div className="flex gap-1.5">
              {([
                { value: "NO_SOLUTION" as const, label: "Couldn't solve" },
                { value: "PARTIAL" as const, label: "Partial / Hint" },
                { value: "SOLVED" as const, label: "Solved" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcome(opt.value)}
                  className={`${btnBase} flex-1 ${outcome === opt.value ? btnActive : btnInactive}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality — only when solved independently */}
          {outcome === "SOLVED" && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Solution quality</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuality("OPTIMAL")}
                  className={`${btnBase} flex-1 ${quality === "OPTIMAL" ? btnActive : btnInactive}`}
                >
                  Optimal
                </button>
                <button
                  type="button"
                  onClick={() => setQuality("BRUTE_FORCE")}
                  className={`${btnBase} flex-1 ${quality === "BRUTE_FORCE" ? btnActive : btnInactive}`}
                >
                  Not Optimal
                </button>
              </div>
            </div>
          )}

          {/* Confidence + Time row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Confidence</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setConfidence(n)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-xs transition-colors duration-150 ${
                      confidence === n
                        ? "bg-accent text-accent-foreground font-medium"
                        : "border border-border text-muted-foreground hover:bg-muted"
                    }`}
                    title={CONFIDENCE_LABELS[n]}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{CONFIDENCE_LABELS[confidence]}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Time (min)</p>
              <input
                type="number"
                min={0}
                value={solveTime}
                onChange={(e) => setSolveTime(Number(e.target.value))}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              />
              {problem.isReview && outcome === "SOLVED" && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Rewrote?</p>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setRewrote(false)} className={`${btnBase} px-2 h-6 text-[10px] ${!rewrote ? btnActive : btnInactive}`}>No</button>
                    <button type="button" onClick={() => setRewrote(true)} className={`${btnBase} px-2 h-6 text-[10px] ${rewrote ? btnActive : btnInactive}`}>Yes</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes / Date expander */}
          <div>
            <button
              type="button"
              onClick={() => setExpandNotes((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-150 ${expandNotes ? "rotate-180" : ""}`}><polyline points="18 15 12 9 6 15"/></svg>
              {expandNotes ? "Hide notes" : "Add notes / date"}
            </button>
            {expandNotes && (
              <div className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Key insight, approach, patterns…"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Date</p>
                  <input
                    type="date"
                    value={customDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setCustomDate(e.target.value)}
                    placeholder={new Date().toISOString().split("T")[0]}
                    className="h-8 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error / Duplicate */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
          {duplicateWarning && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
              <p className="text-xs text-amber-500">Already logged today at {duplicateWarning}.</p>
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="text-xs text-amber-500 underline hover:text-amber-400 disabled:opacity-50"
                >
                  Log anyway
                </button>
                <button
                  onClick={() => setDuplicateWarning(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <a
            href={`/problems/${problem.problemId}/attempt${problem.attemptDate ? `?attemptDate=${encodeURIComponent(problem.attemptDate)}` : ""}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Full form →
          </a>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="inline-flex h-8 items-center rounded-md bg-accent px-4 text-xs text-accent-foreground font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
