"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

/* ── Types ── */

type DbProblem = {
  id: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  optimalTimeComplexity: string | null;
  optimalSpaceComplexity: string | null;
};

type Outcome = "SOLVED" | "PARTIAL" | "NO_SOLUTION";
type Quality = "OPTIMAL" | "SUBOPTIMAL" | "BRUTE_FORCE";

type ImportAttempt = {
  id: string;
  rawTitle: string;
  matchedProblem: DbProblem | null;
  isReview: boolean;
  solvedStatus: "accepted" | "not_accepted";
  solveTimeMinutes: number;
  outcome: Outcome;
  quality: Quality;
  confidence: number;
  userTimeComplexity: string;
  userSpaceComplexity: string;
  notes: string;
  deleted: boolean;
  submitStatus: "idle" | "submitting" | "done" | "error";
  submitError: string | null;
};

/* ── Parsing helpers ── */

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findProblem(title: string, problems: DbProblem[]): DbProblem | null {
  const norm = normalizeName(title);
  return problems.find((p) => normalizeName(p.title) === norm) ?? null;
}

function parseTimeStr(timeStr: string, dateStr: string): Date | null {
  const m = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const meridian = m[3].toUpperCase();
  if (meridian === "PM" && h !== 12) h += 12;
  if (meridian === "AM" && h === 12) h = 0;
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(h, min, 0, 0);
  return d;
}

type RawRow = { title: string; status: string; timeStr: string };

function parseActivityText(text: string): RawRow[] {
  const rows: RawRow[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split("\t").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) continue;
    if (normalizeName(parts[0]) === "problem") continue; // skip header
    const title = parts[0];
    const status = parts[2];
    // Time is the last field (col 6, index 6) or last available
    const timeStr = parts.length >= 7 ? parts[6] : parts[parts.length - 1];
    rows.push({ title, status, timeStr });
  }
  return rows;
}

type RawRowWithDate = RawRow & { date: Date | null };

function buildAttempt(
  id: string,
  rows: RawRowWithDate[],
  allProblems: DbProblem[],
  attemptedSet: Set<number>,
): ImportAttempt {
  const rawTitle = rows[0].title;
  const matchedProblem = findProblem(rawTitle, allProblems);
  const isReview = matchedProblem ? attemptedSet.has(matchedProblem.id) : false;
  const accepted = rows.some((r) => r.status === "Accepted");

  const dates = rows.map((r) => r.date).filter(Boolean) as Date[];
  const firstMs = dates.length > 0 ? Math.min(...dates.map((d) => d.getTime())) : null;
  const lastMs = dates.length > 0 ? Math.max(...dates.map((d) => d.getTime())) : null;
  const diffMin = firstMs && lastMs ? Math.round((lastMs - firstMs) / 60000) : 0;
  const solveTimeMinutes = Math.max(accepted ? 5 : 15, diffMin + 5);

  return {
    id,
    rawTitle,
    matchedProblem,
    isReview,
    solvedStatus: accepted ? "accepted" : "not_accepted",
    solveTimeMinutes,
    outcome: accepted ? "SOLVED" : "NO_SOLUTION",
    quality: "OPTIMAL",
    confidence: 3,
    userTimeComplexity: matchedProblem?.optimalTimeComplexity ?? "",
    userSpaceComplexity: matchedProblem?.optimalSpaceComplexity ?? "",
    notes: "",
    deleted: false,
    submitStatus: "idle",
    submitError: null,
  };
}

function groupIntoAttempts(
  rows: RawRow[],
  dateStr: string,
  allProblems: DbProblem[],
  attemptedSet: Set<number>,
): ImportAttempt[] {
  const withDates: RawRowWithDate[] = rows.map((r) => ({
    ...r,
    date: parseTimeStr(r.timeStr, dateStr),
  }));

  // Group rows by normalized title
  const byTitle = new Map<string, RawRowWithDate[]>();
  for (const r of withDates) {
    const key = normalizeName(r.title);
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key)!.push(r);
  }

  const sessions: Array<{ firstMs: number; attempt: ImportAttempt }> = [];
  let idx = 0;

  for (const group of byTitle.values()) {
    const sorted = [...group].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date.getTime() - b.date.getTime();
    });

    // Split on >60 min gap = separate attempt session
    let current: RawRowWithDate[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prev = current[current.length - 1];
      const curr = sorted[i];
      const gapMin =
        prev.date && curr.date
          ? (curr.date.getTime() - prev.date.getTime()) / 60000
          : 0;
      if (gapMin > 60) {
        const a = buildAttempt(`${idx++}`, current, allProblems, attemptedSet);
        const firstDate = current.find((r) => r.date)?.date ?? null;
        sessions.push({ firstMs: firstDate?.getTime() ?? idx, attempt: a });
        current = [curr];
      } else {
        current.push(curr);
      }
    }
    const a = buildAttempt(`${idx++}`, current, allProblems, attemptedSet);
    const firstDate = current.find((r) => r.date)?.date ?? null;
    sessions.push({ firstMs: firstDate?.getTime() ?? idx, attempt: a });
  }

  // Sort by earliest submission time
  sessions.sort((a, b) => a.firstMs - b.firstMs);
  return sessions.map((s) => s.attempt);
}

function validateAttempt(a: ImportAttempt): string | null {
  if (!a.matchedProblem) return null; // will be skipped
  if (a.outcome !== "NO_SOLUTION") {
    if (!a.userTimeComplexity.trim()) return "Time complexity required";
    if (!a.userSpaceComplexity.trim()) return "Space complexity required";
  }
  return null;
}

/* ── Labels ── */

const CONF_LABELS: Record<number, string> = {
  1: "Can't solve at all",
  2: "Brute force only",
  3: "Know the approach, may have bugs",
  4: "Clean, minor bugs possible",
  5: "Solve cold, no issues",
};

/* ── Main component ── */

type Step = "paste" | "confirm" | "done";

type Props = {
  allProblems: DbProblem[];
  attemptedIds: number[];
};

export function ImportClient({ allProblems, attemptedIds }: Props) {
  const attemptedSet = useMemo(() => new Set(attemptedIds), [attemptedIds]);
  const today = new Date().toISOString().slice(0, 10);

  const [step, setStep] = useState<Step>("paste");
  const [dateStr, setDateStr] = useState(today);
  const [rawText, setRawText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<ImportAttempt[]>([]);
  const [submittedCount, setSubmittedCount] = useState(0);

  const activeAttempts = useMemo(
    () => attempts.filter((a) => !a.deleted),
    [attempts],
  );

  function handleParse() {
    setParseError(null);
    const rows = parseActivityText(rawText);
    if (rows.length === 0) {
      setParseError(
        "No rows found. Copy the full submission table from the NeetCode activity page (tab-separated).",
      );
      return;
    }
    const grouped = groupIntoAttempts(rows, dateStr, allProblems, attemptedSet);
    setAttempts(grouped);
    setStep("confirm");
  }

  function updateAttempt(id: string, patch: Partial<ImportAttempt>) {
    setAttempts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  }

  async function handleSubmitAll() {
    const toSubmit = activeAttempts.filter(
      (a) => a.matchedProblem && a.submitStatus === "idle" && !validateAttempt(a),
    );

    let count = 0;
    for (const attempt of toSubmit) {
      if (!attempt.matchedProblem) continue;
      updateAttempt(attempt.id, { submitStatus: "submitting" });

      const isNoSolution = attempt.outcome === "NO_SOLUTION";
      const body = {
        problemId: attempt.matchedProblem.id,
        solvedIndependently:
          attempt.outcome === "SOLVED"
            ? "YES"
            : attempt.outcome === "PARTIAL"
              ? "PARTIAL"
              : "NO",
        solutionQuality: isNoSolution ? "NONE" : attempt.quality,
        userTimeComplexity: isNoSolution
          ? "N/A"
          : attempt.userTimeComplexity || "N/A",
        userSpaceComplexity: isNoSolution
          ? "N/A"
          : attempt.userSpaceComplexity || "N/A",
        confidence: attempt.confidence,
        solveTimeMinutes: attempt.solveTimeMinutes,
        rewroteFromScratch: attempt.isReview ? "YES" : "DID_NOT_ATTEMPT",
        notes: attempt.notes || null,
      };

      try {
        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          updateAttempt(attempt.id, {
            submitStatus: "error",
            submitError: (data as { error?: string }).error ?? "Failed",
          });
        } else {
          updateAttempt(attempt.id, { submitStatus: "done" });
          count++;
        }
      } catch {
        updateAttempt(attempt.id, {
          submitStatus: "error",
          submitError: "Network error",
        });
      }
    }

    setSubmittedCount((c) => c + count);
    // Transition to done if no errors remain
    setAttempts((prev) => {
      const hasErrors = prev
        .filter((a) => !a.deleted)
        .some((a) => a.submitStatus === "error");
      if (!hasErrors) setStep("done");
      return prev;
    });
  }

  /* ── Paste step ── */

  if (step === "paste") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Import NeetCode Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Go to{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              neetcode.io/activity/YYYY-MM-DD
            </code>
            , select all rows in the table, copy (Ctrl+C), then paste below.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              value={dateStr}
              max={today}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1 block rounded-md border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Activity Table</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                "Problem\tDifficulty\tStatus\tLanguage\tRuntime\tMemory\tTime\nTwo Sum\tEasy\tAccepted\tPython\t27ms\t7.7 MB\t7:08 AM"
              }
              rows={12}
              className="mt-1 block w-full resize-y rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm"
            />
          </div>

          {parseError && <p className="text-sm text-red-500">{parseError}</p>}

          <button
            onClick={handleParse}
            disabled={!rawText.trim() || !dateStr}
            className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            Parse Activity →
          </button>
        </div>
      </div>
    );
  }

  /* ── Done step ── */

  if (step === "done") {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pt-12 text-center">
        <div className="text-5xl">✓</div>
        <h1 className="text-xl font-semibold">All logged!</h1>
        <p className="text-muted-foreground">
          {submittedCount} attempt{submittedCount !== 1 ? "s" : ""} submitted
          successfully.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground hover:opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  /* ── Confirm step ── */

  const unmatched = activeAttempts.filter((a) => !a.matchedProblem);
  const validIdle = activeAttempts.filter(
    (a) => a.matchedProblem && a.submitStatus === "idle" && !validateAttempt(a),
  );
  const invalidCount = activeAttempts.filter(
    (a) => a.matchedProblem && a.submitStatus === "idle" && validateAttempt(a),
  ).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Confirm Attempts</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {activeAttempts.length} session
            {activeAttempts.length !== 1 ? "s" : ""} · {dateStr}
            {unmatched.length > 0 && (
              <span className="text-amber-500">
                {" "}
                · {unmatched.length} unmatched (will skip)
              </span>
            )}
            {invalidCount > 0 && (
              <span className="text-red-400">
                {" "}
                · {invalidCount} missing complexity
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setStep("paste")}
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
          <button
            onClick={handleSubmitAll}
            disabled={validIdle.length === 0}
            className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            Submit {validIdle.length > 0 ? `(${validIdle.length})` : "All"}
          </button>
        </div>
      </div>

      {/* Attempt cards */}
      <div className="space-y-3">
        {attempts
          .filter((a) => !a.deleted)
          .map((attempt) => (
            <AttemptCard
              key={attempt.id}
              attempt={attempt}
              onUpdate={(patch) => updateAttempt(attempt.id, patch)}
              onDelete={() => updateAttempt(attempt.id, { deleted: true })}
            />
          ))}
      </div>
    </div>
  );
}

/* ── Attempt Card ── */

type CardProps = {
  attempt: ImportAttempt;
  onUpdate: (patch: Partial<ImportAttempt>) => void;
  onDelete: () => void;
};

function AttemptCard({ attempt, onUpdate, onDelete }: CardProps) {
  const {
    matchedProblem,
    isReview,
    outcome,
    quality,
    confidence,
    userTimeComplexity,
    userSpaceComplexity,
    notes,
    submitStatus,
    submitError,
    solveTimeMinutes,
  } = attempt;

  const validationError = validateAttempt(attempt);

  if (submitStatus === "done") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
        <span className="text-green-500">✓</span>
        <span className="text-sm font-medium">
          {matchedProblem?.title ?? attempt.rawTitle}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {isReview ? "Review" : "New"} · logged
        </span>
      </div>
    );
  }

  if (submitStatus === "submitting") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-3 opacity-60">
        <span className="animate-pulse text-muted-foreground text-xs">Submitting…</span>
        <span className="text-sm font-medium">
          {matchedProblem?.title ?? attempt.rawTitle}
        </span>
      </div>
    );
  }

  const showComplexity = outcome !== "NO_SOLUTION";

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        !matchedProblem
          ? "border-amber-500/40 bg-amber-500/5"
          : submitStatus === "error"
            ? "border-red-500/40 bg-red-500/5"
            : "border-border bg-muted"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
              isReview
                ? "bg-blue-500/20 text-blue-400"
                : "bg-violet-500/20 text-violet-400"
            }`}
          >
            {isReview ? "REVIEW" : "NEW"}
          </span>
          <span className="text-sm font-medium truncate">
            {matchedProblem ? (
              matchedProblem.title
            ) : (
              <span className="text-amber-500">{attempt.rawTitle}</span>
            )}
          </span>
          {matchedProblem && (
            <span className="text-xs text-muted-foreground shrink-0">
              {matchedProblem.difficulty} · {matchedProblem.category}
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          title="Remove"
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {/* Unmatched warning */}
      {!matchedProblem && (
        <p className="text-xs text-amber-500">
          Not found in database — will be skipped on submit.
        </p>
      )}

      {/* Error */}
      {(submitStatus === "error" || submitError) && (
        <p className="text-xs text-red-400">{submitError}</p>
      )}

      {matchedProblem && (
        <>
          {/* Outcome */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-16 shrink-0">Outcome:</span>
            {(["SOLVED", "PARTIAL", "NO_SOLUTION"] as Outcome[]).map((o) => (
              <button
                key={o}
                onClick={() => onUpdate({ outcome: o })}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  outcome === o
                    ? o === "SOLVED"
                      ? "border-green-500 bg-green-500/15 text-green-400"
                      : o === "PARTIAL"
                        ? "border-amber-500 bg-amber-500/15 text-amber-400"
                        : "border-red-500/60 bg-red-500/10 text-red-400"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {o === "SOLVED"
                  ? "Solved"
                  : o === "PARTIAL"
                    ? "Partial"
                    : "Couldn't Solve"}
              </button>
            ))}
          </div>

          {/* Quality (not shown for NO_SOLUTION) */}
          {showComplexity && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-16 shrink-0">Quality:</span>
              {(["OPTIMAL", "SUBOPTIMAL", "BRUTE_FORCE"] as Quality[]).map(
                (q) => (
                  <button
                    key={q}
                    onClick={() => onUpdate({ quality: q })}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      quality === q
                        ? "border-accent bg-accent/20 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {q === "OPTIMAL"
                      ? "Optimal"
                      : q === "SUBOPTIMAL"
                        ? "Suboptimal"
                        : "Brute Force"}
                  </button>
                ),
              )}
            </div>
          )}

          {/* Complexity */}
          {showComplexity && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0">
                  Time:
                </label>
                <input
                  type="text"
                  value={userTimeComplexity}
                  onChange={(e) =>
                    onUpdate({ userTimeComplexity: e.target.value })
                  }
                  placeholder="O(n)"
                  className={`w-24 rounded border px-2 py-0.5 text-xs bg-background ${
                    !userTimeComplexity.trim() && validationError
                      ? "border-red-500"
                      : "border-border"
                  }`}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0">
                  Space:
                </label>
                <input
                  type="text"
                  value={userSpaceComplexity}
                  onChange={(e) =>
                    onUpdate({ userSpaceComplexity: e.target.value })
                  }
                  placeholder="O(1)"
                  className={`w-24 rounded border px-2 py-0.5 text-xs bg-background ${
                    !userSpaceComplexity.trim() && validationError
                      ? "border-red-500"
                      : "border-border"
                  }`}
                />
              </div>
            </div>
          )}

          {/* Confidence + Solve time */}
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Confidence: {confidence}/5
                </span>
                <span className="text-xs text-muted-foreground">
                  {CONF_LABELS[confidence]}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={confidence}
                onChange={(e) =>
                  onUpdate({ confidence: Number(e.target.value) })
                }
                className="w-full accent-accent"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
              <label className="text-xs text-muted-foreground">Time:</label>
              <input
                type="number"
                min={1}
                value={solveTimeMinutes}
                onChange={(e) =>
                  onUpdate({ solveTimeMinutes: Number(e.target.value) })
                }
                className="w-14 rounded border border-border bg-background px-2 py-0.5 text-center text-xs"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>

          {/* Notes (collapsible) */}
          <NotesField
            notes={notes}
            onChange={(n) => onUpdate({ notes: n })}
          />
        </>
      )}
    </div>
  );
}

/* ── Notes field (own state for open/close) ── */

function NotesField({
  notes,
  onChange,
}: {
  notes: string;
  onChange: (n: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {open ? "▲ Hide notes" : "▼ Add notes (optional)"}
      </button>
      {open && (
        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Notes…"
          rows={2}
          className="mt-1 block w-full resize-none rounded border border-border bg-background px-2 py-1 text-xs"
        />
      )}
    </div>
  );
}
