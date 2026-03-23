"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";

/* ── Types ── */

type ReviewItem = {
  stateId: string;
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  totalAttempts: number;
};

type NewProblem = {
  id: number;
  leetcodeNumber: number | null;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  blind75: boolean;
  leetcodeUrl: string;
};

type CategoryStat = {
  category: string;
  total: number;
  attempted: number;
  avgRetention: number;
};

type DifficultyBreakdown = {
  difficulty: string;
  count: number;
  attempted: number;
};

type AttemptDay = {
  date: string;
  count: number;
};

type ReadinessResult = {
  score: number;
  tier: "S" | "A" | "B" | "C" | "D";
};

type DashboardData = {
  reviewQueue: ReviewItem[];
  newProblems: NewProblem[];
  totalProblems: number;
  attemptedCount: number;
  retainedCount: number;
  readiness: ReadinessResult;
  currentStreak: number;
  bestStreak: number;
  avgPerDay: number;
  avgNewPerDay: number;
  categoryStats: CategoryStat[];
  difficultyBreakdown: DifficultyBreakdown[];
  attemptHistory: AttemptDay[];
  totalSolveMinutes: number;
  totalStudyMinutes: number;
  avgSolveMinutes: number;
  avgConfidence: number;
};

const TIER_COLORS: Record<string, string> = {
  S: "bg-violet-500 text-white",
  A: "bg-blue-500 text-white",
  B: "bg-emerald-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-zinc-400 text-white",
};

const DIFF_COLORS: Record<string, string> = {
  Easy: "bg-green-500",
  Medium: "bg-amber-500",
  Hard: "bg-red-500",
};

function retentionColor(r: number): string {
  if (r >= 0.8) return "text-green-500";
  if (r >= 0.6) return "text-emerald-400";
  if (r >= 0.4) return "text-amber-500";
  if (r >= 0.2) return "text-orange-500";
  return "text-red-500";
}

function retentionBarColor(r: number): string {
  if (r >= 0.8) return "bg-green-500";
  if (r >= 0.6) return "bg-emerald-400";
  if (r >= 0.4) return "bg-amber-500";
  if (r >= 0.2) return "bg-orange-500";
  return "bg-red-500";
}

function retentionLabel(r: number): string {
  if (r >= 0.8) return "Strong";
  if (r >= 0.6) return "Good";
  if (r >= 0.4) return "Fading";
  if (r >= 0.2) return "Weak";
  return "Critical";
}

function formatMinutes(mins: number): string {
  if (mins === 0) return "0m";
  const hours = Math.floor(mins / 60);
  const remaining = Math.round(mins % 60);
  if (hours === 0) return `${remaining}m`;
  return `${hours}h ${remaining}m`;
}

/* ── Default target: September 1 of current year (or next year if past) ── */
function getDefaultTargetDate(): string {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-09-01`;
}

/* ── Main Component ── */

export function DashboardClient({ data }: { data: DashboardData }) {
  const [targetDate, setTargetDate] = useState(getDefaultTargetDate());
  const [targetCount, setTargetCount] = useState(150);
  const [showSettings, setShowSettings] = useState(false);
  const [categoryView, setCategoryView] = useState<"weak" | "all">("weak");

  // Load saved settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("srs_target");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date) setTargetDate(parsed.date);
        if (parsed.count) setTargetCount(parsed.count);
      } catch { /* ignore */ }
    }
  }, []);

  function saveSettings(date: string, count: number) {
    setTargetDate(date);
    setTargetCount(count);
    localStorage.setItem("srs_target", JSON.stringify({ date, count }));
    setShowSettings(false);
  }

  // Countdown computation
  const countdown = useMemo(() => {
    const now = new Date();
    const target = new Date(targetDate + "T00:00:00");
    const daysLeft = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const remaining = Math.max(0, targetCount - data.attemptedCount);
    const projected = Math.min(targetCount, data.attemptedCount + Math.round(data.avgNewPerDay * daysLeft));
    const onTrack = projected >= targetCount;
    const neededPerDay = daysLeft > 0 ? remaining / daysLeft : remaining;
    return { daysLeft, remaining, projected, onTrack, neededPerDay };
  }, [targetDate, targetCount, data.attemptedCount, data.avgNewPerDay]);

  const weakCategories = useMemo(() =>
    [...data.categoryStats]
      .filter(c => c.attempted > 0)
      .sort((a, b) => a.avgRetention - b.avgRetention)
      .slice(0, 6),
    [data.categoryStats],
  );

  const displayCategories = categoryView === "weak" ? weakCategories : data.categoryStats;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* ── Left Column ── */}
      <div className="space-y-6 lg:col-span-7">
        {/* Review Queue */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Review Queue</h2>
            <span className="text-xs text-muted-foreground">{data.reviewQueue.length} due</span>
          </div>
          {data.reviewQueue.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted p-6 text-center">
              <p className="text-sm text-muted-foreground">All caught up! No reviews due.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[440px] overflow-y-auto rounded-lg border border-border">
              {data.reviewQueue.map((item) => (
                <div
                  key={item.stateId}
                  className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted transition-colors duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground w-8 shrink-0">{item.leetcodeNumber}</span>
                    <div className="min-w-0">
                      <Link href={`/problems/${item.problemId}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                        {item.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">{item.category} · {item.totalAttempts} attempt{item.totalAttempts !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <DifficultyBadge difficulty={item.difficulty} />
                    <Link
                      href={`/problems/${item.problemId}/attempt`}
                      className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-xs text-accent-foreground transition-colors duration-150 hover:opacity-90"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* New Problems */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">New Problems</h2>
            <Link href="/problems" className="text-xs text-accent hover:underline">
              Browse all →
            </Link>
          </div>
          {data.newProblems.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted p-6 text-center">
              <p className="text-sm text-muted-foreground">You&apos;ve attempted every problem!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto rounded-lg border border-border">
              {data.newProblems.slice(0, 15).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted transition-colors duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground w-8 shrink-0">{p.leetcodeNumber}</span>
                    <div className="min-w-0">
                      <Link href={`/problems/${p.id}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                        {p.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{p.category}</span>
                        {p.blind75 && (
                          <span className="text-xs text-violet-500">B75</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <DifficultyBadge difficulty={p.difficulty} />
                    <Link
                      href={`/problems/${p.id}/attempt`}
                      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs text-foreground transition-colors duration-150 hover:bg-muted"
                    >
                      Start
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Right Column ── */}
      <div className="space-y-4 lg:col-span-5">
        {/* Countdown */}
        <section className="rounded-lg border border-border bg-muted p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">Fall Recruiting Countdown</p>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs text-muted-foreground hover:text-foreground"
              title="Edit target"
            >
              ⚙
            </button>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold tabular-nums">{countdown.daysLeft}</span>
            <span className="text-sm text-muted-foreground">days left</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Target: {targetCount} problems by {new Date(targetDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>

          {/* Progress bar */}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
            <div
              className={`h-full rounded-full transition-all duration-300 ${countdown.onTrack ? "bg-green-500" : "bg-orange-500"}`}
              style={{ width: `${Math.min(100, (data.attemptedCount / targetCount) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">{data.attemptedCount} solved</span>
            <span className="text-xs text-muted-foreground">{countdown.remaining} to go</span>
          </div>

          {/* Projection */}
          <div className={`mt-3 rounded-md p-2 text-xs ${countdown.onTrack ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"}`}>
            {countdown.onTrack ? (
              <span>On track — projected {countdown.projected} by target date</span>
            ) : (
              <span>Need ~{countdown.neededPerDay.toFixed(1)}/day to hit target (currently {data.avgNewPerDay.toFixed(1)}/day)</span>
            )}
          </div>

          {/* Settings */}
          {showSettings && (
            <SettingsPanel
              date={targetDate}
              count={targetCount}
              onSave={saveSettings}
              onCancel={() => setShowSettings(false)}
            />
          )}
        </section>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-muted p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${TIER_COLORS[data.readiness.tier]}`}>
                {data.readiness.tier}
              </span>
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums">{data.readiness.score}</p>
            <p className="text-xs text-muted-foreground">Readiness</p>
          </div>
          <div className="rounded-lg border border-border bg-muted p-3 text-center">
            <p className="text-lg font-semibold tabular-nums">{data.currentStreak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
            {data.bestStreak > data.currentStreak && (
              <p className="text-xs text-muted-foreground">Best: {data.bestStreak}</p>
            )}
          </div>
          <div className="rounded-lg border border-border bg-muted p-3 text-center">
            <p className="text-lg font-semibold tabular-nums">{data.avgPerDay.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg / Day</p>
          </div>
        </div>

        {/* Coverage + Retention Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted p-3">
            <p className="text-xs text-muted-foreground">Coverage</p>
            <p className="text-lg font-semibold tabular-nums">
              {data.attemptedCount}<span className="text-xs text-muted-foreground"> / {data.totalProblems}</span>
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.round((data.attemptedCount / data.totalProblems) * 100)}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted p-3">
            <p className="text-xs text-muted-foreground">Retained (R &gt; 70%)</p>
            <p className="text-lg font-semibold tabular-nums">
              {data.retainedCount}<span className="text-xs text-muted-foreground"> / {data.attemptedCount || 1}</span>
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${data.attemptedCount > 0 ? Math.round((data.retainedCount / data.attemptedCount) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Activity Chart (14 days) */}
        <section className="rounded-lg border border-border bg-muted p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Activity (14 days)</p>
          <ActivityChart history={data.attemptHistory} />
        </section>

        {/* Difficulty Progress */}
        <section className="rounded-lg border border-border bg-muted p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Difficulty</p>
          <div className="space-y-2">
            {data.difficultyBreakdown.map((d) => {
              const pct = d.count > 0 ? Math.round((d.attempted / d.count) * 100) : 0;
              return (
                <div key={d.difficulty} className="flex items-center gap-3">
                  <span className="text-xs w-14 shrink-0">{d.difficulty}</span>
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-background">
                    <div className={`h-full rounded-full ${DIFF_COLORS[d.difficulty]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{d.attempted}/{d.count}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Category Breakdown */}
        <section className="rounded-lg border border-border bg-muted p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground">Categories</p>
            <div className="flex gap-1">
              <button
                onClick={() => setCategoryView("weak")}
                className={`text-xs px-2 py-0.5 rounded ${categoryView === "weak" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Weakest
              </button>
              <button
                onClick={() => setCategoryView("all")}
                className={`text-xs px-2 py-0.5 rounded ${categoryView === "all" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                All
              </button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {displayCategories.map((cat) => (
              <div key={cat.category} className="flex items-center gap-2">
                <span className="text-xs w-32 shrink-0 truncate" title={cat.category}>{cat.category}</span>
                <div className="flex-1 h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className={`h-full rounded-full ${retentionBarColor(cat.avgRetention)}`}
                    style={{ width: `${cat.total > 0 ? Math.round((cat.attempted / cat.total) * 100) : 0}%` }}
                  />
                </div>
                <span className={`text-xs w-16 text-right shrink-0 ${cat.attempted > 0 ? retentionColor(cat.avgRetention) : "text-muted-foreground"}`}>
                  {cat.attempted}/{cat.total}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Time Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted p-3">
            <p className="text-xs text-muted-foreground">Total Solve</p>
            <p className="text-sm font-semibold">{formatMinutes(data.totalSolveMinutes)}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted p-3">
            <p className="text-xs text-muted-foreground">Avg Confidence</p>
            <p className="text-sm font-semibold">{data.avgConfidence > 0 ? data.avgConfidence.toFixed(1) : "—"}<span className="text-xs text-muted-foreground"> / 5</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Activity Chart ── */

function ActivityChart({ history }: { history: AttemptDay[] }) {
  const max = Math.max(...history.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1" style={{ height: 64 }}>
      {history.map((day) => {
        const pct = (day.count / max) * 100;
        const d = new Date(day.date);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        return (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-0.5">
            {day.count > 0 && (
              <span className="text-xs text-muted-foreground leading-none">{day.count}</span>
            )}
            <div
              className={`w-full rounded-t-sm ${day.count > 0 ? "bg-accent" : "bg-border"}`}
              style={{ height: `${Math.max(pct, 8)}%` }}
              title={`${label}: ${day.count}`}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ── Settings Panel ── */

function SettingsPanel({
  date,
  count,
  onSave,
  onCancel,
}: {
  date: string;
  count: number;
  onSave: (date: string, count: number) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState(date);
  const [c, setC] = useState(count);

  return (
    <div className="mt-3 rounded-md border border-border bg-background p-3 space-y-2">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Target Date</label>
        <input
          type="date"
          value={d}
          onChange={(e) => setD(e.target.value)}
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Target Problems</label>
        <input
          type="number"
          min={1}
          max={500}
          value={c}
          onChange={(e) => setC(Number(e.target.value))}
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(d, c)}
          className="inline-flex h-7 items-center rounded-md bg-accent px-3 text-xs text-accent-foreground hover:opacity-90"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="inline-flex h-7 items-center rounded-md border border-border px-3 text-xs text-foreground hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
