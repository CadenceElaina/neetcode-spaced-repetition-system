"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ExternalLink } from "lucide-react";

type InterviewProblem = {
  id: number;
  leetcodeNumber: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  leetcodeUrl: string;
};

type Props = {
  problems: InterviewProblem[];
  categories: string[];
  weakCategories: string[];
};

type Phase = "setup" | "active" | "finished";

const TIMER_MINUTES = 45;

export function MockInterviewClient({ problems, categories, weakCategories }: Props) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [timeLeft, setTimeLeft] = useState(TIMER_MINUTES * 60);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // Timer
  useEffect(() => {
    if (phase !== "active" || startedAt === null) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = TIMER_MINUTES * 60 - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        setPhase("finished");
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, startedAt]);

  const startInterview = useCallback(() => {
    setStartedAt(Date.now());
    setPhase("active");
    setTimeLeft(TIMER_MINUTES * 60);
  }, []);

  const finishEarly = useCallback(() => {
    setPhase("finished");
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const timerColor = timeLeft <= 300 ? "text-destructive" : timeLeft <= 600 ? "text-warning" : "text-foreground";

  if (problems.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Mock Interview</h1>
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-muted-foreground">
            Not enough problems available. Try attempting more problems first.
          </p>
          <Link
            href="/problems"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
          >
            Browse Problems
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Mock Interview</h1>
        <div className="rounded-lg border border-border bg-muted p-6 space-y-4 max-w-2xl">
          <p className="text-sm text-foreground">
            Simulate a real coding interview. You&apos;ll get {problems.length} problem{problems.length !== 1 ? "s" : ""} (medium + hard)
            from your {weakCategories.length > 0 ? "weak categories" : "full problem set"} with a {TIMER_MINUTES}-minute timer.
          </p>
          {weakCategories.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Targeting weak categories:</p>
              <div className="flex flex-wrap gap-1">
                {weakCategories.map((c) => (
                  <span key={c} className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-500">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Problems selected:</p>
            {problems.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-1">
                <span className="text-sm text-muted-foreground w-8">{p.leetcodeNumber}</span>
                <span className="text-sm">{p.title}</span>
                <DifficultyBadge difficulty={p.difficulty} />
                <span className="text-xs text-muted-foreground">{p.category}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Refresh the page to get different problems.
          </p>
          <button
            onClick={startInterview}
            className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
          >
            Start Interview ({TIMER_MINUTES} min)
          </button>
        </div>
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Mock Interview — Complete</h1>
        <div className="rounded-lg border border-border bg-muted p-6 space-y-4 max-w-2xl">
          <p className="text-sm text-foreground">
            {timeLeft === 0 ? "Time's up!" : "Interview ended."} Now log your attempts for each problem.
          </p>
          <div className="space-y-2">
            {problems.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-8">{p.leetcodeNumber}</span>
                  <span className="text-sm font-medium">{p.title}</span>
                  <DifficultyBadge difficulty={p.difficulty} />
                </div>
                <Link
                  href={`/problems/${p.id}/attempt`}
                  className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
                >
                  Log Attempt
                </Link>
              </div>
            ))}
          </div>
          <Link href="/mock-interview" className="inline-flex h-9 items-center rounded-md px-4 text-sm text-foreground transition-colors duration-150 hover:bg-muted">
            Start New Interview
          </Link>
        </div>
      </div>
    );
  }

  // Active phase
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mock Interview</h1>
        <div className="flex items-center gap-4">
          <span className={`font-mono text-2xl font-bold ${timerColor}`}>
            {formatTime(timeLeft)}
          </span>
          <button
            onClick={finishEarly}
            className="inline-flex h-9 items-center rounded-md px-4 text-sm text-foreground transition-colors duration-150 hover:bg-muted"
          >
            End Interview
          </button>
        </div>
      </div>

      <div className="space-y-4 max-w-3xl">
        {problems.map((p, i) => (
          <div key={p.id} className="rounded-lg border border-border bg-muted p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Problem {i + 1}</span>
                <span className="text-sm font-semibold">{p.leetcodeNumber}. {p.title}</span>
                <DifficultyBadge difficulty={p.difficulty} />
              </div>
              <a
                href={p.leetcodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
              >
                <ExternalLink size={14} />
                Solve on LeetCode
              </a>
            </div>
            <p className="text-xs text-muted-foreground">{p.category}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Open each problem on LeetCode and solve it. When the timer runs out (or you finish early), you&apos;ll log your attempts.
      </p>
    </div>
  );
}
