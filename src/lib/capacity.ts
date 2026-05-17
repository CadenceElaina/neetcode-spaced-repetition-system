/* ── Shared types (also used by dashboard-client.tsx) ── */

export type ListMode = "review" | "new" | "completed" | "import" | "mock";

export type ReviewItem = {
  stateId: string;
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  neetcodeUrl: string | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  blind75: boolean;
  totalAttempts: number;
  daysOverdue: number;
  retrievability: number;
  stability: number;
  lastReviewedAt: string | null;
};

export type CompletedItem = {
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

export type NewProblem = {
  id: number;
  leetcodeNumber: number | null;
  title: string;
  neetcodeUrl: string | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  blind75: boolean;
  leetcodeUrl: string;
};

export type CategoryStat = {
  category: string;
  total: number;
  attempted: number;
  avgRetention: number;
};

export type DifficultyBreakdown = {
  difficulty: string;
  count: number;
  attempted: number;
};

export type AttemptDay = {
  date: string;
  count: number;
  newCount: number;
  reviewCount: number;
};

export type ReadinessResult = {
  score: number;
  tier: "S" | "A" | "B" | "C" | "D";
};

export type MasteryItem = {
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  stability: number;
  category: string;
};

export type PendingItem = {
  id: string;
  problemId: number;
  problemTitle: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  isReview: boolean;
  detectedAt: string;
};

export type DeferredItem = {
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

export type MockCandidate = {
  id: number;
  leetcodeNumber: number | null;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  leetcodeUrl: string;
  neetcodeUrl: string | null;
};

export type AdvisoryThreshold = "relaxed" | "moderate" | "strict";

export type DashboardData = {
  reviewQueue: ReviewItem[];
  deferredProblems: DeferredItem[];
  autoDeferHards: boolean;
  dailyTimeBudgetMinutes: number;
  newPerSession: number;
  advisoryThreshold: AdvisoryThreshold;
  newProblems: NewProblem[];
  totalProblems: number;
  attemptedCount: number;
  retainedCount: number;
  readiness: ReadinessResult;
  readinessBreakdown: { coverage: number; retention: number; categoryBalance: number; consistency: number };
  consistencyReviewed: number;
  consistencyDue: number;
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
    blind75: boolean;
  }[];
  importAttemptedIds: number[];
  importTodayAttemptedIds: number[];
  pendingSubmissions: PendingItem[];
  mockCandidates: MockCandidate[];
};

export type QueueProjection = {
  currentSize: number;
  dailyQueueSize: number[];
  clearDay: number | null;
  reviewsPerDay: number;
  newPerDay: number;
};

export type QueueStability = {
  avg14: number;
  max14: number;
  end14: number;
  growth14: number;
  firstWeekSlope: number;
  secondWeekSlope: number;
  acceleration: number;
  avgLoadDays: number;
  peakLoadDays: number;
  frontAvg: number;
  backAvg: number;
  drainRate: number;
};

export type PracticeRecommendation = {
  tone: "neutral" | "good" | "watch" | "danger";
  title: string;
  body: string;
  reason: string;
  actionLabel: string;
  actionMode: ListMode;
  metrics?: QueueStability;
};

/* ── Constants ── */

export const AVG_REVIEW_SESSION_MINUTES = 25;
export const AVG_NEW_SESSION_MINUTES = 45;
export const AVG_EASY_NEW_SESSION_MINUTES = 25;
export const AVG_PROBLEM_SESSION_MINUTES = 30;

export const QUEUE_GREEN_RATIO  = 0.6;   // freely add new problems
export const QUEUE_YELLOW_RATIO = 0.85;  // add 1–2 new/day max
export const QUEUE_AMBER_RATIO  = 1.1;   // review first before any new
export const QUEUE_ORANGE_RATIO = 1.5;   // queue heavy — stop new entirely
export const QUEUE_RED_RATIO    = 2.0;   // overloaded threshold

/* ── Helpers ── */

export function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function queueStability(projection: QueueProjection): QueueStability {
  const days = projection.dailyQueueSize;
  const first14 = days.slice(0, 14);
  const firstWeek = days.slice(0, 7);
  const secondWeek = days.slice(7, 14);
  const splitIdx = Math.floor(days.length / 2);
  const frontHalf = days.slice(0, splitIdx);
  const backHalf = days.slice(splitIdx);
  const start = days[0] ?? 0;
  const end14 = first14[first14.length - 1] ?? start;
  const firstWeekSlope = firstWeek.length > 1 ? (firstWeek[firstWeek.length - 1] - firstWeek[0]) / (firstWeek.length - 1) : 0;
  const secondWeekSlope = secondWeek.length > 1 ? (secondWeek[secondWeek.length - 1] - secondWeek[0]) / (secondWeek.length - 1) : 0;
  const avg14 = avg(first14);
  const max14 = Math.max(...first14, 0);
  const reviewsPerDay = Math.max(1, projection.reviewsPerDay);
  const frontAvg = frontHalf.length > 0 ? avg(frontHalf) : 0;
  const backAvg = backHalf.length > 0 ? avg(backHalf) : frontAvg;

  return {
    avg14,
    max14,
    end14,
    growth14: end14 - start,
    firstWeekSlope,
    secondWeekSlope,
    acceleration: secondWeekSlope - firstWeekSlope,
    avgLoadDays: avg14 / reviewsPerDay,
    peakLoadDays: max14 / reviewsPerDay,
    frontAvg,
    backAvg,
    drainRate: splitIdx > 0 ? (frontAvg - backAvg) / splitIdx : 0,
  };
}

/* ── computeCapacity ── */

export function computeCapacity(
  dailyTimeBudgetMinutes: number,
  expectedDailyDue: number
): {
  reviewCapacity: number;
  remainingMinutes: number;
  newCapacity: number;
  canFitEasy: boolean;
} {
  const reviewCapacity = Math.max(1, Math.floor(dailyTimeBudgetMinutes / AVG_REVIEW_SESSION_MINUTES));
  const remainingMinutes = Math.max(0, dailyTimeBudgetMinutes - expectedDailyDue * AVG_REVIEW_SESSION_MINUTES);
  const newCapacity = Math.floor(remainingMinutes / AVG_NEW_SESSION_MINUTES);
  const canFitEasy = remainingMinutes >= AVG_EASY_NEW_SESSION_MINUTES;
  return { reviewCapacity, remainingMinutes, newCapacity, canFitEasy };
}

/* ── computePracticeRecommendation ── */

export function computePracticeRecommendation({
  data,
  countdown,
  goalType,
  actualProjection,
  dailyTimeBudgetMinutes,
  advisoryThreshold = "moderate",
}: {
  data: DashboardData;
  countdown: { daysLeft: number; remaining: number; onTrack: boolean; neededPerDay: number };
  goalType: "blind75" | "neetcode150" | "none";
  actualProjection: QueueProjection | null;
  dailyTimeBudgetMinutes: number;
  advisoryThreshold?: AdvisoryThreshold;
}): PracticeRecommendation {
  // Map advisory threshold to effective zone cutoffs.
  // relaxed: banner fires later (user tolerates higher load before warning)
  // strict: banner fires earlier (user wants early warning to stay ahead)
  const pullBackRatio = advisoryThreshold === "relaxed" ? QUEUE_AMBER_RATIO
                      : advisoryThreshold === "strict"  ? QUEUE_GREEN_RATIO
                      : QUEUE_YELLOW_RATIO;
  const stopNewRatio  = advisoryThreshold === "relaxed" ? QUEUE_ORANGE_RATIO
                      : advisoryThreshold === "strict"  ? QUEUE_YELLOW_RATIO
                      : QUEUE_AMBER_RATIO;
  const targetLabel = goalType === "blind75" ? "Blind 75" : goalType === "neetcode150" ? "NeetCode 150" : "your log";
  const requiredNewPerDay = countdown.daysLeft > 0 ? countdown.remaining / countdown.daysLeft : countdown.remaining;
  const behindCoverage = goalType !== "none" && countdown.remaining > 0 && requiredNewPerDay > Math.max(0.1, data.avgNewPerDay) * 1.25;
  const retentionRisk = data.readinessBreakdown.retention < 0.5 && data.attemptedCount >= 5;
  const weakCategoryRisk = data.readinessBreakdown.categoryBalance < 0.45 && data.attemptedCount >= 8;
  const dataLight = data.attemptedCount < 5;

  const lastAttemptEntry = [...data.fullAttemptHistory]
    .filter((d) => d.count > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const daysSinceLastAttempt = lastAttemptEntry
    ? Math.floor((Date.now() - new Date(lastAttemptEntry.date).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const onBreak = daysSinceLastAttempt !== null && daysSinceLastAttempt >= 7 && data.reviewQueue.length >= 1;

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

  if (data.attemptedCount < 5) {
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
  const capacity = computeCapacity(dailyTimeBudgetMinutes, metrics.backAvg);
  const queueLoadRatio = metrics.backAvg / capacity.reviewCapacity;
  const avgQueueLabel = metrics.avg14.toFixed(metrics.avg14 >= 10 ? 0 : 1);
  const peakQueueLabel = metrics.max14.toFixed(0);
  const lostMinutesSuffix = capacity.canFitEasy && capacity.newCapacity === 0
    ? " Your remaining budget fits one Easy (~25 min)."
    : "";

  if (onBreak) {
    const warmupTarget = Math.min(data.reviewQueue.length, 10);
    return {
      tone: "watch",
      title: `Welcome back — you've been away ${daysSinceLastAttempt ?? 0} days`,
      body: "Review what's due before adding anything new.",
      reason: `Your review queue has built up while you were away. Start with a lighter session to rebuild momentum — aim for ${warmupTarget} reviews today.`,
      actionLabel: "Review queue",
      actionMode: "review",
      metrics,
    };
  }

  // Absolute ceiling — always danger regardless of advisory threshold
  if (queueLoadRatio > QUEUE_ORANGE_RATIO) {
    return {
      tone: "danger",
      title: "Review first",
      body: `Your queue is projecting ~${Math.round(metrics.backAvg)} due/day against your ~${capacity.reviewCapacity}/day capacity. Pause new problems and clear reviews.`,
      reason: `At your current pace, the next 14 days average ${avgQueueLabel} due reviews and peak near ${peakQueueLabel}.`,
      actionLabel: "Review first",
      actionMode: "review",
      metrics,
    };
  }

  // Stop-new zone — threshold-adjusted via stopNewRatio
  if (queueLoadRatio > stopNewRatio) {
    const clearTarget = Math.round(capacity.reviewCapacity * 0.85);
    return {
      tone: "danger",
      title: "Review first",
      body: `Queue is above your review capacity. Stop adding new problems until it drops to ~${clearTarget}/day.`,
      reason: `Projected due reviews average ${avgQueueLabel} against your ~${capacity.reviewCapacity}/day capacity.`,
      actionLabel: "Review first",
      actionMode: "review",
      metrics,
    };
  }

  // Pull-back zone — threshold-adjusted via pullBackRatio
  if (queueLoadRatio > pullBackRatio) {
    const growing = metrics.drainRate < 0;
    return {
      tone: "watch",
      title: "Review first",
      body: growing
        ? "Queue is near your review capacity and trending up. Finish reviews before adding new problems."
        : "Queue is near capacity but holding steady. Add new problems only after today's reviews are done.",
      reason: growing
        ? `Projected load is ~${Math.round(metrics.backAvg)}/day — close to your ~${capacity.reviewCapacity}/day capacity and still growing.`
        : `Projected load is ~${Math.round(metrics.backAvg)}/day — roughly at your ~${capacity.reviewCapacity}/day capacity.`,
      actionLabel: "Review queue",
      actionMode: "review",
      metrics,
    };
  }

  // Healthy with headroom (fixed lower band)
  if (queueLoadRatio > QUEUE_GREEN_RATIO) {
    return {
      tone: "good",
      title: behindCoverage ? "Add coverage carefully" : "Keep current pace",
      body: behindCoverage
        ? `Your review load looks stable, and ${targetLabel} needs about ${requiredNewPerDay.toFixed(1)} new/day from here.`
        : "Your queue is healthy. Add a new problem when you have focus time, or review to strengthen retention.",
      reason: (weakCategoryRisk
        ? "Prefer a weak or under-covered category so coverage improves without hiding a blind spot."
        : retentionRisk
          ? "Retention is still developing — log confidence carefully after each attempt."
          : `Projected due reviews average ${avgQueueLabel}, within your ~${capacity.reviewCapacity}/day capacity.`) + lostMinutesSuffix,
      actionLabel: behindCoverage ? "Browse new" : actualProjection.currentSize > 0 ? "Review queue" : "Browse new",
      actionMode: behindCoverage ? "new" : actualProjection.currentSize > 0 ? "review" : "new",
      metrics,
    };
  }

  // GREEN — queue light (< 0.6×)
  return {
    tone: dataLight ? "neutral" : "good",
    title: behindCoverage ? "Add coverage" : "Keep current pace",
    body: dataLight
      ? "Aurora has limited history, but your current queue does not look unstable yet."
      : behindCoverage
        ? `Your review queue is light — ${targetLabel} needs about ${requiredNewPerDay.toFixed(1)} new/day from here.`
        : "Your queue is light. Add new problems when you have real focus time, or review weak categories.",
    reason: retentionRisk
      ? "Retention is still low — log confidence carefully after each attempt."
      : `Projected due reviews average ${avgQueueLabel} and peak near ${peakQueueLabel} over the next 14 days.` + lostMinutesSuffix,
    actionLabel: behindCoverage ? "Browse new" : actualProjection.currentSize > 0 ? "Review queue" : "Browse new",
    actionMode: behindCoverage ? "new" : actualProjection.currentSize > 0 ? "review" : "new",
    metrics,
  };
}
