"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Outcome = "NO_SOLUTION" | "PARTIAL" | "SOLVED";
type Quality = "BRUTE_FORCE" | "OPTIMAL";

const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Can't solve or pseudocode",
  2: "Can pseudocode brute force",
  3: "Can pseudocode optimal, maybe code",
  4: "Can code it, minor bugs possible",
  5: "Solve cold, no issues",
};

type Props = {
  problemId: number;
  optimalTimeComplexity: string | null;
  optimalSpaceComplexity: string | null;
  isReview: boolean;
};

export function AttemptForm({ problemId, optimalTimeComplexity, optimalSpaceComplexity, isReview }: Props) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [rewrote, setRewrote] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showQuality = outcome === "PARTIAL" || outcome === "SOLVED";
  const showComplexity = showQuality && quality !== null;
  const defaultSolveTime = isReview ? 15 : 20;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!outcome) return;
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    let solvedIndependently: string;
    let solutionQuality: string;

    if (outcome === "NO_SOLUTION") {
      solvedIndependently = "NO";
      solutionQuality = "NONE";
    } else if (outcome === "PARTIAL") {
      solvedIndependently = "PARTIAL";
      solutionQuality = quality ?? "BRUTE_FORCE";
    } else {
      solvedIndependently = "YES";
      solutionQuality = quality ?? "OPTIMAL";
    }

    const body = {
      problemId,
      solvedIndependently,
      solutionQuality,
      userTimeComplexity: showComplexity ? (form.get("userTimeComplexity") as string) : "N/A",
      userSpaceComplexity: showComplexity ? (form.get("userSpaceComplexity") as string) : "N/A",
      solveTimeMinutes: Number(form.get("solveTimeMinutes")) || null,
      studyTimeMinutes: Number(form.get("studyTimeMinutes")) || null,
      rewroteFromScratch: rewrote ? "YES" : "NO",
      confidence,
      code: form.get("code") || null,
      notes: form.get("notes") || null,
    };

    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const btnBase = "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm transition-colors duration-150 border";
  const btnActive = "border-accent bg-accent/10 text-accent font-medium";
  const btnInactive = "border-border text-muted-foreground hover:bg-muted hover:text-foreground";
  const inputClass = "h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {/* Outcome */}
      <div className="space-y-2">
        <p className="text-sm font-medium">How did it go?</p>
        <div className="flex gap-2">
          {([
            { value: "NO_SOLUTION" as const, label: "Could not solve" },
            { value: "PARTIAL" as const, label: "Partial — needed hint / AI" },
            { value: "SOLVED" as const, label: "Solved independently" },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setOutcome(opt.value); if (opt.value === "NO_SOLUTION") setQuality(null); }}
              className={`${btnBase} ${outcome === opt.value ? btnActive : btnInactive}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quality (brute force vs optimal) */}
      {showQuality && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Was your solution optimal?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setQuality("BRUTE_FORCE")}
              className={`${btnBase} ${quality === "BRUTE_FORCE" ? "border-orange-500 bg-orange-500/10 text-orange-500 font-medium" : btnInactive}`}
            >
              Brute Force
            </button>
            <button
              type="button"
              onClick={() => setQuality("OPTIMAL")}
              className={`${btnBase} ${quality === "OPTIMAL" ? "border-green-500 bg-green-500/10 text-green-500 font-medium" : btnInactive}`}
            >
              Optimal
            </button>
          </div>
        </div>
      )}

      {/* Complexity */}
      {showComplexity && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Optimal: Time {optimalTimeComplexity ?? "?"} · Space {optimalSpaceComplexity ?? "?"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Your Time Complexity</label>
              <input name="userTimeComplexity" required placeholder="e.g. O(n)" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Your Space Complexity</label>
              <input name="userSpaceComplexity" required placeholder="e.g. O(1)" className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* Timing */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Solve Time (min)</label>
          <input name="solveTimeMinutes" type="number" min={0} defaultValue={defaultSolveTime} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Study Time (min)</label>
          <input name="studyTimeMinutes" type="number" min={0} placeholder="—" className={inputClass} />
        </div>
      </div>

      {/* Rewrote + Confidence */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className={labelClass}>Rewrote from Scratch?</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setRewrote(false)} className={`${btnBase} text-xs px-3 h-8 ${!rewrote ? btnActive : btnInactive}`}>No</button>
            <button type="button" onClick={() => setRewrote(true)} className={`${btnBase} text-xs px-3 h-8 ${rewrote ? btnActive : btnInactive}`}>Yes</button>
          </div>
        </div>
        <div>
          <p className={labelClass}>Confidence</p>
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
          <p className="mt-1 text-xs text-muted-foreground">{CONFIDENCE_LABELS[confidence]}</p>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Key insights, patterns, what tripped you up…"
          className="w-full rounded-md border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>

      {/* Code (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowCode(!showCode)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showCode ? "▾ Hide code" : "▸ Add code"}
        </button>
        {showCode && (
          <textarea
            name="code"
            rows={6}
            placeholder="Paste your solution…"
            className="mt-2 w-full rounded-md border border-border bg-background p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !outcome || (showQuality && !quality)}
        className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save Attempt"}
      </button>
    </form>
  );
}
