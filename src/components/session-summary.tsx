"use client";

import { useEffect, useState } from "react";
import type { DrillConfidence } from "@/app/dashboard/demo-data";

interface RelatedProblem {
  id: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  neetcodeUrl: string | null;
  attempted: boolean;
}

interface SessionSummaryProps {
  results: DrillConfidence[];
  categoryLabel?: string;
  relatedProblems?: RelatedProblem[];
  onDone: () => void;
  onKeepGoing: () => void;
}

/** Animate a number counting up from 0 to `target` over `durationMs`. */
function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const steps = 20;
    const interval = durationMs / steps;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setValue(Math.round((target * step) / steps));
      if (step >= steps) clearInterval(id);
    }, interval);
    return () => clearInterval(id);
  }, [target, durationMs]);
  return value;
}

export function SessionSummary({ results, categoryLabel, relatedProblems, onDone, onKeepGoing }: SessionSummaryProps) {
  const correct  = results.filter((r) => r === 4).length;
  const good     = results.filter((r) => r === 3).length;
  const hard     = results.filter((r) => r === 2).length;
  const again    = results.filter((r) => r === 1).length;

  // Best consecutive streak
  let streak = 0, best = 0, cur = 0;
  for (const r of results) {
    if (r >= 3) { cur++; best = Math.max(best, cur); }
    else cur = 0;
  }
  streak = best;

  const displayCorrect = useCountUp(correct + good);
  const displayHard    = useCountUp(hard,  700);
  const displayAgain   = useCountUp(again, 800);
  const displayStreak  = useCountUp(streak, 500);

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-sm mx-4 rounded-xl border border-border bg-muted p-6 space-y-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-base font-semibold text-foreground">Session complete</h2>
          {categoryLabel && (
            <p className="text-xs text-muted-foreground">{categoryLabel} Practice</p>
          )}
        </div>

        {/* Stat counters */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
            <p className="text-2xl font-bold text-green-500 tabular-nums">{displayCorrect}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Correct</p>
          </div>
          <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
            <p className="text-2xl font-bold text-orange-400 tabular-nums">{displayHard}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Hard</p>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-2xl font-bold text-red-500 tabular-nums">{displayAgain}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Again</p>
          </div>
        </div>

        {/* Streak */}
        {streak >= 4 && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-2">
            <span className="text-base">🔥</span>
            <span className="text-sm font-semibold text-orange-400 tabular-nums">{displayStreak}</span>
            <span className="text-xs text-muted-foreground">best streak</span>
          </div>
        )}

        {/* Problems bridge */}
        {relatedProblems && relatedProblems.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Ready to try these problems?
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              {relatedProblems.map((p) => (
                <a
                  key={p.id}
                  href={p.neetcodeUrl ?? `/problems/${p.id}`}
                  target={p.neetcodeUrl ? "_blank" : undefined}
                  rel={p.neetcodeUrl ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-2.5 px-3 py-2 border-b border-border last:border-b-0 hover:bg-muted/80 transition-colors"
                >
                  {p.leetcodeNumber && (
                    <span className="text-[10px] text-muted-foreground w-7 shrink-0 tabular-nums">{p.leetcodeNumber}</span>
                  )}
                  <span className="text-sm text-foreground truncate flex-1">{p.title}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      p.difficulty === "Easy" ? "bg-green-500/15 text-green-500" :
                      p.difficulty === "Medium" ? "bg-amber-500/15 text-amber-500" :
                      "bg-red-500/15 text-red-500"
                    }`}>{p.difficulty}</span>
                    {p.attempted && (
                      <span className="text-[10px] text-muted-foreground">✓</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-3">
          <button
            onClick={onKeepGoing}
            className="flex-1 inline-flex h-9 items-center justify-center rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
          >
            Keep going
          </button>
          <button
            onClick={onDone}
            className="flex-1 inline-flex h-9 items-center justify-center rounded-md bg-accent text-sm font-medium text-accent-foreground hover:opacity-90 transition-colors"
          >
            Done for today
          </button>
        </div>
      </div>
    </div>
  );
}
