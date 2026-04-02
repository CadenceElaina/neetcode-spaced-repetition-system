"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ImportClient } from "@/app/import/import-client";

/* ── Types ── */

type ReviewItem = {
  stateId: string;
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  totalAttempts: number;
  daysOverdue: number;
  retrievability: number;
  lastReviewedAt: string | null;
};

type CompletedItem = {
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  totalAttempts: number;
  retrievability: number;
  stability: number;
  lastReviewedAt: string | null;
  daysUntilReview: number | null;
  isDue: boolean;
  bestQuality: string | null;
};

type ListMode = "review" | "new" | "completed" | "import";
type ReviewSort = "overdue" | "difficulty" | "category";
type NewSort = "curriculum" | "hardest";
type CompletedSort = "retention" | "review-date" | "category";

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

type MasteryItem = {
  title: string;
  leetcodeNumber: number | null;
  stability: number;
  category: string;
};

type DashboardData = {
  reviewQueue: ReviewItem[];
  newProblems: NewProblem[];
  totalProblems: number;
  attemptedCount: number;
  retainedCount: number;
  readiness: ReadinessResult;
  readinessBreakdown: { coverage: number; retention: number; categoryBalance: number; consistency: number };
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
  masteredCount: number;
  learningCount: number;
  masteryList: MasteryItem[];
  learningList: MasteryItem[];
  completedProblems: CompletedItem[];
  importProblems: {
    id: number;
    title: string;
    leetcodeNumber: number | null;
    difficulty: "Easy" | "Medium" | "Hard";
    category: string;
    optimalTimeComplexity: string | null;
    optimalSpaceComplexity: string | null;
  }[];
  importAttemptedIds: number[];
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

function retentionLabel(r: number, bestQuality?: string | null): string {
  if (bestQuality === "NONE") return "Unsolved";
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

function daysAgoLabel(date: string | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const localNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((localNow.getTime() - localDate.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function priorityLevel(item: ReviewItem): "critical" | "high" | "medium" | "due" {
  if (item.daysOverdue > 5 || item.retrievability < 0.25) return "critical";
  if (item.daysOverdue > 1 || item.retrievability < 0.45) return "high";
  if (item.daysOverdue > 0) return "medium";
  return "due";
}

const PRIORITY_BG: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-400 text-black",
  due: "bg-sky-500 text-white",
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  due: "bg-sky-400",
};

const DIFF_ORDER: Record<string, number> = { Hard: 0, Medium: 1, Easy: 2 };

/* ── Default target: September 1 of current year (or next year if past) ── */
function getDefaultTargetDate(): string {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-09-01`;
}

/* ── Main Component ── */

export function DashboardClient({ data }: { data: DashboardData }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [srsBanner, setSrsBanner] = useState<{ oldS: number; newS: number; next: string; pct: number; attemptId: string; pName: string; pNum: string } | null>(null);
  const [targetDate, setTargetDate] = useState(getDefaultTargetDate());
  const [targetCount, setTargetCount] = useState(150);
  const [showSettings, setShowSettings] = useState(false);
  const [categoryView, setCategoryView] = useState<"weak" | "all">("weak");
  const [listMode, setListMode] = useState<ListMode>("review");
  const [reviewSort, setReviewSort] = useState<ReviewSort>("overdue");
  const [newSort, setNewSort] = useState<NewSort>("curriculum");
  const [completedSort, setCompletedSort] = useState<CompletedSort>("retention");
  const [queueSearch, setQueueSearch] = useState("");

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

  // SRS feedback banner from attempt redirect
  useEffect(() => {
    const oldS = searchParams.get("oldS");
    const newS = searchParams.get("newS");
    const next = searchParams.get("next");
    const pct = searchParams.get("pct");
    const attemptId = searchParams.get("attemptId");
    const pName = searchParams.get("pName");
    const pNum = searchParams.get("pNum");
    if (oldS && newS && next && pct && attemptId) {
      setSrsBanner({ oldS: Number(oldS), newS: Number(newS), next, pct: Number(pct), attemptId, pName: pName ?? "", pNum: pNum ?? "" });
      // Clean URL without reload
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, router]);

  // Auto-dismiss SRS banner after 8s
  useEffect(() => {
    if (!srsBanner) return;
    const timer = setTimeout(() => setSrsBanner(null), 8000);
    return () => clearTimeout(timer);
  }, [srsBanner]);

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

    // Capacity-adjusted projection: simulate day-by-day
    // Each day, review load from learning problems eats into daily capacity.
    // Remaining capacity goes to new problems. New problems enter learning pool.
    const dailyCapacity = data.avgPerDay;
    const MASTERY_THRESHOLD = 30;

    // Compute average stability of learning problems (used for review frequency estimate)
    const avgLearningStability = data.learningList.length > 0
      ? data.learningList.reduce((sum, p) => sum + p.stability, 0) / data.learningList.length
      : 3; // conservative default for new users

    let learning = data.learningCount;
    let mastered = data.masteredCount;
    let projectedNew = 0;

    // Track stability growth: on average, each review multiplies stability by ~2.5
    // (solved + optimal). A problem "graduates" to mastered when stability >= 30.
    // Avg reviews to mastery from current avg stability:
    let currentAvgStability = avgLearningStability;

    for (let day = 0; day < daysLeft; day++) {
      // Daily reviews needed: each learning problem needs a review every ~stability days
      // Mastered problems rarely need review (every 30+ days)
      const dailyReviews = (learning > 0 ? learning / Math.max(1, currentAvgStability) : 0)
        + (mastered > 0 ? mastered / MASTERY_THRESHOLD : 0);
      const availableForNew = Math.max(0, dailyCapacity - dailyReviews);
      const newToday = Math.min(availableForNew, remaining - projectedNew);

      if (newToday <= 0 && dailyReviews >= dailyCapacity) {
        // Capacity fully consumed by reviews — but stability grows over time
        // so review load will decrease. Keep simulating.
      }

      projectedNew += newToday;
      learning += newToday;

      // Stability grows with each review cycle — problems get easier over time
      // Conservative: avg stability grows ~15% per day of reviews across the pool
      if (learning > 0 && dailyReviews > 0) {
        const reviewedFraction = Math.min(1, dailyReviews / learning);
        // Each reviewed problem's stability grows by ~2.5x, averaged across pool
        currentAvgStability += reviewedFraction * (currentAvgStability * 0.15);
        currentAvgStability = Math.min(currentAvgStability, MASTERY_THRESHOLD * 2);

        // Graduate problems to mastered as avg stability grows
        if (currentAvgStability >= MASTERY_THRESHOLD && learning > 0) {
          // Estimate fraction that would graduate
          const graduateRate = Math.min(learning, Math.ceil(learning * 0.05));
          learning -= graduateRate;
          mastered += graduateRate;
        }
      }
    }

    const projectedRaw = data.attemptedCount + Math.round(projectedNew);
    const projected = Math.min(targetCount, projectedRaw);
    const onTrack = projectedRaw >= targetCount;
    const neededPerDay = daysLeft > 0 ? remaining / daysLeft : remaining;
    return { daysLeft, remaining, projected, projectedRaw, onTrack, neededPerDay };
  }, [targetDate, targetCount, data.attemptedCount, data.avgPerDay, data.learningCount, data.masteredCount, data.learningList]);

  const weakCategories = useMemo(() =>
    [...data.categoryStats]
      .filter(c => c.attempted > 0)
      .sort((a, b) => a.avgRetention - b.avgRetention)
      .slice(0, 6),
    [data.categoryStats],
  );

  const displayCategories = categoryView === "weak" ? weakCategories : data.categoryStats;

  const sortedReviewQueue = useMemo(() => {
    const q = [...data.reviewQueue];
    if (reviewSort === "overdue") {
      q.sort((a, b) => b.daysOverdue - a.daysOverdue || DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    } else if (reviewSort === "difficulty") {
      q.sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty] || b.daysOverdue - a.daysOverdue);
    } else {
      q.sort((a, b) => a.category.localeCompare(b.category) || b.daysOverdue - a.daysOverdue);
    }
    return q;
  }, [data.reviewQueue, reviewSort]);

  const sortedNewProblems = useMemo(() => {
    const q = [...data.newProblems];
    if (newSort === "hardest") {
      q.sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    }
    // "curriculum" = default order from server (already sorted by id)
    return q;
  }, [data.newProblems, newSort]);

  const filteredReviewQueue = useMemo(() => {
    if (!queueSearch.trim()) return sortedReviewQueue;
    const s = queueSearch.toLowerCase();
    return sortedReviewQueue.filter(
      (item) => item.title.toLowerCase().includes(s) || String(item.leetcodeNumber ?? "").includes(s),
    );
  }, [sortedReviewQueue, queueSearch]);

  const filteredNewProblems = useMemo(() => {
    if (!queueSearch.trim()) return sortedNewProblems;
    const s = queueSearch.toLowerCase();
    return sortedNewProblems.filter(
      (p) => p.title.toLowerCase().includes(s) || String(p.leetcodeNumber ?? "").includes(s),
    );
  }, [sortedNewProblems, queueSearch]);

  const sortedCompleted = useMemo(() => {
    const q = [...data.completedProblems];
    if (completedSort === "retention") {
      q.sort((a, b) => b.retrievability - a.retrievability);
    } else if (completedSort === "review-date") {
      q.sort((a, b) => (a.daysUntilReview ?? 999) - (b.daysUntilReview ?? 999));
    } else {
      q.sort((a, b) => a.category.localeCompare(b.category) || b.retrievability - a.retrievability);
    }
    return q;
  }, [data.completedProblems, completedSort]);

  const filteredCompleted = useMemo(() => {
    if (!queueSearch.trim()) return sortedCompleted;
    const s = queueSearch.toLowerCase();
    return sortedCompleted.filter(
      (p) => p.title.toLowerCase().includes(s) || String(p.leetcodeNumber ?? "").includes(s),
    );
  }, [sortedCompleted, queueSearch]);

  return (
    <div className="h-[calc(100dvh-120px)]">
    {/* SRS Feedback Banner */}
    {srsBanner && <SrsFeedbackBanner {...srsBanner} onDismiss={() => setSrsBanner(null)} onUndo={async () => {
      if (!srsBanner.attemptId) return;
      const res = await fetch(`/api/attempts?id=${srsBanner.attemptId}`, { method: "DELETE" });
      if (res.ok) {
        setSrsBanner(null);
        window.location.reload();
      }
    }} />}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 h-full min-h-0 lg:grid-rows-1">
      {/* ── Combined Problem Queue ── */}
      <div className="flex flex-col min-h-0 lg:col-span-6">
        <section className="flex flex-col flex-1 min-h-0">
          {/* Tab header — row 1: tabs + search/browse always visible */}
          <div className="flex flex-col gap-1.5 mb-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-0.5 rounded-md border border-border p-0.5">
                <button
                  onClick={() => setListMode("review")}
                  className={`text-sm px-2.5 py-1 rounded transition-colors ${listMode === "review" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Review
                  {data.reviewQueue.length > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${listMode === "review" ? "bg-accent-foreground/20" : "bg-muted"}`}>
                      {data.reviewQueue.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setListMode("new")}
                  className={`text-sm px-2.5 py-1 rounded transition-colors ${listMode === "new" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  New
                  {data.newProblems.length > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${listMode === "new" ? "bg-accent-foreground/20" : "bg-muted"}`}>
                      {data.newProblems.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setListMode("completed")}
                  className={`text-sm px-2.5 py-1 rounded transition-colors ${listMode === "completed" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Done
                  {data.completedProblems.length > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${listMode === "completed" ? "bg-accent-foreground/20" : "bg-muted"}`}>
                      {data.completedProblems.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setListMode("import")}
                  className={`text-sm px-2.5 py-1 rounded transition-colors ${listMode === "import" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Import
                </button>
              </div>
              {/* Search + Browse — always visible */}
              <div className="flex items-center gap-1.5 shrink-0">
                {listMode !== "import" && (
                  <input
                    type="text"
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    placeholder="Filter…"
                    className="h-7 w-24 rounded border border-border bg-background px-2 text-xs placeholder:text-muted-foreground focus:outline-none"
                  />
                )}
                {listMode === "new" && (
                  <Link href="/problems" className="text-xs text-accent hover:underline shrink-0">
                    Browse all →
                  </Link>
                )}
              </div>
            </div>
            {/* Row 2: sort pills — left-aligned, unobtrusive */}
            {listMode === "review" && (
              <div className="flex gap-1">
                {(["overdue", "difficulty", "category"] as ReviewSort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setReviewSort(s)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      reviewSort === s
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "overdue" ? "Oldest" : s === "difficulty" ? "Hardest" : "Category"}
                  </button>
                ))}
              </div>
            )}
            {listMode === "new" && (
              <div className="flex gap-1">
                {(["curriculum", "hardest"] as NewSort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setNewSort(s)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      newSort === s
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "curriculum" ? "Curriculum order" : "Hardest first"}
                  </button>
                ))}
              </div>
            )}
            {listMode === "completed" && (
              <div className="flex gap-1">
                {(["retention", "review-date", "category"] as CompletedSort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setCompletedSort(s)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      completedSort === s
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "retention" ? "Strongest" : s === "review-date" ? "Next review" : "Category"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Review list */}
          {listMode === "review" && (
            data.reviewQueue.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted p-6 text-center">
                <p className="text-sm text-muted-foreground">All caught up! No reviews due.</p>
                <button onClick={() => setListMode("new")} className="mt-2 text-xs text-accent hover:underline">
                  Start a new problem →
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 min-h-0">
                  {filteredReviewQueue.map((item) => {
                    const prio = priorityLevel(item);
                    return (
                      <div
                        key={item.stateId}
                        className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted transition-colors duration-150"
                      >
                        <StatusDot
                          color={PRIORITY_DOT[prio]}
                          label={prio === "critical" ? "Critical" : prio === "high" ? "Overdue" : prio === "medium" ? "Soon" : "Due"}
                          retrievability={item.retrievability}
                          daysOverdue={item.daysOverdue}
                          priority={prio}
                        />
                        <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{item.leetcodeNumber}</span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/problems/${item.problemId}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                            {item.title}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {item.category} · {item.totalAttempts} attempt{item.totalAttempts !== 1 ? "s" : ""} · Last: {daysAgoLabel(item.lastReviewedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${PRIORITY_BG[prio]}`}>
                            {item.daysOverdue > 0 ? `${item.daysOverdue}d overdue` : "Due today"}
                          </span>
                          <DifficultyBadge difficulty={item.difficulty} />
                          <Link
                            href={`/problems/${item.problemId}/attempt`}
                            className="inline-flex h-7 items-center rounded-md bg-accent px-3 text-xs text-accent-foreground transition-colors hover:opacity-90"
                          >
                            Review
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* New problems list */}
          {listMode === "new" && (
            data.newProblems.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted p-6 text-center">
                <p className="text-sm text-muted-foreground">You&apos;ve attempted every problem!</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 min-h-0">
                  {filteredNewProblems.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted transition-colors duration-150"
                    >
                      <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{p.leetcodeNumber}</span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/problems/${p.id}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                          {p.title}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{p.category}</span>
                          {p.blind75 && <span className="text-xs font-medium text-violet-500">B75</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <DifficultyBadge difficulty={p.difficulty} />
                        <Link
                          href={`/problems/${p.id}/attempt`}
                          className="inline-flex h-7 items-center rounded-md border border-border px-3 text-xs text-foreground transition-colors hover:bg-muted"
                        >
                          Start
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Completed problems list */}
          {listMode === "completed" && (
            data.completedProblems.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted p-6 text-center">
                <p className="text-sm text-muted-foreground">No completed problems yet. Start reviewing!</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 min-h-0">
                  {filteredCompleted.map((item) => (
                    <div
                      key={item.problemId}
                      className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted transition-colors duration-150"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${item.bestQuality === "NONE" ? "bg-red-500" : item.stability >= 30 ? "bg-green-500" : retentionBarColor(item.retrievability)}`} />
                      <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{item.leetcodeNumber}</span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/problems/${item.problemId}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                          {item.title}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {item.category} · {item.totalAttempts} attempt{item.totalAttempts !== 1 ? "s" : ""} · Last: {daysAgoLabel(item.lastReviewedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-medium tabular-nums ${retentionColor(item.bestQuality === "NONE" ? 0 : item.retrievability)}`}>
                          {retentionLabel(item.retrievability, item.bestQuality)}
                        </span>
                        <DifficultyBadge difficulty={item.difficulty} />
                        {item.isDue ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-500 font-medium">
                            Due
                          </span>
                        ) : item.daysUntilReview != null && item.daysUntilReview > 0 ? (
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {item.daysUntilReview}d
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Import tab */}
          {listMode === "import" && (
            <ImportClient
              embedded
              onDone={() => setListMode("review")}
              allProblems={data.importProblems}
              attemptedIds={data.importAttemptedIds}
            />
          )}
        </section>
      </div>

      {/* ── Right Column ── */}
      <div className="space-y-3 lg:col-span-6 overflow-y-auto min-h-0">
        {/* Countdown */}
        <section className="rounded-lg border border-border bg-muted p-3">
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
              <span>On track — projected {countdown.projectedRaw} by target date</span>
            ) : (
              <span>Behind — projected {countdown.projectedRaw}, need {countdown.neededPerDay.toFixed(1)} new/day ({data.avgPerDay.toFixed(1)} total/day capacity)</span>
            )}
          </div>

          {/* Compact stats strip */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${TIER_COLORS[data.readiness.tier]}`}>
                {data.readiness.tier}
              </span>
              <span className="text-xs text-muted-foreground">Readiness</span>
              <InfoTooltip
                content={
                  <div className="space-y-1.5">
                    <p className="font-medium">Readiness Score ({data.readiness.score}/100)</p>
                    <p>Measures how prepared you are overall, based on:</p>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between"><span>Coverage (30%)</span><span>{Math.round(data.readinessBreakdown.coverage * 100)}%</span></div>
                      <div className="flex justify-between"><span>Retention (40%)</span><span>{Math.round(data.readinessBreakdown.retention * 100)}%</span></div>
                      <div className="flex justify-between"><span>Category Balance (20%)</span><span>{Math.round(data.readinessBreakdown.categoryBalance * 100)}%</span></div>
                      <div className="flex justify-between"><span>Consistency (10%)</span><span>{Math.round(data.readinessBreakdown.consistency * 100)}%</span></div>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1">S ≥ 90 · A ≥ 75 · B ≥ 55 · C ≥ 35 · D &lt; 35</p>
                  </div>
                }
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs leading-none">🔥</span>
              <span className="text-xs font-semibold tabular-nums">{data.currentStreak}</span>
              <span className="text-xs text-muted-foreground">streak</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold tabular-nums">{data.avgPerDay.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">/day</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-semibold tabular-nums ${countdown.onTrack ? "text-green-500" : "text-orange-500"}`}>{countdown.projectedRaw}</span>
              <span className="text-xs text-muted-foreground">projected</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold">{formatMinutes(data.totalSolveMinutes)}</span>
              <span className="text-xs text-muted-foreground">solved</span>
            </div>
            {data.avgConfidence > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold tabular-nums">{data.avgConfidence.toFixed(1)}/5</span>
                <span className="text-xs text-muted-foreground">conf</span>
              </div>
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



        {/* Activity Chart */}
        <section className="rounded-lg border border-border bg-muted p-3 shrink-0">
          <p className="text-xs font-medium text-muted-foreground mb-2">Activity (14 days)</p>
          <ActivityChart history={data.attemptHistory} />
        </section>

        {/* Mastery Progress */}
        <section className="rounded-lg border border-border bg-muted p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-xs font-medium text-muted-foreground">Mastery Progress</p>
            <InfoTooltip
              content={
                <div className="space-y-1.5">
                  <p className="font-medium">Problem Mastery</p>
                  <p>A problem is <span className="text-green-400 font-medium">mastered</span> when its stability reaches 30+ days — meaning the SRS won&apos;t schedule it again for at least a month.</p>
                  <p><span className="text-accent font-medium">Learning</span> problems have been attempted but haven&apos;t reached that threshold yet.</p>
                  <p className="text-[11px] text-muted-foreground pt-1">Mastered problems only need occasional confirmation to verify retention, especially before interviews.</p>
                </div>
              }
            />
          </div>
          <MasteryProgress
            mastered={data.masteredCount}
            learning={data.learningCount}
            total={data.totalProblems}
            masteryList={data.masteryList}
            learningList={data.learningList}
          />
        </section>

        {/* Category + Difficulty side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Category Breakdown */}
          <section className="rounded-lg border border-border bg-muted p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Categories</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setCategoryView("weak")}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${categoryView === "weak" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Weakest
                </button>
                <button
                  onClick={() => setCategoryView("all")}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${categoryView === "all" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  All
                </button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {displayCategories.map((cat) => (
                <div key={cat.category} className="flex items-center gap-2 group/cat cursor-default">
                  <span className="text-[11px] w-24 shrink-0 truncate group-hover/cat:text-foreground transition-colors" title={cat.category}>{cat.category}</span>
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background group-hover/cat:h-2 transition-all duration-150">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${retentionBarColor(cat.avgRetention)}`}
                      style={{ width: `${cat.total > 0 ? Math.round((cat.attempted / cat.total) * 100) : 0}%` }}
                    />
                  </div>
                  <span className={`text-[11px] w-10 text-right shrink-0 tabular-nums transition-colors ${cat.attempted > 0 ? retentionColor(cat.avgRetention) : "text-muted-foreground"}`}>
                    <span className="group-hover/cat:hidden">{cat.attempted}/{cat.total}</span>
                    <span className="hidden group-hover/cat:inline">{cat.attempted > 0 ? `${Math.round(cat.avgRetention * 100)}%` : "—"}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Difficulty Progress */}
          <section className="rounded-lg border border-border bg-muted p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Difficulty</p>
            <div className="space-y-2.5">
              {data.difficultyBreakdown.map((d) => {
                const pct = d.count > 0 ? Math.round((d.attempted / d.count) * 100) : 0;
                return (
                  <div key={d.difficulty} className="flex items-center gap-2 group/diff cursor-default">
                    <span className="text-[11px] w-12 shrink-0 group-hover/diff:text-foreground transition-colors">{d.difficulty}</span>
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background group-hover/diff:h-2 transition-all duration-150">
                      <div className={`h-full rounded-full transition-all duration-300 ${DIFF_COLORS[d.difficulty]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground w-10 text-right tabular-nums">
                      <span className="group-hover/diff:hidden">{d.attempted}/{d.count}</span>
                      <span className="hidden group-hover/diff:inline">{pct}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

      </div>
    </div>
    </div>
  );
}

/* ── Activity Chart ── */

function ActivityChart({ history }: { history: AttemptDay[] }) {
  const max = Math.max(...history.map((d) => d.count), 1);
  const MAX_BAR_PX = 44;
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex items-end gap-0.5">
      {history.map((day) => {
        const barPx = day.count > 0
          ? Math.max(Math.round((day.count / max) * MAX_BAR_PX), 4)
          : 3;
        const [, m, dd] = day.date.split("-");
        const label = `${parseInt(m)}/${parseInt(dd)}`;
        const isToday = day.date === todayStr;
        return (
          <Link
            key={day.date}
            href={`/activity?date=${day.date}`}
            className="flex flex-1 flex-col items-center justify-end gap-0.5 cursor-pointer group"
            style={{ minHeight: MAX_BAR_PX + 28 }}
          >
            {day.count > 0 && (
              <span className="text-[10px] text-muted-foreground leading-none tabular-nums group-hover:text-foreground transition-colors">{day.count}</span>
            )}
            <div
              className={`w-full rounded-t-sm transition-all duration-150 group-hover:scale-x-110 group-hover:brightness-125 ${day.count > 0 ? "bg-accent" : "bg-border/40 group-hover:bg-border/60"}`}
              style={{ height: `${barPx}px` }}
            />
            <span className={`text-[9px] leading-none tabular-nums transition-colors ${isToday ? "text-accent font-semibold" : "text-muted-foreground group-hover:text-foreground"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Review Urgency Bar ── */

function ReviewUrgencyBar({ queue }: { queue: ReviewItem[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const counts = { critical: 0, high: 0, medium: 0, due: 0 };
  queue.forEach(item => { counts[priorityLevel(item)]++; });
  const total = queue.length;

  const segments = [
    { key: "critical", label: "Critical", desc: "5+ days overdue or <25% retention", color: "bg-red-500", count: counts.critical },
    { key: "high", label: "Overdue", desc: "1-5 days overdue or <45% retention", color: "bg-orange-500", count: counts.high },
    { key: "medium", label: "Soon", desc: "Due within a day", color: "bg-amber-400", count: counts.medium },
    { key: "due", label: "Due", desc: "Due today", color: "bg-sky-400", count: counts.due },
  ].filter(s => s.count > 0);

  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-background">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`${s.color} transition-all duration-300 cursor-pointer ${hovered && hovered !== s.key ? "opacity-40" : ""}`}
            style={{ width: `${(s.count / total) * 100}%` }}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
      <div className="flex gap-3 mt-1.5">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`flex items-center gap-1 transition-opacity duration-150 ${hovered && hovered !== s.key ? "opacity-40" : ""}`}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
            <span className="text-[10px] text-muted-foreground">
              {s.count} {s.label}
              {hovered === s.key && <span className="text-foreground/60"> — {s.desc}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Status Dot (hover tooltip) ── */

function StatusDot({
  color,
  label,
  retrievability,
  daysOverdue,
  priority,
}: {
  color: string;
  label: string;
  retrievability: number;
  daysOverdue: number;
  priority: "critical" | "high" | "medium" | "due";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    }
  }, []);

  const sizeClass = priority === "critical" ? "w-2.5 h-2.5" : "w-2 h-2";
  const pulseClass = priority === "critical" ? "dot-critical" : "";
  const ringClass = priority === "high" ? "ring-1 ring-orange-500/50" : "";

  return (
    <div
      ref={ref}
      className={`${sizeClass} rounded-full shrink-0 cursor-help ${color} ${pulseClass} ${ringClass}`}
      onMouseEnter={() => { updatePos(); setOpen(true); }}
      onMouseLeave={() => setOpen(false)}
    >
      {open && pos && createPortal(
        <div
          className="fixed z-[9999] w-44 rounded-lg border border-border bg-muted p-2.5 text-xs text-foreground shadow-lg"
          style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
        >
          <p className="font-medium mb-1">{label}</p>
          <div className="space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Retention</span>
              <span className={retentionColor(retrievability)}>{Math.round(retrievability * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overdue</span>
              <span>{daysOverdue > 0 ? `${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}` : "Due today"}</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
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

/* ── Info Tooltip ── */

function InfoTooltip({ content }: { content: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const updatePos = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    }
  }, []);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => { updatePos(); setOpen(true); }}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-muted-foreground/40 text-[9px] text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors cursor-help"
        aria-label="More info"
      >
        i
      </span>
      {open && pos && createPortal(
        <div
          className="fixed z-[9999] w-64 rounded-lg border border-border bg-muted p-3 text-xs text-foreground shadow-lg"
          style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
        >
          {content}
        </div>,
        document.body,
      )}
    </span>
  );
}

/* ── Mastery Progress ── */

const MASTERY_THRESHOLD = 30; // stability in days

function MasteryProgress({
  mastered,
  learning,
  total,
  masteryList,
  learningList,
}: {
  mastered: number;
  learning: number;
  total: number;
  masteryList: MasteryItem[];
  learningList: MasteryItem[];
}) {
  const [showAll, setShowAll] = useState(false);
  const newCount = total - mastered - learning;
  const masteredPct = total > 0 ? (mastered / total) * 100 : 0;
  const learningPct = total > 0 ? (learning / total) * 100 : 0;
  const displayLearning = showAll ? learningList : learningList.slice(0, 5);

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-2.5 overflow-hidden rounded-full bg-background group/mastery cursor-default">
        {masteredPct > 0 && (
          <div className="bg-green-500 transition-all duration-300 group-hover/mastery:brightness-125" style={{ width: `${masteredPct}%` }} />
        )}
        {learningPct > 0 && (
          <div className="bg-accent transition-all duration-300 group-hover/mastery:brightness-125" style={{ width: `${learningPct}%` }} />
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-1.5">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[11px] text-muted-foreground">{mastered} Mastered <span className="text-foreground/50">({masteredPct.toFixed(0)}%)</span></span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-[11px] text-muted-foreground">{learning} Learning</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-border" />
          <span className="text-[11px] text-muted-foreground">{newCount} New</span>
        </div>
      </div>

      {/* Recently mastered list */}
      {masteryList.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground mb-1">Recently mastered</p>
          <div className="space-y-0.5">
            {masteryList.slice(0, 5).map((item) => (
              <div key={item.leetcodeNumber ?? item.title} className="flex items-center gap-1.5 text-xs">
                <span className="text-green-500">✓</span>
                <span className="text-muted-foreground tabular-nums w-6 shrink-0">{item.leetcodeNumber}</span>
                <span className="truncate">{item.title}</span>
                <span className="ml-auto text-muted-foreground text-[11px]">{Math.round(item.stability)}d</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning problems — stability progress toward 30d */}
      {learningList.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground mb-1">Learning — stability toward 30d</p>
          <div className="space-y-1">
            {displayLearning.map((item) => {
              const pct = Math.min(100, (item.stability / MASTERY_THRESHOLD) * 100);
              return (
                <div key={item.leetcodeNumber ?? item.title} className="flex items-center gap-1.5 text-xs group/learn">
                  <span className="text-muted-foreground tabular-nums w-6 shrink-0">{item.leetcodeNumber}</span>
                  <span className="w-32 shrink-0 truncate group-hover/learn:text-foreground transition-colors" title={item.title}>{item.title}</span>
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background group-hover/learn:h-2 transition-all duration-150">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-[11px] tabular-nums w-10 text-right shrink-0">{item.stability.toFixed(1)}d</span>
                </div>
              );
            })}
          </div>
          {learningList.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[11px] text-muted-foreground hover:text-foreground mt-1"
            >
              {showAll ? "Show less" : `Show all ${learningList.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── SRS Feedback Banner ── */

function SrsFeedbackBanner({
  oldS,
  newS,
  next,
  pct,
  attemptId,
  pName,
  pNum,
  onDismiss,
  onUndo,
}: {
  oldS: number;
  newS: number;
  next: string;
  pct: number;
  attemptId: string;
  pName: string;
  pNum: string;
  onDismiss: () => void;
  onUndo: () => void;
}) {
  const nextDate = new Date(next);
  const now = new Date();
  const diffDays = Math.round((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const nextLabel = diffDays <= 0 ? "now" : diffDays === 1 ? "tomorrow" : `in ${diffDays}d`;
  const grew = newS > oldS;
  const isFirst = oldS === 0;
  const problemLabel = pNum ? `${pNum}. ${pName}` : pName;

  return (
    <div className="mb-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 flex items-center gap-4 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <span className="text-foreground font-medium shrink-0">{problemLabel || "Saved"}</span>
      <span className="text-muted-foreground">
        Stability{" "}
        {isFirst ? (
          <span className="text-accent font-medium">{newS}d</span>
        ) : (
          <>
            {oldS}d → <span className={grew ? "text-green-500 font-medium" : "text-orange-500 font-medium"}>{newS}d</span>
          </>
        )}
      </span>
      <span className="text-muted-foreground">Next: {nextLabel}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-green-500" : "bg-accent"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">{pct}%</span>
      </div>
      <button onClick={onUndo} className="text-orange-500 hover:text-orange-400 text-xs font-medium shrink-0">Undo</button>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
    </div>
  );
}
