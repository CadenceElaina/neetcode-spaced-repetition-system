"use client";

import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Target, X } from "lucide-react";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ImportClient } from "@/app/import/import-client";
import { LogAttemptModal, type LogModalProblem, type LogModalResult } from "@/components/log-attempt-modal";
import { Onboarding } from "@/components/onboarding";
import { SkyCanvas } from "@/components/sky-canvas";

/* ── Types ── */

type ReviewItem = {
  stateId: string;
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  neetcodeUrl: string | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  totalAttempts: number;
  daysOverdue: number;
  retrievability: number;
  stability: number;
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

type ListMode = "review" | "new" | "completed" | "import" | "mock";
type MockPhase = "setup" | "active" | "finished";
type ReviewSort = "urgency" | "overdue" | "difficulty" | "category";
type NewDifficultyFilter = "all" | "easy" | "easy-medium" | "medium" | "hard";
type CompletedSort = "retention" | "review-date" | "category";

type NewProblem = {
  id: number;
  leetcodeNumber: number | null;
  title: string;
  neetcodeUrl: string | null;
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
  newCount: number;
  reviewCount: number;
};

type ReadinessResult = {
  score: number;
  tier: "S" | "A" | "B" | "C" | "D";
};

type MasteryItem = {
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  stability: number;
  category: string;
};

type PendingItem = {
  id: string;
  problemId: number;
  problemTitle: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  isReview: boolean;
  detectedAt: string;
};

type DeferredItem = {
  stateId: string;
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  totalAttempts: number;
  stability: number;
  deferredUntil: string | null;
  isAutoDeferred: boolean;
};

type MockCandidate = {
  id: number;
  leetcodeNumber: number | null;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  leetcodeUrl: string;
  neetcodeUrl: string | null;
};

type DashboardData = {
  reviewQueue: ReviewItem[];
  deferredProblems: DeferredItem[];
  autoDeferHards: boolean;
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
  avgReviewPerDay: number;
  overallPerDay: number;
  overallNewPerDay: number;
  overallReviewPerDay: number;
  categoryStats: CategoryStat[];
  difficultyBreakdown: DifficultyBreakdown[];
  attemptHistory: AttemptDay[];
  fullAttemptHistory: AttemptDay[];
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
  }[];
  importAttemptedIds: number[];
  importTodayAttemptedIds: number[];
  pendingSubmissions: PendingItem[];
  mockCandidates: MockCandidate[];
};

type QueueProjection = {
  currentSize: number;
  dailyQueueSize: number[];
  clearDay: number | null;
  reviewsPerDay: number;
  newPerDay: number;
};

type QueueStability = {
  avg14: number;
  max14: number;
  end14: number;
  growth14: number;
  slope14: number;
  firstWeekSlope: number;
  secondWeekSlope: number;
  acceleration: number;
  avgLoadDays: number;
  peakLoadDays: number;
};

type PracticeRecommendation = {
  tone: "neutral" | "good" | "watch" | "danger";
  title: string;
  body: string;
  reason: string;
  actionLabel: string;
  actionMode: ListMode;
  metrics?: QueueStability;
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

function pickMockProblems(candidates: MockCandidate[]): MockCandidate[] {
  const mediums = candidates.filter((p) => p.difficulty === "Medium");
  const hards = candidates.filter((p) => p.difficulty === "Hard");
  const pick = (arr: MockCandidate[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;
  return [pick(mediums), pick(hards)].filter(Boolean) as MockCandidate[];
}

/* ── Default target: September 1 of current year (or next year if past) ── */
function getDefaultTargetDate(): string {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-09-01`;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function queueStability(projection: QueueProjection): QueueStability {
  const days = projection.dailyQueueSize;
  const first14 = days.slice(0, 14);
  const firstWeek = days.slice(0, 7);
  const secondWeek = days.slice(7, 14);
  const start = days[0] ?? 0;
  const end14 = first14[first14.length - 1] ?? start;
  const firstWeekSlope = firstWeek.length > 1 ? (firstWeek[firstWeek.length - 1] - firstWeek[0]) / (firstWeek.length - 1) : 0;
  const secondWeekSlope = secondWeek.length > 1 ? (secondWeek[secondWeek.length - 1] - secondWeek[0]) / (secondWeek.length - 1) : 0;
  const slope14 = first14.length > 1 ? (end14 - start) / (first14.length - 1) : 0;
  const avg14 = avg(first14);
  const max14 = Math.max(...first14, 0);
  const reviewsPerDay = Math.max(1, projection.reviewsPerDay);

  return {
    avg14,
    max14,
    end14,
    growth14: end14 - start,
    slope14,
    firstWeekSlope,
    secondWeekSlope,
    acceleration: secondWeekSlope - firstWeekSlope,
    avgLoadDays: avg14 / reviewsPerDay,
    peakLoadDays: max14 / reviewsPerDay,
  };
}

function queueForecastStatus(projection: QueueProjection): { label: string; className: string } {
  if (projection.clearDay !== null && projection.clearDay >= 0) {
    return {
      label: projection.clearDay === 0 ? "Clears today" : `Clears in ~${projection.clearDay}d`,
      className: "text-green-500",
    };
  }

  const start = projection.dailyQueueSize[0] ?? projection.currentSize;
  const end = projection.dailyQueueSize[projection.dailyQueueSize.length - 1] ?? start;
  const max = Math.max(...projection.dailyQueueSize, start);
  const growing = end > start || max > start * 1.25;

  return growing
    ? { label: "Growing", className: "text-orange-400" }
    : { label: "No clear date in 30d", className: "text-amber-500" };
}

function computePracticeRecommendation({
  data,
  countdown,
  goalType,
  actualProjection,
}: {
  data: DashboardData;
  countdown: { daysLeft: number; remaining: number; onTrack: boolean; neededPerDay: number };
  goalType: "blind75" | "neetcode150" | "none";
  actualProjection: QueueProjection | null;
}): PracticeRecommendation {
  const targetLabel = goalType === "blind75" ? "Blind 75" : goalType === "neetcode150" ? "NeetCode 150" : "your log";
  const requiredNewPerDay = countdown.daysLeft > 0 ? countdown.remaining / countdown.daysLeft : countdown.remaining;
  const behindCoverage = goalType !== "none" && countdown.remaining > 0 && requiredNewPerDay > Math.max(0.1, data.avgNewPerDay) * 1.25;
  const retentionRisk = data.readinessBreakdown.retention < 0.5 && data.attemptedCount >= 5;
  const weakCategoryRisk = data.readinessBreakdown.categoryBalance < 0.45 && data.attemptedCount >= 8;
  const dataLight = data.attemptedCount < 5;

  if (goalType === "none") {
    return {
      tone: "neutral",
      title: "Track freely",
      body: "No target is selected, so Aurora will keep scheduling future reviews without pushing coverage pace.",
      reason: "Use this mode when you mainly want logging and long-term review timing.",
      actionLabel: "Browse problems",
      actionMode: "new",
    };
  }

  if (data.attemptedCount === 0) {
    return {
      tone: "neutral",
      title: "Start with new coverage",
      body: `Aurora needs a few logged attempts before it can judge review load for ${targetLabel}.`,
      reason: "Start with an Easy or familiar Medium, then log honestly so the forecast has signal.",
      actionLabel: "Browse new",
      actionMode: "new",
    };
  }

  if (!actualProjection) {
    return {
      tone: behindCoverage ? "watch" : "good",
      title: behindCoverage ? "Push coverage" : "Maintain pace",
      body: behindCoverage
        ? `Reviews are light, but ${targetLabel} needs about ${requiredNewPerDay.toFixed(1)} new/day from here.`
        : "Your review queue is light. Add new problems when you have real focus time, or review weak categories.",
      reason: retentionRisk ? "Retention is still low, so log confidence carefully after each attempt." : "No due-review backlog is currently competing with new coverage.",
      actionLabel: behindCoverage ? "Browse new" : "View done",
      actionMode: behindCoverage ? "new" : "completed",
    };
  }

  const metrics = queueStability(actualProjection);
  const queueHeavy = metrics.peakLoadDays > 2.5;
  const queueCritical = metrics.slope14 >= 2 || (metrics.peakLoadDays > 4 && metrics.slope14 > 0.25) || (metrics.acceleration >= 1.25 && metrics.secondWeekSlope > 1);
  const queueGrowing = metrics.slope14 >= 0.75 || metrics.growth14 >= 8 || metrics.acceleration >= 0.75;
  const queueStable = Math.abs(metrics.slope14) < 0.5 && metrics.peakLoadDays <= 2.5;
  const activeLoadHigh = data.learningCount / Math.max(1, actualProjection.reviewsPerDay) > 14;
  const avgQueueLabel = metrics.avg14.toFixed(metrics.avg14 >= 10 ? 0 : 1);
  const peakQueueLabel = metrics.max14.toFixed(0);

  if (queueCritical) {
    return {
      tone: "danger",
      title: "Review first",
      body: "Your review forecast is rising faster than your recent review capacity. Review first and pause new problems for now.",
      reason: `At your current pace, the next 14 days average ${avgQueueLabel} due reviews and peak near ${peakQueueLabel}.`,
      actionLabel: "Review first",
      actionMode: "review",
      metrics,
    };
  }

  if (queueGrowing || queueHeavy || activeLoadHigh || retentionRisk) {
    const queueEasingButHeavy = queueHeavy && metrics.slope14 < 0.5;
    return {
      tone: "watch",
      title: "Review first",
      body: queueEasingButHeavy
        ? "Your forecast is easing, but the peak review load is still heavy. Review what is due before adding more."
        : "Keep new problems optional until the review forecast flattens. The goal is a sustainable queue, not an empty one.",
      reason: queueEasingButHeavy
        ? `Peak load is about ${metrics.peakLoadDays.toFixed(1)} review-days at your recent pace.`
        : activeLoadHigh
        ? `You have ${data.learningCount} active learning problems, which is a lot for ${actualProjection.reviewsPerDay.toFixed(1)} reviews/day.`
        : retentionRisk
          ? "Retention is below 50%, so adding coverage now may make the queue noisier before it gets useful."
          : `The forecast is growing by about ${metrics.slope14.toFixed(1)} reviews/day over the next two weeks.`,
      actionLabel: "Review queue",
      actionMode: "review",
      metrics,
    };
  }

  if (queueStable && behindCoverage) {
    return {
      tone: "good",
      title: "Add coverage carefully",
      body: `Your review load looks stable, and ${targetLabel} needs about ${requiredNewPerDay.toFixed(1)} new/day from here.`,
      reason: weakCategoryRisk
        ? "Prefer a weak or under-covered category so coverage improves without hiding a blind spot."
        : `Projected due reviews average ${avgQueueLabel}, which is within your recent review capacity.`,
      actionLabel: "Browse new",
      actionMode: "new",
      metrics,
    };
  }

  return {
    tone: dataLight ? "neutral" : "good",
    title: "Keep current pace",
    body: dataLight
      ? "Aurora has limited history, but your current queue does not look unstable yet."
      : "Your queue is active without accelerating. Review what is due, then add new only when you have focus time.",
    reason: `Projected due reviews average ${avgQueueLabel} and peak near ${peakQueueLabel} over the next 14 days.`,
    actionLabel: actualProjection.currentSize > 0 ? "Review queue" : "Browse new",
    actionMode: actualProjection.currentSize > 0 ? "review" : "new",
    metrics,
  };
}

/* ── Main Component ── */

export function DashboardClient({ data, isDemo = false, userId, onboardingComplete = false }: { data: DashboardData; isDemo?: boolean; userId?: string; onboardingComplete?: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [srsBanner, setSrsBanner] = useState<{ oldS: number; newS: number; next: string; pct: number; attemptId: string; pName: string; pNum: string } | null>(null);

  const [targetDate, setTargetDate] = useState(getDefaultTargetDate());
  const [targetCount, setTargetCount] = useState(150);
  const [showSettings, setShowSettings] = useState(false);
  const [categoryView, setCategoryView] = useState<"weak" | "all">("weak");
  const [listMode, setListMode] = useState<ListMode>("review");
  const [goalType, setGoalType] = useState<"blind75" | "neetcode150" | "none">("neetcode150");
  const [reviewSort, setReviewSort] = useState<ReviewSort>("urgency");
  const [newDifficultyFilter, setNewDifficultyFilter] = useState<NewDifficultyFilter>("all");
  const [completedSort, setCompletedSort] = useState<CompletedSort>("retention");
  const [queueSearch, setQueueSearch] = useState("");
  const [showStatsDetail, setShowStatsDetail] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>(data.pendingSubmissions);
  const [logModalProblem, setLogModalProblem] = useState<LogModalProblem | null>(null);
  const [collapsedWidgets, setCollapsedWidgets] = useState<Record<string, boolean>>({});
  const [activityViewMode, setActivityViewMode] = useState<"14d" | "monthly" | "heatmap">("14d");
  const [activityPage, setActivityPage] = useState(0);
  const [deferredItems, setDeferredItems] = useState(data.deferredProblems);
  const [autoDeferHards, setAutoDeferHards] = useState(data.autoDeferHards);
  const [reviewItems, setReviewItems] = useState(data.reviewQueue);
  const [deferSearch, setDeferSearch] = useState("");
  const [showDeferredInline, setShowDeferredInline] = useState(false);
  const [plannedNewPerDay, setPlannedNewPerDay] = useState(1.5);
  const [plannedReviewPerDay, setPlannedReviewPerDay] = useState(5);

  // Mock interview state
  const [mockPhase, setMockPhase] = useState<MockPhase>("setup");
  const [mockDuration, setMockDuration] = useState<30 | 45 | 60>(45);
  const [mockStartedAt, setMockStartedAt] = useState<number | null>(null);
  const [mockTimeLeft, setMockTimeLeft] = useState(45 * 60);
  const [mockSelectedProblems, setMockSelectedProblems] = useState<MockCandidate[]>([]);
  const [mockLoggedIds, setMockLoggedIds] = useState<Set<number>>(new Set());
  const [editingPace, setEditingPace] = useState(false);
  const [showQueueForecast, setShowQueueForecast] = useState(true);
  const [showPracticeRecommendation, setShowPracticeRecommendation] = useState(true);
  const [forecastMode, setForecastMode] = useState<"actual" | "goals">("actual");
  const [countdownTitle, setCountdownTitle] = useState("Fall Recruiting Countdown");
  const [forecastReviewPerDay, setForecastReviewPerDay] = useState(2);
  const [forecastNewPerDay, setForecastNewPerDay] = useState(2);


  const activityData = useMemo(() => {
    if (activityViewMode === "monthly") return data.fullAttemptHistory;
    const total = data.fullAttemptHistory.length;
    const end = activityPage === 0 ? total : total - 14 * activityPage;
    const start = Math.max(0, end - 14);
    return data.fullAttemptHistory.slice(start, end);
  }, [activityViewMode, activityPage, data.fullAttemptHistory]);

  const canGoBack = activityViewMode === "14d" && (activityPage + 1) * 14 < data.fullAttemptHistory.length;
  const canGoForward = activityViewMode === "14d" && activityPage > 0;

  function toggleWidget(key: string) {
    setCollapsedWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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
    const savedGoal = localStorage.getItem("srs_goal_type");
    if (savedGoal && ["blind75", "neetcode150", "none"].includes(savedGoal)) {
      setGoalType(savedGoal as "blind75" | "neetcode150" | "none");
    }
    const savedTab = localStorage.getItem("aurora_tab_mode");
    if (savedTab && ["review", "new", "completed", "import"].includes(savedTab)) {
      setListMode(savedTab as ListMode);
    }
    const savedNewPace = localStorage.getItem("aurora_planned_new_per_day");
    if (savedNewPace) setPlannedNewPerDay(parseFloat(savedNewPace));
    const savedReviewPace = localStorage.getItem("aurora_planned_review_per_day");
    if (savedReviewPace) setPlannedReviewPerDay(parseFloat(savedReviewPace));
    const savedTitle = localStorage.getItem("aurora_countdown_title");
    if (savedTitle) setCountdownTitle(savedTitle);
    // Sync targetCount with saved goalType
    const savedGoalForCount = localStorage.getItem("srs_goal_type");
    if (savedGoalForCount === "blind75" && !saved) setTargetCount(75);
    const savedForecastReview = localStorage.getItem("aurora_forecast_review_per_day");
    if (savedForecastReview) setForecastReviewPerDay(parseInt(savedForecastReview, 10));
    const savedForecastNew = localStorage.getItem("aurora_forecast_new_per_day");
    if (savedForecastNew) setForecastNewPerDay(parseInt(savedForecastNew, 10));
    const savedForecastMode = localStorage.getItem("aurora_forecast_mode");
    if (savedForecastMode === "actual" || savedForecastMode === "goals") {
      setForecastMode(savedForecastMode);
    } else if (reviewItems.length === 0) {
      setForecastMode("goals");
    }
    const savedRecommendation = localStorage.getItem("aurora_show_practice_recommendation");
    if (savedRecommendation === "0") setShowPracticeRecommendation(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist active tab (don't persist mock — always start fresh on load)
  useEffect(() => {
    if (!isDemo && listMode !== "mock") localStorage.setItem("aurora_tab_mode", listMode);
  }, [listMode, isDemo]);

  // Mock interview timer
  useEffect(() => {
    if (mockPhase !== "active" || mockStartedAt === null) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - mockStartedAt) / 1000);
      const left = mockDuration * 60 - elapsed;
      if (left <= 0) {
        setMockTimeLeft(0);
        setMockPhase("finished");
      } else {
        setMockTimeLeft(left);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mockPhase, mockStartedAt, mockDuration]);

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

  function saveSettings(date: string, count: number, title: string) {
    setTargetDate(date);
    setTargetCount(count);
    setCountdownTitle(title);
    localStorage.setItem("srs_target", JSON.stringify({ date, count }));
    localStorage.setItem("aurora_countdown_title", title);
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
    const MASTERY_THRESHOLD = 45;

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
      // Mastered problems rarely need review (every 45+ days)
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
    // Effective needed rate: accounts for review load by computing
    // how many new/day you'd need to actually hit the target
    const shortfall = Math.max(0, remaining - Math.round(projectedNew));
    const neededPerDay = daysLeft > 0 ? (remaining + shortfall) / daysLeft : remaining;
    return { daysLeft, remaining, projected, projectedRaw, onTrack, neededPerDay };
  }, [targetDate, targetCount, data.attemptedCount, data.avgPerDay, data.learningCount, data.masteredCount, data.learningList]);

  // Queue projection: simulate review backlog clearing
  const queueProjection = useMemo(() => {
    const queue = reviewItems.map((r) => ({ stability: r.stability, daysOverdue: r.daysOverdue }));
    if (queue.length === 0) return null;

    const reviewsPerDay = Math.max(0.1, data.avgReviewPerDay);
    const newPerDay = data.avgNewPerDay;
    const AVG_MULTIPLIER = 2.0;

    // Simulate backlog draining only — new items are not included because
    // they generate reviews on their own schedule and are not part of the
    // current overdue pile. Use a fractional accumulator so 1.9 rev/day
    // properly clears 10 items over ~6 days instead of rounding per day.
    type QueueItem = { stability: number; dueInDays: number };
    const items: QueueItem[] = queue.map((q) => ({ stability: q.stability, dueInDays: 0 }));

    const dailyQueueSize: number[] = [];
    const MAX_DAYS = 30;
    let reviewBudget = 0;

    for (let day = 0; day < MAX_DAYS; day++) {
      const due = items.filter((it) => it.dueInDays <= day);
      dailyQueueSize.push(due.length);

      reviewBudget += reviewsPerDay;
      due.sort((a, b) => a.stability - b.stability);
      const toReview = Math.min(Math.floor(reviewBudget), due.length);
      reviewBudget -= toReview;

      const reviewing = due.slice(0, toReview);
      for (const item of reviewing) {
        item.stability = Math.min(365, item.stability * AVG_MULTIPLIER);
        item.dueInDays = day + Math.round(item.stability);
      }
    }

    const clearDay = dailyQueueSize.findIndex((size) => size === 0);

    return {
      currentSize: queue.length,
      dailyQueueSize,
      clearDay: clearDay === -1 ? null : clearDay,
      reviewsPerDay: Math.round(reviewsPerDay * 10) / 10,
      newPerDay: Math.round(newPerDay * 10) / 10,
    };
  }, [reviewItems, data.avgReviewPerDay, data.avgNewPerDay]);

  const queueProjectionGoals = useMemo(() => {
    const queue = reviewItems.map((r) => ({ stability: r.stability, daysOverdue: r.daysOverdue }));
    if (queue.length === 0 && forecastNewPerDay === 0) return null;

    const reviewsPerDay = Math.max(0.1, forecastReviewPerDay);
    const newPerDay = forecastNewPerDay;
    const AVG_MULTIPLIER = 2.0;
    const INITIAL_STABILITY = 2; // days before first review of a new problem

    type QueueItem = { stability: number; dueInDays: number };
    const items: QueueItem[] = queue.map((q) => ({ stability: q.stability, dueInDays: 0 }));

    const dailyQueueSize: number[] = [];
    const MAX_DAYS = 30;
    let reviewBudget = 0;
    let newBudget = 0;

    for (let day = 0; day < MAX_DAYS; day++) {
      // Inject new problems into the simulation so New/d actually affects the chart
      newBudget += newPerDay;
      const toAdd = Math.floor(newBudget);
      newBudget -= toAdd;
      for (let n = 0; n < toAdd; n++) {
        items.push({ stability: INITIAL_STABILITY, dueInDays: day + INITIAL_STABILITY });
      }

      const due = items.filter((it) => it.dueInDays <= day);
      dailyQueueSize.push(due.length);

      reviewBudget += reviewsPerDay;
      due.sort((a, b) => a.stability - b.stability);
      const toReview = Math.min(Math.floor(reviewBudget), due.length);
      reviewBudget -= toReview;

      const reviewing = due.slice(0, toReview);
      for (const item of reviewing) {
        item.stability = Math.min(365, item.stability * AVG_MULTIPLIER);
        item.dueInDays = day + Math.round(item.stability);
      }
    }

    const clearDay = dailyQueueSize.findIndex((size) => size === 0);

    return {
      currentSize: queue.length,
      dailyQueueSize,
      clearDay: clearDay === -1 ? null : clearDay,
      reviewsPerDay: Math.round(reviewsPerDay * 10) / 10,
      newPerDay: Math.round(newPerDay * 10) / 10,
    };
  }, [reviewItems, forecastReviewPerDay, forecastNewPerDay]);

  const practiceRecommendation = useMemo(() => computePracticeRecommendation({
    data,
    countdown,
    goalType,
    actualProjection: queueProjection,
  }), [data, countdown, goalType, queueProjection]);

  const weakCategories = useMemo(() =>
    [...data.categoryStats].sort((a, b) => {
      if (a.attempted === 0 && b.attempted === 0) return 0;
      if (a.attempted === 0) return 1;
      if (b.attempted === 0) return -1;
      return a.avgRetention - b.avgRetention;
    }),
    [data.categoryStats],
  );

  const displayCategories = categoryView === "weak" ? weakCategories : data.categoryStats;

  const sortedReviewQueue = useMemo(() => {
    const q = [...reviewItems];
    if (reviewSort === "urgency") {
      // Lowest stability first (most fragile), then most overdue as tiebreaker
      q.sort((a, b) => a.stability - b.stability || b.daysOverdue - a.daysOverdue);
    } else if (reviewSort === "overdue") {
      q.sort((a, b) => b.daysOverdue - a.daysOverdue || DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    } else if (reviewSort === "difficulty") {
      q.sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty] || b.daysOverdue - a.daysOverdue);
    } else {
      q.sort((a, b) => a.category.localeCompare(b.category) || b.daysOverdue - a.daysOverdue);
    }
    return q;
  }, [reviewItems, reviewSort]);

  const sortedNewProblems = useMemo(() => {
    let q = goalType === "blind75" ? data.newProblems.filter(p => p.blind75) : [...data.newProblems];
    if (newDifficultyFilter === "easy") q = q.filter(p => p.difficulty === "Easy");
    else if (newDifficultyFilter === "easy-medium") q = q.filter(p => p.difficulty === "Easy" || p.difficulty === "Medium");
    else if (newDifficultyFilter === "medium") q = q.filter(p => p.difficulty === "Medium");
    else if (newDifficultyFilter === "hard") q = q.filter(p => p.difficulty === "Hard");
    return q;
  }, [data.newProblems, newDifficultyFilter, goalType]);

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
      q.sort((a, b) => a.retrievability - b.retrievability); // fading first
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

  function handleLoggedFromModal(result: LogModalResult) {
    const problem = logModalProblem;
    setLogModalProblem(null);
    setSrsBanner({
      oldS: result.srs.oldStability,
      newS: result.srs.newStability,
      next: result.srs.nextReviewAt,
      pct: result.srs.masteryPct,
      attemptId: result.attemptId,
      pName: problem?.title ?? "",
      pNum: String(problem?.leetcodeNumber ?? ""),
    });
    // Remove from pending if applicable
    if (problem?.pendingId) {
      setPendingItems((prev) => prev.filter((p) => p.id !== problem.pendingId));
    }
    router.refresh();
  }

  // Demo sign-in prompt overlay
  const [showDemoSignIn, setShowDemoSignIn] = useState(false);

  // ESC to close demo sign-in overlay
  useEffect(() => {
    if (!showDemoSignIn) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDemoSignIn(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showDemoSignIn]);

  function demoGuard(action: () => void) {
    if (isDemo) {
      setShowDemoSignIn(true);
      return;
    }
    action();
  }

  async function handleDefer(problemId: number, until?: string) {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId, action: "defer", ...(until && { until }) }),
    });
    if (!res.ok) return;
    const data_resp = await res.json();
    // Move from review queue to deferred
    const item = reviewItems.find((r) => r.problemId === problemId);
    if (item) {
      setReviewItems((prev) => prev.filter((r) => r.problemId !== problemId));
      setDeferredItems((prev) => [...prev, {
        stateId: item.stateId,
        problemId: item.problemId,
        title: item.title,
        leetcodeNumber: item.leetcodeNumber,
        difficulty: item.difficulty,
        category: item.category,
        totalAttempts: item.totalAttempts,
        stability: item.stability,
        deferredUntil: data_resp.deferredUntil,
        isAutoDeferred: false,
      }]);
    }
  }

  async function handleUndefer(problemId: number) {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId, action: "undefer" }),
    });
    if (!res.ok) return;
    // Move from deferred back — need to refresh to get full review data
    setDeferredItems((prev) => prev.filter((d) => d.problemId !== problemId));
    router.refresh();
  }

  async function handleToggleAutoDeferHards(enabled: boolean) {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-auto-defer-hards", enabled }),
    });
    if (!res.ok) return;
    setAutoDeferHards(enabled);
    if (enabled) {
      // Move all hards from review queue to deferred client-side
      const hards = reviewItems.filter((r) => r.difficulty === "Hard");
      setReviewItems((prev) => prev.filter((r) => r.difficulty !== "Hard"));
      setDeferredItems((prev) => [
        ...prev,
        ...hards.map((item) => ({
          stateId: item.stateId,
          problemId: item.problemId,
          title: item.title,
          leetcodeNumber: item.leetcodeNumber,
          difficulty: item.difficulty,
          category: item.category,
          totalAttempts: item.totalAttempts,
          stability: item.stability,
          deferredUntil: null,
          isAutoDeferred: true,
        })),
      ]);
    } else {
      // Remove auto-deferred items and let server rebuild on refresh
      setDeferredItems((prev) => prev.filter((d) => !d.isAutoDeferred));
      router.refresh();
    }
  }

  return (
    <>
    {/* Onboarding Walkthrough */}
    <Onboarding isDemo={isDemo} onboardingComplete={onboardingComplete} onPreferences={(prefs) => {
      if (prefs.targetCount > 0) {
        setTargetCount(prefs.targetCount);
        setTargetDate(prefs.targetDate);
        setListMode("new");
      }
      setGoalType(prefs.goalType);
      localStorage.setItem("srs_goal_type", prefs.goalType);
      setAutoDeferHards(prefs.autoDeferHards);
      if (prefs.autoDeferHards) {
        setReviewItems((prev) => prev.filter((r) => r.difficulty !== "Hard"));
        setDeferredItems((prev) => [
          ...prev,
          ...reviewItems.filter((r) => r.difficulty === "Hard").map((item) => ({ ...item, deferredUntil: null, isAutoDeferred: true })),
        ]);
      }
    }} />
    <div className="relative lg:h-[calc(100dvh-7.5rem)]">
    {/* Subtle ambient starfield — fixed, full-viewport, behind all content */}
    <SkyCanvas />
    {/* All interactive content above the starfield */}
    <div className="relative z-[1] flex flex-col h-full lg:min-h-0">
    {/* Demo sign-in prompt */}
    {showDemoSignIn && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDemoSignIn(false)}>
        <div className="rounded-lg border border-border bg-muted p-6 text-center space-y-3 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground">This is a demo preview</p>
          <h3 className="text-lg font-semibold text-foreground">Sign in to track your progress</h3>
          <p className="text-xs text-muted-foreground">All your data will be synced with spaced repetition scheduling.</p>
          <div className="flex gap-2 justify-center pt-1">
            <Link href="/auth/signin" className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-all duration-150 hover:shadow-[0_0_12px_var(--glow)]">
              Sign in with GitHub
            </Link>
            <button onClick={() => setShowDemoSignIn(false)} className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Keep exploring
            </button>
          </div>
        </div>
      </div>
    )}
    {/* Log Attempt Modal */}
    {logModalProblem && !isDemo && (
      <LogAttemptModal
        problem={logModalProblem}
        onClose={() => setLogModalProblem(null)}
        onLogged={handleLoggedFromModal}
      />
    )}
    {/* SRS Feedback Banner */}
    {srsBanner && <SrsFeedbackBanner {...srsBanner} onDismiss={() => setSrsBanner(null)} onUndo={async () => {
      if (!srsBanner.attemptId) return;
      const res = await fetch(`/api/attempts?id=${srsBanner.attemptId}`, { method: "DELETE" });
      if (res.ok) {
        setSrsBanner(null);
        window.location.reload();
      }
    }} />}
    {showPracticeRecommendation && (
      <PracticeRecommendationPanel
        recommendation={practiceRecommendation}
        onAction={(mode) => setListMode(mode)}
        onDismiss={() => {
          setShowPracticeRecommendation(false);
          localStorage.setItem("aurora_show_practice_recommendation", "0");
        }}
      />
    )}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:flex-1 lg:min-h-0 lg:grid-rows-1">
      {/* ── Combined Problem Queue ── */}
      <div className="flex flex-col lg:min-h-0 lg:h-full lg:col-span-6" data-onboarding="queue">
        {/* Pending GitHub submissions banner */}
        {pendingItems.length > 0 && (
          <PendingBanner
            items={pendingItems}
            onConfirm={(item) => {
              demoGuard(() => setLogModalProblem({
                problemId: item.problemId,
                title: item.problemTitle,
                leetcodeNumber: item.leetcodeNumber,
                difficulty: item.difficulty,
                isReview: item.isReview,
                attemptDate: item.detectedAt,
                pendingId: item.id,
                source: "github",
              }));
            }}
            onDismiss={async (item) => {
              if (isDemo) { setShowDemoSignIn(true); return; }
              await fetch("/api/pending", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: item.id, action: "dismiss" }),
              });
              setPendingItems((prev) => prev.filter((p) => p.id !== item.id));
            }}
          />
        )}
        <section className="flex flex-col lg:flex-1 lg:min-h-0">
          {/* Tab header — row 1: tabs full-width; row 2: sort pills + search */}
          <div className="flex flex-col gap-2 mb-2 shrink-0">
            <div className="flex gap-0.5 rounded-md border border-border p-0.5 w-full">
                <button
                  onClick={() => setListMode("review")}
                  className={`flex-1 text-center text-sm px-2 py-1.5 rounded transition-colors ${listMode === "review" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Review
                  {reviewItems.length > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${listMode === "review" ? "bg-accent-foreground/20" : "bg-muted"}`}>
                      {reviewItems.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setListMode("new")}
                  className={`flex-1 text-center text-sm px-2 py-1.5 rounded transition-colors ${listMode === "new" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  New
                  {sortedNewProblems.length > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${listMode === "new" ? "bg-accent-foreground/20" : "bg-muted"}`}>
                      {sortedNewProblems.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setListMode("completed")}
                  className={`flex-1 text-center text-sm px-2 py-1.5 rounded transition-colors ${listMode === "completed" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Done
                  {data.completedProblems.length > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${listMode === "completed" ? "bg-accent-foreground/20" : "bg-muted"}`}>
                      {data.completedProblems.length}
                    </span>
                  )}
                </button>
                {/* Thin divider before utility actions */}
                <span className="w-px bg-border my-0.5 shrink-0" />
                <button
                  onClick={() => setListMode("import")}
                  className={`text-sm px-2.5 py-1.5 rounded transition-colors ${listMode === "import" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Import
                </button>
                <button
                  onClick={() => {
                    if (listMode !== "mock") {
                      setMockSelectedProblems(pickMockProblems(data.mockCandidates));
                      if (mockPhase === "finished") { setMockPhase("setup"); setMockLoggedIds(new Set()); }
                    }
                    setListMode("mock");
                  }}
                  className={`relative text-sm px-2.5 py-1.5 rounded transition-colors ${listMode === "mock" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Mock
                  {mockPhase === "active" && listMode !== "mock" && (
                    <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  )}
                </button>
            </div>
            {/* Row 2: sort control + search */}
            <div className="flex items-center gap-2">
              {/* Sort — segmented control matching tab row style */}
              {listMode === "review" && (
                <select
                  value={reviewSort}
                  onChange={(e) => setReviewSort(e.target.value as ReviewSort)}
                  className="h-8 rounded border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none shrink-0">
                  <option value="urgency">Urgency</option>
                  <option value="overdue">Oldest</option>
                  <option value="difficulty">Hardest</option>
                  <option value="category">Category</option>
                </select>
              )}
              {listMode === "new" && (
                <select
                  value={newDifficultyFilter}
                  onChange={(e) => setNewDifficultyFilter(e.target.value as NewDifficultyFilter)}
                  className="h-8 rounded border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none shrink-0">
                  <option value="all">All difficulties</option>
                  <option value="easy">Easy only</option>
                  <option value="easy-medium">Easy &amp; Medium</option>
                  <option value="medium">Medium only</option>
                  <option value="hard">Hard only</option>
                </select>
              )}
              {listMode === "completed" && (
                <select
                  value={completedSort}
                  onChange={(e) => setCompletedSort(e.target.value as CompletedSort)}
                  className="h-8 rounded border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none shrink-0">
                  <option value="retention">Weakest first</option>
                  <option value="review-date">Due soonest</option>
                  <option value="category">Category</option>
                </select>
              )}
              {(listMode === "import" || listMode === "mock") && <span className="flex-[3] min-w-0" />}
              {/* Search */}
              {listMode !== "import" && listMode !== "mock" && (
                <input
                  type="text"
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  placeholder="Filter…"
                  aria-label="Filter queue"
                  className="h-8 flex-1 min-w-0 rounded border border-border bg-background px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Review list */}
          {listMode === "review" && (
            <div className="flex flex-col flex-1 min-h-0 gap-2">
            {data.reviewQueue.length === 0 ? (
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
                    const catStat = data.categoryStats.find(c => c.category === item.category);
                    const isWeakCategory = catStat && catStat.avgRetention < 0.6;
                    // Build concise "why" reason
                    const reasons: string[] = [];
                    if (item.retrievability < 0.3) reasons.push("Memory nearly gone");
                    else if (item.retrievability < 0.5) reasons.push("Retention dropping fast");
                    if (item.daysOverdue >= 7) reasons.push(`${item.daysOverdue}d past due`);
                    else if (item.daysOverdue >= 2) reasons.push(`${item.daysOverdue}d overdue`);
                    if (isWeakCategory) reasons.push(`${item.category} is weak (${Math.round((catStat?.avgRetention ?? 0) * 100)}%)`);
                    if (item.totalAttempts === 1) reasons.push("Only seen once");
                    if (reasons.length === 0) reasons.push("Scheduled review");
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
                          whyReasons={reasons}
                        />
                        <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{item.leetcodeNumber}</span>
                        <div className="min-w-0 flex-1">
                          {item.neetcodeUrl ? (
                            <a href={item.neetcodeUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-accent truncate block">
                              {item.title}
                            </a>
                          ) : (
                            <Link href={`/problems/${item.problemId}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                              {item.title}
                            </Link>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {item.category} · {item.totalAttempts} attempt{item.totalAttempts !== 1 ? "s" : ""} · Last: {daysAgoLabel(item.lastReviewedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/problems/${item.problemId}`}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="View problem activity"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                          </Link>
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${PRIORITY_BG[prio]}`}>
                            {item.daysOverdue > 0 ? `${item.daysOverdue}d overdue` : "Due today"}
                          </span>
                          <DifficultyBadge difficulty={item.difficulty} />
                          <button
                            onClick={() => demoGuard(() => setLogModalProblem({
                              problemId: item.problemId,
                              title: item.title,
                              leetcodeNumber: item.leetcodeNumber,
                              difficulty: item.difficulty,
                              isReview: true,
                            }))}
                            className="inline-flex h-7 items-center rounded-md bg-accent px-3 text-xs text-accent-foreground transition-colors hover:opacity-90"
                          >
                            Log
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Inline deferred disclosure — lives at the bottom of the Review tab */}
            {(deferredItems.length > 0 || autoDeferHards) && (
              <div className="rounded-lg border border-border overflow-hidden shrink-0">
                <button
                  onClick={() => setShowDeferredInline((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  <span className="font-medium">Deferred{deferredItems.length > 0 ? ` (${deferredItems.length})` : ""}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showDeferredInline ? "" : "rotate-180"}`}><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                {showDeferredInline && (
                  <div className="border-t border-border">
                    <div className="px-3 py-2 border-b border-border/50">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search review queue to defer..."
                          aria-label="Search problems to defer"
                          value={deferSearch}
                          onChange={(e) => setDeferSearch(e.target.value)}
                          className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        {deferSearch.trim() && (
                          <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border border-border bg-background shadow-lg max-h-48 overflow-y-auto">
                            {reviewItems
                              .filter((r) => {
                                const s = deferSearch.toLowerCase();
                                return r.title.toLowerCase().includes(s) || String(r.leetcodeNumber ?? "").includes(s) || r.category.toLowerCase().includes(s);
                              })
                              .slice(0, 10)
                              .map((item) => (
                                <button
                                  key={item.problemId}
                                  onClick={() => { demoGuard(() => handleDefer(item.problemId)); setDeferSearch(""); }}
                                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                                >
                                  <span className="text-[10px] text-muted-foreground tabular-nums w-6 shrink-0">{item.leetcodeNumber}</span>
                                  <span className="text-xs truncate flex-1">{item.title}</span>
                                  <DifficultyBadge difficulty={item.difficulty} />
                                  <span className="text-[10px] text-muted-foreground">Defer</span>
                                </button>
                              ))}
                            {reviewItems.filter((r) => {
                              const s = deferSearch.toLowerCase();
                              return r.title.toLowerCase().includes(s) || String(r.leetcodeNumber ?? "").includes(s) || r.category.toLowerCase().includes(s);
                            }).length === 0 && (
                              <p className="px-2.5 py-2 text-xs text-muted-foreground">No matching review items</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {deferredItems.length === 0 ? (
                      <p className="px-3 py-2.5 text-xs text-muted-foreground">No deferred problems.</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        {deferredItems.map((item) => (
                          <div
                            key={item.stateId}
                            className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-b-0 hover:bg-muted transition-colors"
                          >
                            <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{item.leetcodeNumber}</span>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-medium text-foreground truncate block">{item.title}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {item.category}{item.isAutoDeferred ? " · Auto-deferred (hard)" : item.deferredUntil ? ` · Until ${new Date(item.deferredUntil).toLocaleDateString()}` : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <DifficultyBadge difficulty={item.difficulty} />
                              <button
                                onClick={() => demoGuard(() => handleUndefer(item.problemId))}
                                className="inline-flex h-6 items-center rounded border border-border px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                Restore
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            </div>
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
                        {p.neetcodeUrl ? (
                          <a href={p.neetcodeUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-accent truncate block">
                            {p.title}
                          </a>
                        ) : (
                          <Link href={`/problems/${p.id}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                            {p.title}
                          </Link>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{p.category}</span>
                          {p.blind75 && <span className="text-xs font-medium text-violet-500">B75</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <DifficultyBadge difficulty={p.difficulty} />
                        <button
                          onClick={() => demoGuard(() => setLogModalProblem({
                            problemId: p.id,
                            title: p.title,
                            leetcodeNumber: p.leetcodeNumber,
                            difficulty: p.difficulty,
                            isReview: false,
                          }))}
                          className="inline-flex h-7 items-center rounded-md bg-accent px-3 text-xs text-accent-foreground transition-colors hover:opacity-90"
                        >
                          Log
                        </button>
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
              todayAttemptedIds={data.importTodayAttemptedIds}
            />
          )}

          {/* ── Mock Interview Panel ── */}
          {listMode === "mock" && (
            <MockPanel
              phase={mockPhase}
              duration={mockDuration}
              timeLeft={mockTimeLeft}
              problems={mockSelectedProblems}
              loggedIds={mockLoggedIds}
              onSetDuration={(d: 30 | 45 | 60) => setMockDuration(d)}
              onStart={() => {
                setMockStartedAt(Date.now());
                setMockTimeLeft(mockDuration * 60);
                setMockPhase("active");
              }}
              onEnd={() => setMockPhase("finished")}
              onReshuffle={() => setMockSelectedProblems(pickMockProblems(data.mockCandidates))}
              onLogged={(id: number) => setMockLoggedIds((prev) => new Set([...prev, id]))}
              onReset={() => {
                setMockPhase("setup");
                setMockStartedAt(null);
                setMockTimeLeft(mockDuration * 60);
                setMockLoggedIds(new Set());
                setMockSelectedProblems(pickMockProblems(data.mockCandidates));
              }}
              demoGuard={demoGuard}
            />
          )}

        </section>
      </div>

      {/* ── Right Column ── */}
      <div className="flex flex-col lg:col-span-6 lg:min-h-0 lg:h-full overflow-hidden" data-onboarding="stats">
        <div className="flex flex-col gap-3 overflow-y-auto overflow-x-hidden flex-1 min-h-0">
        {!showStatsDetail && (<>
        {/* Countdown */}
        <section className="rounded-lg border border-border bg-muted p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">{countdownTitle}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Edit target settings"
                title="Edit target"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
              <button
                onClick={() => setShowStatsDetail(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="View all stats"
                title="View all stats"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              </button>
            </div>
          </div>

          {/* Main body: left info + right donut */}
          <div className="flex items-start gap-3 mt-1">
            {/* Left: days + date + chips + streak */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums leading-none">{countdown.daysLeft}</span>
                <span className="text-sm text-muted-foreground">days left</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {targetCount} problems by {new Date(targetDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              {/* Chip row: on-track + projected */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${countdown.onTrack ? "bg-green-500/15 text-green-500" : "bg-orange-500/15 text-orange-500"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${countdown.onTrack ? "bg-green-500" : "bg-orange-500"}`} />
                  {countdown.onTrack ? "On track" : `Need ${countdown.neededPerDay.toFixed(1)}/day`}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${countdown.projectedRaw >= targetCount ? "bg-green-500/15 text-green-500" : "bg-orange-500/15 text-orange-500"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${countdown.projectedRaw >= targetCount ? "bg-green-500" : "bg-orange-500"}`} />
                  Proj {countdown.projectedRaw}/{targetCount}
                </span>
              </div>
              {/* Streak + confidence row */}
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Streak</span>
                  <span className="font-semibold tabular-nums">
                    {data.currentStreak === 0 ? <>{data.currentStreak}<span className="ml-0.5">❄️</span></> : <>{data.currentStreak}<span className="ml-0.5">🔥</span></>}
                  </span>
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Best</span>
                  <span className="font-semibold tabular-nums">{data.bestStreak}</span>
                </span>
                {data.avgConfidence > 0 && (<>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">Conf</span>
                    <span className="font-semibold tabular-nums">{data.avgConfidence.toFixed(1)}/5</span>
                  </span>
                </>)}
              </div>
            </div>
            {/* Right: donut */}
            <SolvedDonut breakdown={data.difficultyBreakdown} totalSolved={data.attemptedCount} totalTarget={targetCount} />
          </div>

          {/* Settings */}
          {showSettings && (
            <SettingsPanel
              date={targetDate}
              count={targetCount}
              title={countdownTitle}
              onSave={saveSettings}
              onCancel={() => setShowSettings(false)}
              autoDeferHards={autoDeferHards}
              onToggleAutoDeferHards={(v) => demoGuard(() => handleToggleAutoDeferHards(v))}
              showPracticeRecommendation={showPracticeRecommendation}
              onTogglePracticeRecommendation={(v) => {
                setShowPracticeRecommendation(v);
                localStorage.setItem("aurora_show_practice_recommendation", v ? "1" : "0");
              }}
            />
          )}
        </section>

        {/* Readiness */}
        <section className="rounded-lg border border-border bg-muted p-3">
          <button
            onClick={() => toggleWidget("readiness")}
            className="flex items-center justify-between w-full"
            aria-expanded={!collapsedWidgets.readiness}
            aria-label="Toggle readiness"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Readiness</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform ${collapsedWidgets.readiness ? "rotate-180" : ""}`}><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          {!collapsedWidgets.readiness && (
            <div className="mt-2">
              {/* Two-column: grade+score left (narrow) | bars right */}
              <div className="flex gap-3 items-start">
                {/* Left: grade badge + score only */}
                <div className="flex flex-col items-center gap-1 shrink-0 w-14 pt-0.5">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-lg text-2xl font-black ${TIER_COLORS[data.readiness.tier]}`}>{data.readiness.tier}</span>
                  <span className="text-base font-bold tabular-nums leading-none">{data.readiness.score}<span className="text-[11px] text-muted-foreground font-normal">/100</span></span>
                </div>
                {/* Right: readiness bars — weight in tooltip, not label */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {[
                    { label: "Coverage", value: data.readinessBreakdown.coverage, tooltip: "Coverage — 30% of score. What % of the 150 problems you’ve attempted at least once." },
                    { label: "Retention", value: data.readinessBreakdown.retention, tooltip: "Retention — 40% of score. How well you remember the problems you’ve attempted, averaged across all solved problems." },
                    { label: "Category Balance", value: data.readinessBreakdown.categoryBalance, tooltip: "Category Balance — 20% of score. How evenly your attempts are distributed across problem categories." },
                    { label: "Consistency", value: data.readinessBreakdown.consistency, tooltip: "Consistency — 10% of score. Based on your current streak and practice frequency." },
                  ].map(({ label, value, tooltip }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          {label}
                          <InfoTooltip content={<p className="max-w-[220px]">{tooltip}</p>} />
                        </span>
                        <span className="font-medium tabular-nums">{Math.round(value * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-background overflow-hidden">
                        <div className={`h-full rounded-full transition-[width] duration-500 ${value >= 0.7 ? "bg-green-500" : value >= 0.4 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.round(value * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </section>
        </>)}

        {showStatsDetail && (<>
        {/* Time */}
        <section className="rounded-lg border border-border bg-muted p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Time</p>
            <button onClick={() => setShowStatsDetail(false)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to dashboard" title="Back to dashboard">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/50 bg-background/40 p-3"><p className="text-xs text-foreground mb-1">Total Solve</p><p className="text-xl font-bold">{formatMinutes(data.totalSolveMinutes)}</p></div>
              <div className="rounded-lg border border-border/50 bg-background/40 p-3"><p className="text-xs text-foreground mb-1">Total Study</p><p className="text-xl font-bold">{formatMinutes(data.totalStudyMinutes)}</p></div>
              <div className="rounded-lg border border-border/50 bg-background/40 p-3"><p className="text-xs text-foreground mb-1">Avg Solve</p><p className="text-xl font-bold">{data.avgSolveMinutes > 0 ? `${Math.round(data.avgSolveMinutes)}m` : "—"}</p></div>
            </div>
          </div>
        </section>

        {/* Category + Difficulty side by side */}
        <section className="rounded-lg border border-border bg-muted p-3">
          <button
            onClick={() => toggleWidget("breakdown")}
            className="flex items-center justify-between w-full"
            aria-expanded={!collapsedWidgets.breakdown}
            aria-label="Toggle categories and difficulty breakdown"
          >
            <p className="text-sm font-semibold text-foreground">Categories &amp; Difficulty</p>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform ${collapsedWidgets.breakdown ? "rotate-180" : ""}`}><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          {!collapsedWidgets.breakdown && (
          <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="rounded-md border border-border/40 bg-background/30 p-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-foreground">Categories</p>
              <div className="flex gap-1">
                <button onClick={() => setCategoryView("weak")} className={`text-[10px] px-1.5 py-0.5 rounded ${categoryView === "weak" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Weakest</button>
                <button onClick={() => setCategoryView("all")} className={`text-[10px] px-1.5 py-0.5 rounded ${categoryView === "all" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>All</button>
              </div>
            </div>
            <div className="h-[96px] overflow-y-auto pr-0.5 space-y-1.5">
              {(categoryView === "all" ? displayCategories : displayCategories.slice(0, 5)).map((cat) => (
                <Link key={cat.category} href={`/problems?category=${encodeURIComponent(cat.category)}`} className="flex items-center gap-2 group/cat cursor-pointer">
                  <span className="text-xs w-24 shrink-0 truncate group-hover/cat:text-foreground transition-colors" title={cat.category}>{cat.category}</span>
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background group-hover/cat:h-2 transition-all duration-150">
                    <div className={`h-full rounded-full transition-all duration-300 ${retentionBarColor(cat.avgRetention)}`} style={{ width: `${cat.total > 0 ? Math.round((cat.attempted / cat.total) * 100) : 0}%` }} />
                  </div>
                  <span className={`text-xs w-10 text-right shrink-0 tabular-nums transition-colors ${cat.attempted > 0 ? retentionColor(cat.avgRetention) : "text-muted-foreground"}`}>
                    <span className="group-hover/cat:hidden">{cat.attempted}/{cat.total}</span>
                    <span className="hidden group-hover/cat:inline">{cat.attempted > 0 ? `${Math.round(cat.avgRetention * 100)}%` : "—"}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border/40 bg-background/30 p-2">
            <p className="text-xs font-medium text-foreground mb-2">Difficulty</p>
            <div className="h-[96px] overflow-y-auto pr-1.5 space-y-2">
              {data.difficultyBreakdown.map((d) => {
                const pct = d.count > 0 ? Math.round((d.attempted / d.count) * 100) : 0;
                return (
                  <Link key={d.difficulty} href={`/problems?difficulty=${d.difficulty}&status=Attempted`} className="flex items-center gap-2 group/diff cursor-pointer">
                    <span className="text-xs w-12 shrink-0 group-hover/diff:text-foreground transition-colors">{d.difficulty}</span>
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background group-hover/diff:h-2 transition-all duration-150">
                      <div className={`h-full rounded-full transition-all duration-300 ${DIFF_COLORS[d.difficulty]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                      <span className="group-hover/diff:hidden">{d.attempted}/{d.count}</span>
                      <span className="hidden group-hover/diff:inline">{pct}%</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          </div>
          )}
        </section>        {/* Mastery Progress */}
        <section className="rounded-lg border border-border bg-muted p-3">
          <button
            onClick={() => toggleWidget("mastery")}
            className="flex items-center justify-between w-full"
            aria-expanded={!collapsedWidgets.mastery}
            aria-label="Toggle mastery progress"
          >
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-foreground">Mastery Progress</p>
              <InfoTooltip
                content={
                  <div className="space-y-1.5">
                    <p className="font-medium">Problem Mastery</p>
                    <p>A problem is <span className="text-green-400 font-medium">mastered</span> when its stability reaches 45+ days — meaning the SRS won&apos;t schedule it again for at least six weeks. This typically requires 4+ successful independent solves.</p>
                    <p><span className="text-accent font-medium">Learning</span> problems have been attempted but haven&apos;t reached that threshold yet.</p>
                    <p className="text-[11px] text-muted-foreground pt-1">Mastered problems only need occasional confirmation to verify retention, especially before interviews.</p>
                  </div>
                }
              />
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform ${collapsedWidgets.mastery ? "rotate-180" : ""}`}><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          {!collapsedWidgets.mastery && (
            <div className="mt-2">
              <MasteryProgress
                mastered={data.masteredCount}
                learning={data.learningCount}
                total={data.totalProblems}
                masteryList={data.masteryList}
                learningList={data.learningList}
              />
            </div>
          )}
        </section>


        </>)}

        {!showStatsDetail && (<>
        {/* Activity Chart */}
        <section className="rounded-lg border border-border bg-muted p-3 shrink-0">
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => toggleWidget("activity")}
              aria-expanded={!collapsedWidgets.activity}
              aria-label="Toggle activity chart"
            >
              <p className="text-sm font-semibold text-foreground">Activity</p>
            </button>
            <div className="flex items-center gap-1.5">
              {/* Mode toggle: 14d / Monthly / Heatmap */}
              <div className="flex rounded-md border border-border p-0.5 gap-0.5">
                {(["14d", "monthly", "heatmap"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setActivityViewMode(m); setActivityPage(0); }}
                    className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                      activityViewMode === m
                        ? "bg-accent/20 text-accent font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "14d" ? "14d" : m === "monthly" ? "Monthly" : "Heatmap"}
                  </button>
                ))}
              </div>
              {/* Chevron — collapses the whole section */}
              <button onClick={() => toggleWidget("activity")} aria-label="Toggle activity chart">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform ${collapsedWidgets.activity ? "rotate-180" : ""}`}><polyline points="18 15 12 9 6 15"/></svg>
              </button>
            </div>
          </div>
          {!collapsedWidgets.activity && (
            <div className="mt-2 space-y-2">
              {/* Pace — compact single-row (edit inline, no height change) */}
              {editingPace ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-green-500 font-medium">New</span>
                  <input type="number" min="0" step="0.5" value={plannedNewPerDay} onChange={(e) => setPlannedNewPerDay(parseFloat(e.target.value) || 0)} aria-label="Planned new problems per day" className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-accent w-12 text-center" />
                  <span className="text-border">·</span>
                  <span className="text-accent font-medium">Review</span>
                  <input type="number" min="0" step="0.5" value={plannedReviewPerDay} onChange={(e) => setPlannedReviewPerDay(parseFloat(e.target.value) || 0)} aria-label="Planned reviews per day" className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-accent w-12 text-center" />
                  <button onClick={() => { localStorage.setItem("aurora_planned_new_per_day", String(plannedNewPerDay)); localStorage.setItem("aurora_planned_review_per_day", String(plannedReviewPerDay)); setEditingPace(false); }} className="ml-1 inline-flex h-5 items-center rounded bg-accent px-2 text-[10px] text-accent-foreground hover:opacity-90">Save</button>
                  <button onClick={() => setEditingPace(false)} className="inline-flex h-5 items-center rounded border border-border px-2 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-green-500 font-medium">New</span>
                  <span className={`tabular-nums font-semibold ${data.avgNewPerDay >= plannedNewPerDay ? "text-green-500" : "text-orange-500"}`}>{data.avgNewPerDay.toFixed(1)}</span>
                  <span className="text-muted-foreground text-[11px]">/{plannedNewPerDay.toFixed(1)} goal</span>
                  <span className="text-border mx-1">·</span>
                  <span className="text-accent font-medium">Review</span>
                  <span className={`tabular-nums font-semibold ${data.avgReviewPerDay >= plannedReviewPerDay ? "text-green-500" : "text-orange-500"}`}>{data.avgReviewPerDay.toFixed(1)}</span>
                  <span className="text-muted-foreground text-[11px]">/{plannedReviewPerDay.toFixed(1)} goal</span>
                  <button onClick={() => setEditingPace(true)} className="ml-auto p-0.5 text-muted-foreground hover:text-foreground transition-colors" title="Edit goals">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              )}

              {activityViewMode === "heatmap"
                ? <ActivityHeatmap history={data.fullAttemptHistory} />
                : <ActivityChart
                    history={activityData}
                    mode={activityViewMode === "monthly" ? "monthly" : "auto"}
                    onPrev={activityViewMode === "14d" ? () => setActivityPage((p) => p + 1) : undefined}
                    onNext={activityViewMode === "14d" ? () => setActivityPage((p) => Math.max(0, p - 1)) : undefined}
                    canGoBack={activityViewMode === "14d" ? canGoBack : undefined}
                    canGoForward={activityViewMode === "14d" ? canGoForward : undefined}
                  />
              }

            </div>
          )}
        </section>

        {/* Queue Forecast */}
        <section className="rounded-lg border border-border bg-muted p-3 shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-semibold text-foreground shrink-0">Queue Forecast</p>
              {(() => {
                const hProj = forecastMode === "actual" ? queueProjection : queueProjectionGoals;
                if (!hProj) return null;
                const status = queueForecastStatus(hProj);
                return <span className={`text-[11px] font-medium truncate ${status.className}`}>{status.label}</span>;
              })()}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex rounded-md border border-border p-0.5 gap-0.5">
                {(["actual", "goals"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setForecastMode(m); localStorage.setItem("aurora_forecast_mode", m); }}
                    className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                      forecastMode === m
                        ? "bg-accent/20 text-accent font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "actual" ? "Actual" : "Goals"}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowQueueForecast(v => !v)} aria-label="Toggle queue forecast" aria-expanded={showQueueForecast}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform ${showQueueForecast ? "" : "rotate-180"}`}><polyline points="18 15 12 9 6 15"/></svg>
              </button>
            </div>
          </div>
          {showQueueForecast && (() => {
            const proj = forecastMode === "actual" ? queueProjection : queueProjectionGoals;
            if (!proj) return <p className="text-xs text-muted-foreground mt-2">No items in queue.</p>;
            return (
              <div className="mt-2 space-y-2">
                <div className="relative flex items-end gap-px h-36">
                  {proj.dailyQueueSize.map((size, i) => {
                    const maxSize = Math.max(...proj.dailyQueueSize, 1);
                    const height = Math.max(2, (size / maxSize) * 100);
                    const isToday = i === 0;
                    return (
                      <div key={i} className={`relative flex-1 rounded-t-sm group/bar ${isToday ? "bg-accent" : size === 0 ? "bg-green-500/60" : "bg-orange-500/60"}`} style={{ height: `${height}%` }}>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 rounded bg-background border border-border px-2 py-1 text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover/bar:opacity-100 transition-opacity z-10 shadow-md">
                          {(() => { const d = new Date(); d.setDate(d.getDate() + i); return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); })()} — {size} due
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span><span className="font-medium text-foreground">{proj.currentSize}</span> due now</span>
                  {forecastMode === "goals" && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs">Rev/d</span>
                        <button onClick={() => { const v = Math.max(1, forecastReviewPerDay - 1); setForecastReviewPerDay(v); localStorage.setItem("aurora_forecast_review_per_day", String(v)); }} className="w-5 h-5 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground text-xs leading-none">−</button>
                        <span className="font-medium tabular-nums w-6 text-center text-xs">{forecastReviewPerDay}</span>
                        <button onClick={() => { const v = forecastReviewPerDay + 1; setForecastReviewPerDay(v); localStorage.setItem("aurora_forecast_review_per_day", String(v)); }} className="w-5 h-5 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground text-xs leading-none">+</button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs">New/d</span>
                        <button onClick={() => { const v = Math.max(0, forecastNewPerDay - 1); setForecastNewPerDay(v); localStorage.setItem("aurora_forecast_new_per_day", String(v)); }} className="w-5 h-5 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground text-xs leading-none">−</button>
                        <span className="font-medium tabular-nums w-6 text-center text-xs">{forecastNewPerDay}</span>
                        <button onClick={() => { const v = forecastNewPerDay + 1; setForecastNewPerDay(v); localStorage.setItem("aurora_forecast_new_per_day", String(v)); }} className="w-5 h-5 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground text-xs leading-none">+</button>
                      </div>
                    </div>
                  )}
                  <span>{proj.reviewsPerDay} rev/d · {proj.newPerDay} new/d · <span className="text-muted-foreground/60">+30d</span></span>
                </div>

              </div>
            );
          })()}
        </section>

        </>)}

        </div>
      </div>
    </div>
    </div>
    </div>
    </>
  );
}

/* ── Activity Heatmap ── */

function ActivityHeatmap({ history }: { history: AttemptDay[] }) {
  // Build a map of date → day data
  const dayMap = useMemo(() => {
    const m = new Map<string, AttemptDay>();
    for (const d of history) m.set(d.date, d);
    return m;
  }, [history]);

  // Generate last 91 days (13 weeks), Sunday-aligned grid
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Walk back to the most recent Sunday
  const gridEnd = new Date(today);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay())); // end on next Saturday
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridStart.getDate() - 90);

  const weeks: { date: string; count: number; newCount: number; reviewCount: number }[][] = [];
  let week: { date: string; count: number; newCount: number; reviewCount: number }[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const d = dayMap.get(dateStr);
    week.push({ date: dateStr, count: d?.count ?? 0, newCount: d?.newCount ?? 0, reviewCount: d?.reviewCount ?? 0 });
    if (cursor.getDay() === 6) { // Saturday = end of week
      weeks.push(week);
      week = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (week.length > 0) weeks.push(week);

  const maxCount = Math.max(...history.map(d => d.count), 1);

  function cellColor(count: number, newCount: number) {
    if (count === 0) return "#1f2937"; // empty
    const intensity = Math.min(count / Math.max(maxCount * 0.6, 3), 1);
    const newRatio = count > 0 ? newCount / count : 0;
    // Anchor colors match bar chart: green-500 (#22c55e) for new, accent (#a855f7) for review
    if (newRatio >= 0.7) {
      // Mostly new — interpolate dark green → #22c55e
      return `rgb(${Math.round(20 + intensity * 14)},${Math.round(60 + intensity * 137)},${Math.round(20 + intensity * 74)})`;
    } else if (newRatio <= 0.3) {
      // Mostly review — interpolate dark purple → #a855f7
      return `rgb(${Math.round(60 + intensity * 108)},${Math.round(20 + intensity * 65)},${Math.round(80 + intensity * 167)})`;
    } else {
      // Mixed — teal (midpoint between green and purple)
      return `rgb(${Math.round(20 + intensity * 20)},${Math.round(80 + intensity * 100)},${Math.round(60 + intensity * 120)})`;
    }
  }

  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, wi) => {
    const firstDay = week.find(d => d.date);
    if (!firstDay) return;
    const d = new Date(firstDay.date + "T12:00:00Z");
    if (d.getUTCDate() <= 7 || wi === 0) {
      const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
      if (!monthLabels.length || monthLabels[monthLabels.length - 1].label !== month) {
        monthLabels.push({ label: month, col: wi });
      }
    }
  });

  return (
    <div className="overflow-x-auto">
      {/* Month labels */}
      <div className="flex mb-0.5" style={{ gap: "2px" }}>
        {weeks.map((_, wi) => {
          const ml = monthLabels.find(m => m.col === wi);
          return (
            <div key={wi} className="flex-1 text-[9px] text-muted-foreground leading-none">
              {ml ? ml.label : ""}
            </div>
          );
        })}
      </div>
      <div className="flex" style={{ gap: "2px" }}>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col flex-1" style={{ gap: "2px" }}>
            {week.map((day) => {
              const label = day.count > 0
                ? `${new Date(day.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} — ${day.newCount > 0 ? `${day.newCount} new` : ""}${day.newCount > 0 && day.reviewCount > 0 ? " · " : ""}${day.reviewCount > 0 ? `${day.reviewCount} review` : ""}`
                : new Date(day.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
              return (
                <Link
                  key={day.date}
                  href={`/activity?date=${day.date}`}
                  className="relative group/cell block"
                  style={{ height: "10px" }}
                >
                  <div style={{ height: "10px", borderRadius: "2px", backgroundColor: cellColor(day.count, day.newCount) }} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 rounded bg-background border border-border px-2 py-1 text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover/cell:opacity-100 transition-opacity z-50 shadow-md">
                    {label}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-1.5 justify-end text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <span key={v} className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: v === 0 ? "#1f2937" : `rgb(${Math.round(20+v*14)},${Math.round(60+v*137)},${Math.round(20+v*74)})` }} />
        ))}
        <span>More</span>
        <span className="ml-1 w-px h-3 bg-border/60" />
        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: `rgb(${Math.round(60+108)},${Math.round(20+65)},${Math.round(80+167)})` }} />
        <span>Review</span>
        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: `rgb(${Math.round(20+20)},${Math.round(80+100)},${Math.round(60+120)})` }} />
        <span>Mixed</span>
      </div>
    </div>
  );
}

/* ── Activity Chart ── */

const ActivityChart = memo(function ActivityChart({ history, mode = "auto", onPrev, onNext, canGoBack, canGoForward }: { history: AttemptDay[]; mode?: "auto" | "monthly"; onPrev?: () => void; onNext?: () => void; canGoBack?: boolean; canGoForward?: boolean }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Aggregate: monthly if mode=monthly, weekly if auto+>30 days, else daily
  const shouldMonthly = mode === "monthly";
  const shouldAggregate = !shouldMonthly && history.length > 30;
  type Bucket = { label: string; count: number; newCount: number; reviewCount: number; dateRange: string; linkDate: string };

  const buckets: Bucket[] = useMemo(() => {
    if (shouldMonthly) {
      // Group by calendar month
      const monthMap = new Map<string, Bucket>();
      for (const day of history) {
        const [y, m] = day.date.split("-");
        const key = `${y}-${m}`;
        if (!monthMap.has(key)) {
          const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          const label = `${monthNames[parseInt(m, 10) - 1]} '${y.slice(2)}`;
          monthMap.set(key, { label, count: 0, newCount: 0, reviewCount: 0, dateRange: `${monthNames[parseInt(m,10)-1]} ${y}`, linkDate: day.date });
        }
        const bucket = monthMap.get(key)!;
        bucket.count += day.count;
        bucket.newCount += day.newCount;
        bucket.reviewCount += day.reviewCount;
      }
      return Array.from(monthMap.values());
    }
    if (!shouldAggregate) {
      return history.map((day) => {
        const [, m, dd] = day.date.split("-");
        return {
          label: `${parseInt(m)}/${parseInt(dd)}`,
          count: day.count,
          newCount: day.newCount,
          reviewCount: day.reviewCount,
          dateRange: day.date,
          linkDate: day.date,
        };
      });
    }

    // Group into weeks (Mon-Sun)
    const weeks: Bucket[] = [];
    let currentWeek: AttemptDay[] = [];
    let weekStart = "";

    for (const day of history) {
      const d = new Date(day.date + "T12:00:00Z");
      const dow = d.getUTCDay();
      const isMonday = dow === 1;

      if (isMonday && currentWeek.length > 0) {
        const [, m1, d1] = weekStart.split("-");
        const lastDay = currentWeek[currentWeek.length - 1].date;
        const [, m2, d2] = lastDay.split("-");
        weeks.push({
          label: `${parseInt(m1)}/${parseInt(d1)}`,
          count: currentWeek.reduce((s, d) => s + d.count, 0),
          newCount: currentWeek.reduce((s, d) => s + d.newCount, 0),
          reviewCount: currentWeek.reduce((s, d) => s + d.reviewCount, 0),
          dateRange: `${parseInt(m1)}/${parseInt(d1)}–${parseInt(m2)}/${parseInt(d2)}`,
          linkDate: weekStart,
        });
        currentWeek = [];
      }

      if (currentWeek.length === 0) weekStart = day.date;
      currentWeek.push(day);
    }

    // Flush remaining
    if (currentWeek.length > 0) {
      const [, m1, d1] = weekStart.split("-");
      const lastDay = currentWeek[currentWeek.length - 1].date;
      const [, m2, d2] = lastDay.split("-");
      weeks.push({
        label: `${parseInt(m1)}/${parseInt(d1)}`,
        count: currentWeek.reduce((s, d) => s + d.count, 0),
        newCount: currentWeek.reduce((s, d) => s + d.newCount, 0),
        reviewCount: currentWeek.reduce((s, d) => s + d.reviewCount, 0),
        dateRange: `${parseInt(m1)}/${parseInt(d1)}–${parseInt(m2)}/${parseInt(d2)}`,
        linkDate: weekStart,
      });
    }

    return weeks;
  }, [history, shouldAggregate, shouldMonthly]);

  const max = Math.max(...buckets.map((d) => d.count), 1);
  const MAX_BAR_PX = 72;
  const showCounts = buckets.length <= 21;

  return (
    <div>
      <div className="flex items-end gap-0.5" style={{ minHeight: MAX_BAR_PX + 28 }}>
        {buckets.map((bucket, idx) => {
          const barPx = bucket.count > 0
            ? Math.max(Math.round((bucket.count / max) * MAX_BAR_PX), 4)
            : 3;
          const reviewPx = bucket.count > 0
            ? Math.round((bucket.reviewCount / bucket.count) * barPx)
            : 0;
          const isCurrentWeek = !shouldAggregate && bucket.linkDate === todayStr;
          // Show every label for ≤30 buckets, otherwise evenly spaced
          const showThisLabel = buckets.length <= 30 || (idx % Math.ceil(buckets.length / 12) === 0) || idx === buckets.length - 1;
          return (
            <Link
              key={bucket.linkDate}
              href={`/activity?date=${bucket.linkDate}${shouldAggregate ? "&range=week" : ""}`}
              className="flex flex-1 flex-col items-center justify-end gap-0.5 cursor-pointer group"
              title={`${bucket.dateRange}: ${bucket.count > 0 ? `${bucket.newCount} new · ${bucket.reviewCount} review` : "no activity"}`}
            >
              {showCounts && bucket.count > 0 && (
                <span className="text-[10px] text-muted-foreground leading-none tabular-nums group-hover:text-foreground transition-colors">{bucket.count}</span>
              )}
              {bucket.count > 0 ? (
                <div className="w-full flex flex-col transition-all duration-150 group-hover:scale-x-110">
                  {bucket.newCount > 0 && (
                    <div
                      className="w-full rounded-t-sm bg-green-500 group-hover:brightness-125"
                      style={{ height: `${barPx - reviewPx}px` }}
                    />
                  )}
                  {bucket.reviewCount > 0 && (
                    <div
                      className={`w-full bg-accent group-hover:brightness-125 ${bucket.newCount === 0 ? "rounded-t-sm" : ""}`}
                      style={{ height: `${reviewPx}px` }}
                    />
                  )}
                </div>
              ) : (
                <div
                  className="w-full rounded-t-sm bg-border/40 group-hover:bg-border/60 transition-all duration-150"
                  style={{ height: `${barPx}px` }}
                />
              )}
              {showThisLabel && (
                <span className={`text-[10px] leading-none tabular-nums transition-colors ${isCurrentWeek ? "text-accent font-semibold" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {bucket.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center mt-1.5 gap-1">
        {onPrev !== undefined && (
          <button
            onClick={onPrev}
            disabled={!canGoBack}
            className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/60 disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
            aria-label="Go back 14 days"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-sm bg-green-500" /> New
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-sm bg-accent" /> Review
          </span>
          {shouldAggregate && (
            <span className="text-[10px] text-muted-foreground">(weekly)</span>
          )}
        </div>
        {onNext !== undefined && (
          <button
            onClick={onNext}
            disabled={!canGoForward}
            className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/60 disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
            aria-label="Go forward 14 days"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </div>
    </div>
  );
});

/* ── Status Dot (hover tooltip) ── */

function StatusDot({
  color,
  label,
  retrievability,
  daysOverdue,
  priority,
  whyReasons,
}: {
  color: string;
  label: string;
  retrievability: number;
  daysOverdue: number;
  priority: "critical" | "high" | "medium" | "due";
  whyReasons: string[];
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
          {whyReasons.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground mb-0.5">Why now</p>
              {whyReasons.map((r, i) => (
                <p key={i} className="text-[11px] text-foreground/80">• {r}</p>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ── Practice Recommendation ── */

function PracticeRecommendationPanel({
  recommendation,
  onAction,
  onDismiss,
}: {
  recommendation: PracticeRecommendation;
  onAction: (mode: ListMode) => void;
  onDismiss: () => void;
}) {
  const toneLabel: Record<PracticeRecommendation["tone"], string> = {
    neutral: "Plan",
    good: "On track",
    watch: "Watch",
    danger: "Priority",
  };
  const toneClass: Record<PracticeRecommendation["tone"], string> = {
    neutral: "border-accent/20 bg-accent/10 text-accent",
    good: "border-green-500/20 bg-green-500/10 text-green-400",
    watch: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    danger: "border-red-500/25 bg-red-500/10 text-red-300",
  };
  const displayTitle = recommendation.title.startsWith("Recommendation: ")
    ? recommendation.title.replace(/^Recommendation: /, "Today: ")
    : `Today: ${recommendation.title}`;
  const trendLabel = recommendation.metrics
    ? recommendation.metrics.slope14 >= 0.75
      ? "Trend rising"
      : recommendation.metrics.slope14 <= -0.5
        ? "Trend easing"
        : "Trend stable"
    : null;

  return (
    <section className="mb-3 rounded-lg border border-border bg-muted/80 px-3 py-3" aria-label="Practice recommendation">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background/50 text-accent">
            <Target size={15} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{displayTitle}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneClass[recommendation.tone]}`}>
                {toneLabel[recommendation.tone]}
              </span>
              {recommendation.metrics && <InfoTooltip
                content={
                  <div className="space-y-1.5">
                    <p className="font-medium">Review load forecast</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                      <span className="text-muted-foreground">Avg due</span>
                      <span className="text-right tabular-nums">{recommendation.metrics.avg14.toFixed(1)}</span>
                      <span className="text-muted-foreground">Peak due</span>
                      <span className="text-right tabular-nums">{recommendation.metrics.max14.toFixed(0)}</span>
                      <span className="text-muted-foreground">Growth/day</span>
                      <span className="text-right tabular-nums">{recommendation.metrics.slope14.toFixed(1)}</span>
                      <span className="text-muted-foreground">Peak load</span>
                      <span className="text-right tabular-nums">{recommendation.metrics.peakLoadDays.toFixed(1)}d</span>
                    </div>
                    <p className="border-t border-border/60 pt-1 text-[11px] text-muted-foreground">Aurora flags the queue when it grows faster than recent review capacity can absorb.</p>
                  </div>
                }
              />}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{recommendation.body}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">{recommendation.reason}</p>
            {recommendation.metrics && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                <span className="rounded-md border border-border bg-background/40 px-2 py-1 tabular-nums">Avg due {recommendation.metrics.avg14.toFixed(1)}</span>
                <span className="rounded-md border border-border bg-background/40 px-2 py-1 tabular-nums">Peak {recommendation.metrics.max14.toFixed(0)}</span>
                {trendLabel && <span className="rounded-md border border-border bg-background/40 px-2 py-1">{trendLabel}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 self-start sm:pt-0.5">
          <button
            onClick={() => onAction(recommendation.actionMode)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-accent/25 bg-accent/15 px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
          >
            {recommendation.actionLabel}
            <ArrowRight size={13} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <button
            onClick={onDismiss}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
            aria-label="Hide recommendation"
            title="Hide recommendation"
          >
            <X size={14} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Settings Panel ── */

function SettingsPanel({
  date,
  count,
  title,
  onSave,
  onCancel,
  autoDeferHards,
  onToggleAutoDeferHards,
  showPracticeRecommendation,
  onTogglePracticeRecommendation,
}: {
  date: string;
  count: number;
  title: string;
  onSave: (date: string, count: number, title: string) => void;
  onCancel: () => void;
  autoDeferHards: boolean;
  onToggleAutoDeferHards: (enabled: boolean) => void;
  showPracticeRecommendation: boolean;
  onTogglePracticeRecommendation: (enabled: boolean) => void;
}) {
  const [d, setD] = useState(date);
  const [c, setC] = useState(count);
  const [t, setT] = useState(title);

  return (
    <div className="mt-3 rounded-md border border-border bg-background p-3 space-y-2">
      <div>
        <label htmlFor="countdown-title" className="block text-xs text-muted-foreground mb-1">Widget Name</label>
        <input
          id="countdown-title"
          type="text"
          value={t}
          onChange={(e) => setT(e.target.value)}
          placeholder="e.g. Fall Recruiting Countdown"
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
        />
      </div>
      <div>
        <label htmlFor="countdown-date" className="block text-xs text-muted-foreground mb-1">Target Date</label>
        <input
          id="countdown-date"
          type="date"
          value={d}
          onChange={(e) => setD(e.target.value)}
          style={{ colorScheme: "dark" }}
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
        />
      </div>
      <div>
        <label htmlFor="countdown-count" className="block text-xs text-muted-foreground mb-1">Target Problems</label>
        <div className="flex gap-1.5 mb-1.5">
          <button
            onClick={() => setC(75)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              c === 75 ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >Blind 75</button>
          <button
            onClick={() => setC(150)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              c === 150 ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >NeetCode 150</button>
        </div>
        <input
          id="countdown-count"
          type="number"
          min={1}
          max={500}
          value={c}
          onChange={(e) => setC(Number(e.target.value))}
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
        />
      </div>
      <div className="pt-1 border-t border-border">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={autoDeferHards}
            onChange={(e) => onToggleAutoDeferHards(e.target.checked)}
            className="rounded border-border"
          />
          Auto-defer Hard problems from review queue
        </label>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5 ml-5">
          Hards are excluded from reviews until you master the easier problems in each category
        </p>
      </div>
      <div className="pt-1 border-t border-border">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showPracticeRecommendation}
            onChange={(e) => onTogglePracticeRecommendation(e.target.checked)}
            className="rounded border-border"
          />
          Show strategy recommendation
        </label>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5 ml-5">
          Optional guidance based on goal pace, review load stability, and retention health
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="inline-flex h-7 items-center rounded-md border border-border px-3 text-xs text-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(d, c, t)}
          className="inline-flex h-7 items-center rounded-md bg-accent px-3 text-xs text-accent-foreground hover:opacity-90"
        >
          Save
        </button>
      </div>
    </div>
  );
}

/* ── Info Tooltip ── */

function SolvedDonut({ breakdown, totalSolved, totalTarget }: { breakdown: DifficultyBreakdown[]; totalSolved: number; totalTarget: number }) {
  const r = 34;
  const C = 2 * Math.PI * r;
  const TOTAL_PROBLEMS = 150;
  const easy = breakdown.find(d => d.difficulty === "Easy");
  const medium = breakdown.find(d => d.difficulty === "Medium");
  const hard = breakdown.find(d => d.difficulty === "Hard");
  const eA = easy?.attempted ?? 0;
  const mA = medium?.attempted ?? 0;
  const hA = hard?.attempted ?? 0;
  const eC = easy?.count ?? 0;
  const mC = medium?.count ?? 0;
  const hC = hard?.count ?? 0;
  const segs = [
    { color: "#22c55e", len: (eA / TOTAL_PROBLEMS) * C, start: 0 },
    { color: "#f59e0b", len: (mA / TOTAL_PROBLEMS) * C, start: (eA / TOTAL_PROBLEMS) * C },
    { color: "#ef4444", len: (hA / TOTAL_PROBLEMS) * C, start: ((eA + mA) / TOTAL_PROBLEMS) * C },
  ].filter(s => s.len > 0);
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx={42} cy={42} r={r} fill="none" strokeWidth={7} stroke="#374151" />
        {segs.map(({ color, len, start }) => (
          <circle
            key={color} cx={42} cy={42} r={r} fill="none"
            stroke={color} strokeWidth={7}
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={0}
            transform={`rotate(${-90 + (start / C) * 360} 42 42)`}
          />
        ))}
        <text x={42} y={42} textAnchor="middle" dominantBaseline="central" fill="#f9fafb" fontSize="20" fontWeight="700">{totalSolved}</text>
        <text x={42} y={58} textAnchor="middle" dominantBaseline="central" fill="#9ca3af" fontSize="10">/{totalTarget}</text>
      </svg>
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <span className="text-green-500 font-medium w-3.5">E</span>
          <span className="tabular-nums font-medium">{eA}</span>
          <span className="text-muted-foreground">/{eC}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span className="text-amber-500 font-medium w-3.5">M</span>
          <span className="tabular-nums font-medium">{mA}</span>
          <span className="text-muted-foreground">/{mC}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          <span className="text-red-500 font-medium w-3.5">H</span>
          <span className="tabular-nums font-medium">{hA}</span>
          <span className="text-muted-foreground">/{hC}</span>
        </div>
      </div>
    </div>
  );
}

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
        className="inline-flex text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-help"
        aria-label="More info"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
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

const MASTERY_THRESHOLD = 45; // stability in days

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
  const [learningPage, setLearningPage] = useState(0);
  const PAGE_SIZE = 10;
  const newCount = total - mastered - learning;
  const masteredPct = total > 0 ? (mastered / total) * 100 : 0;
  const learningPct = total > 0 ? (learning / total) * 100 : 0;
  const totalPages = Math.ceil(learningList.length / PAGE_SIZE);
  const displayLearning = learningList.slice(learningPage * PAGE_SIZE, (learningPage + 1) * PAGE_SIZE);

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
        <div className="mt-2 rounded-md border border-border/40 bg-background/30 p-2">
          <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1.5">Recently mastered</p>
          <div className="space-y-0.5">
            {masteryList.slice(0, 5).map((item) => (
              <Link key={item.leetcodeNumber ?? item.title} href={`/problems/${item.problemId}`} className="flex items-center gap-1.5 text-xs hover:bg-background/50 rounded px-1 -mx-1 transition-colors">
                <span className="text-green-500">✓</span>
                <span className="text-muted-foreground tabular-nums w-6 shrink-0">{item.leetcodeNumber}</span>
                <span className="truncate">{item.title}</span>
                <span className="ml-auto text-muted-foreground text-[11px]">{Math.round(item.stability)}d</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Learning problems — stability progress toward 45d */}
      {learningList.length > 0 && (
        <div className="mt-2 rounded-md border border-border/40 bg-background/30 p-2">
          <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1.5">Learning — stability toward 45d</p>
          <div className="space-y-1">
            {displayLearning.map((item) => {
              const pct = Math.min(100, (item.stability / MASTERY_THRESHOLD) * 100);
              return (
                <Link key={item.leetcodeNumber ?? item.title} href={`/problems/${item.problemId}`} className="flex items-center gap-1.5 text-xs group/learn hover:bg-background/50 rounded px-1 -mx-1 transition-colors">
                  <span className="text-muted-foreground tabular-nums w-6 shrink-0">{item.leetcodeNumber}</span>
                  <span className="w-32 shrink-0 truncate group-hover/learn:text-foreground transition-colors" title={item.title}>{item.title}</span>
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background group-hover/learn:h-2 transition-all duration-150">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-[11px] tabular-nums w-10 text-right shrink-0">{item.stability.toFixed(1)}d</span>
                </Link>
              );
            })}
          </div>
          {learningList.length > PAGE_SIZE && (
            <nav className="flex flex-wrap items-center justify-between gap-2 mt-2 border-t border-border pt-2">
              <p className="text-[11px] text-muted-foreground">
                {learningPage * PAGE_SIZE + 1}–{Math.min((learningPage + 1) * PAGE_SIZE, learningList.length)} of {learningList.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLearningPage(p => Math.max(0, p - 1))}
                  disabled={learningPage === 0}
                  className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded border border-border px-2 text-[11px] text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                  <button
                    key={i}
                    onClick={() => setLearningPage(i)}
                    className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded px-1.5 text-[11px] transition-colors ${
                      i === learningPage
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "border border-border text-muted-foreground hover:bg-background hover:text-foreground"
                    }`}
                  >{i + 1}</button>
                ))}
                <button
                  onClick={() => setLearningPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={learningPage === totalPages - 1}
                  className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded border border-border px-2 text-[11px] text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >Next</button>
              </div>
            </nav>
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

/* ── Pending Submissions Banner ── */

function PendingBanner({
  items,
  onConfirm,
  onDismiss,
}: {
  items: PendingItem[];
  onConfirm: (item: PendingItem) => void;
  onDismiss: (item: PendingItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-2 rounded-lg border border-violet-500/30 bg-violet-500/5 overflow-hidden shrink-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-violet-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white px-1.5">
            {items.length}
          </span>
          <span className="text-foreground font-medium">
            {items.length === 1 ? "New submission detected" : `${items.length} new submissions detected`}
          </span>
          <span className="text-xs text-muted-foreground">from GitHub</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform ${expanded ? "" : "rotate-180"}`}><polyline points="18 15 12 9 6 15"/></svg>
      </button>
      {expanded && (
        <div className="border-t border-violet-500/20">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-b-0 transition-colors hover:bg-muted/50"
            >
              <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{item.leetcodeNumber}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/problems/${item.problemId}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                  {item.problemTitle}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {item.category} · {item.isReview ? "Review" : "First attempt"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <DifficultyBadge difficulty={item.difficulty} />
                <button
                  onClick={() => onConfirm(item)}
                  className="inline-flex h-7 items-center rounded-md bg-accent px-2.5 text-xs text-accent-foreground transition-colors hover:opacity-90"
                >
                  Log
                </button>
                <button
                  onClick={() => onDismiss(item)}
                  className="inline-flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Mock Interview Panel ── */

function MockPanel({
  phase, duration, timeLeft, problems, loggedIds,
  onSetDuration, onStart, onEnd, onReshuffle, onLogged, onReset, demoGuard,
}: {
  phase: MockPhase;
  duration: 30 | 45 | 60;
  timeLeft: number;
  problems: MockCandidate[];
  loggedIds: Set<number>;
  onSetDuration: (d: 30 | 45 | 60) => void;
  onStart: () => void;
  onEnd: () => void;
  onReshuffle: () => void;
  onLogged: (id: number) => void;
  onReset: () => void;
  demoGuard: (fn: () => void) => void;
}) {
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const timerColor = timeLeft <= 300 ? "text-destructive" : timeLeft <= 600 ? "text-warning" : "text-foreground";
  const barColor = timeLeft <= 300 ? "bg-red-500" : timeLeft <= 600 ? "bg-yellow-500" : "bg-accent";
  const progress = timeLeft / (duration * 60);
  const allLogged = problems.length > 0 && problems.every((p) => loggedIds.has(p.id));

  if (phase === "setup") {
    return (
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        {/* Duration picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Duration:</span>
          <div className="flex rounded-md border border-border p-0.5 gap-0.5">
            {([30, 45, 60] as const).map((d) => (
              <button
                key={d}
                onClick={() => onSetDuration(d)}
                className={`px-3 py-1 rounded text-xs transition-colors ${duration === d ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>

        {problems.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted p-6 text-center text-sm text-muted-foreground">
            No attempted medium/hard problems found yet. Work through some problems first, then come back for a mock.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between shrink-0">
              <p className="text-xs text-muted-foreground">Selected from your weak categories</p>
              <button onClick={onReshuffle} className="text-xs text-accent hover:underline">Reshuffle</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {problems.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0">
                  <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{p.leetcodeNumber}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <DifficultyBadge difficulty={p.difficulty} />
                </div>
              ))}
            </div>
            <div className="px-3 py-3 border-t border-border/60 shrink-0">
              <button
                onClick={() => demoGuard(onStart)}
                className="w-full inline-flex h-9 items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90"
              >
                Start {duration}-min interview
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "active") {
    return (
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        {/* Timer */}
        <div className="rounded-lg border border-border bg-muted p-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className={`font-mono text-3xl font-bold tabular-nums ${timerColor}`}>{formatTime(timeLeft)}</span>
            <button
              onClick={onEnd}
              className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              End early
            </button>
          </div>
          <div className="h-1 w-full rounded-full bg-border overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor}`} style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        {/* Problems */}
        <div className="rounded-lg border border-border bg-muted flex-1 min-h-0 overflow-y-auto">
          {problems.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0">
              <span className="text-xs text-muted-foreground shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.leetcodeNumber}. {p.title}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </div>
              <DifficultyBadge difficulty={p.difficulty} />
              <a
                href={p.leetcodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 items-center rounded-md bg-accent px-2.5 text-xs text-accent-foreground hover:opacity-90 transition-opacity shrink-0"
              >
                Open ↗
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Finished phase
  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-sm font-medium">{timeLeft === 0 ? "Time's up!" : "Interview ended."}</p>
        {allLogged && (
          <button onClick={onReset} className="text-xs text-accent hover:underline">New mock</button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-muted flex-1 min-h-0 overflow-y-auto">
        {problems.map((p) => (
          <MockLogRow
            key={p.id}
            problem={p}
            sessionMinutes={duration}
            numProblems={problems.length}
            logged={loggedIds.has(p.id)}
            onLogged={onLogged}
            demoGuard={demoGuard}
          />
        ))}
      </div>

      {!allLogged && (
        <p className="text-xs text-muted-foreground shrink-0">Log each problem to update your SRS schedule.</p>
      )}
    </div>
  );
}

/* ── Mock log row — compact inline attempt logger ── */

function MockLogRow({ problem, sessionMinutes, numProblems, logged, onLogged, demoGuard }: {
  problem: MockCandidate;
  sessionMinutes: number;
  numProblems: number;
  logged: boolean;
  onLogged: (id: number) => void;
  demoGuard: (fn: () => void) => void;
}) {
  const [outcome, setOutcome] = useState<"YES" | "PARTIAL" | "NO" | null>(null);
  const [confidence, setConfidence] = useState<number>(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solveMinutes = Math.floor((sessionMinutes * 60) / numProblems / 60);
  const quality = outcome === "YES" ? "OPTIMAL" : outcome === "PARTIAL" ? "SUBOPTIMAL" : "NONE";

  async function submit() {
    if (!outcome) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          solvedIndependently: outcome,
          solutionQuality: quality,
          confidence,
          solveTimeMinutes: solveMinutes,
          studyTimeMinutes: 0,
          rewroteFromScratch: "NO",
          source: "manual",
        }),
      });
      if (res.ok) {
        onLogged(problem.id);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed to save");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (logged) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0">
        <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{problem.leetcodeNumber}</span>
        <span className="text-sm flex-1 min-w-0 truncate text-muted-foreground">{problem.title}</span>
        <span className="text-xs text-green-500 font-medium">✓ Logged</span>
      </div>
    );
  }

  return (
    <div className="px-3 py-2.5 border-b border-border last:border-b-0 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{problem.leetcodeNumber}</span>
        <span className="text-sm font-medium flex-1 min-w-0 truncate">{problem.title}</span>
        <DifficultyBadge difficulty={problem.difficulty} />
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-10">
        {/* Outcome */}
        <div className="flex rounded border border-border p-0.5 gap-0.5">
          {(["YES", "PARTIAL", "NO"] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOutcome(o)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${outcome === o ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {o === "YES" ? "Solved" : o === "PARTIAL" ? "Partial" : "Stuck"}
            </button>
          ))}
        </div>
        {/* Confidence */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Conf:</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setConfidence(n)}
              className={`h-5 w-5 rounded text-[10px] transition-colors ${confidence === n ? "bg-accent text-accent-foreground font-bold" : "border border-border text-muted-foreground hover:text-foreground"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => demoGuard(submit)}
          disabled={!outcome || saving}
          className="inline-flex h-6 items-center rounded px-2.5 bg-accent text-xs text-accent-foreground font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {saving ? "…" : "Log"}
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  );
}
