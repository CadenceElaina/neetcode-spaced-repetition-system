"use client";

import { useState } from "react";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";

type QueueItem = {
  stateId: string;
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  totalAttempts: number;
  notes: string | null;
};

type Props = {
  initialQueue: QueueItem[];
};

const SKIP_REASONS = [
  { value: "too_easy", label: "Too easy right now" },
  { value: "wrong_timing", label: "Wrong timing" },
  { value: "wrong_category", label: "Wrong category for today" },
] as const;

export function ReviewQueueClient({ initialQueue }: Props) {
  const [queue, setQueue] = useState(initialQueue);
  const [skippingId, setSkippingId] = useState<string | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSkip(problemId: number, stateId: string, reason: string) {
    setLoading(stateId);
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId, action: "skip", reason }),
    });
    if (res.ok) {
      setQueue((q) => q.filter((item) => item.stateId !== stateId));
    }
    setLoading(null);
    setSkippingId(null);
  }

  async function handleFeedback(problemId: number, stateId: string, feedback: string) {
    setLoading(stateId);
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId, action: "feedback", feedback }),
    });
    if (res.ok) {
      setQueue((q) => q.filter((item) => item.stateId !== stateId));
    }
    setLoading(null);
    setFeedbackId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Review Queue</h1>
        <span className="text-sm text-muted-foreground">{queue.length} due</span>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-muted-foreground">All caught up! Nothing to review right now.</p>
          <Link
            href="/problems"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
          >
            Browse Problems
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <div
              key={item.stateId}
              className="rounded-lg border border-border bg-muted p-4 transition-colors duration-150 hover:border-accent/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-10">{item.leetcodeNumber}</span>
                  <div>
                    <Link href={`/problems/${item.problemId}`} className="text-sm font-medium text-foreground hover:text-accent">
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DifficultyBadge difficulty={item.difficulty} />
                  <span className="text-xs text-muted-foreground">{item.totalAttempts} attempt{item.totalAttempts !== 1 ? "s" : ""}</span>

                  {/* Feedback button */}
                  <button
                    onClick={() => setFeedbackId(feedbackId === item.stateId ? null : item.stateId)}
                    className="inline-flex h-8 items-center rounded-md px-2 text-xs text-muted-foreground transition-colors duration-150 hover:bg-background hover:text-foreground"
                    title="Give timing feedback"
                  >
                    ⟳
                  </button>

                  {/* Skip button */}
                  <button
                    onClick={() => setSkippingId(skippingId === item.stateId ? null : item.stateId)}
                    disabled={loading === item.stateId}
                    className="inline-flex h-8 items-center rounded-md px-3 text-xs text-muted-foreground transition-colors duration-150 hover:bg-background hover:text-foreground disabled:opacity-50"
                  >
                    Skip
                  </button>

                  <Link
                    href={`/problems/${item.problemId}/attempt`}
                    className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
                  >
                    Review
                  </Link>
                </div>
              </div>

              {/* Skip reason dropdown */}
              {skippingId === item.stateId && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background p-2">
                  <span className="text-xs text-muted-foreground">Skip reason:</span>
                  {SKIP_REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => handleSkip(item.problemId, item.stateId, r.value)}
                      disabled={loading === item.stateId}
                      className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs text-foreground transition-colors duration-150 hover:bg-muted disabled:opacity-50"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Timing feedback */}
              {feedbackId === item.stateId && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background p-2">
                  <span className="text-xs text-muted-foreground">This came back:</span>
                  <button
                    onClick={() => handleFeedback(item.problemId, item.stateId, "too_early")}
                    disabled={loading === item.stateId}
                    className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs text-foreground transition-colors duration-150 hover:bg-muted disabled:opacity-50"
                  >
                    Too early
                  </button>
                  <button
                    onClick={() => handleFeedback(item.problemId, item.stateId, "too_late")}
                    disabled={loading === item.stateId}
                    className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs text-foreground transition-colors duration-150 hover:bg-muted disabled:opacity-50"
                  >
                    Too late
                  </button>
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div className="mt-3 rounded-md border border-border bg-background p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Your Notes</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{item.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
