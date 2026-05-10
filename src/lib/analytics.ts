/**
 * Analytics engine — learning trends, quality analysis, and cohort aggregates.
 * Pure computation only — no DB, no fetch, no side effects.
 *
 * Ascent (individual) exports:
 *   computeLearningVelocity, detectStuckProblems, computeMetacognitionGap,
 *   computeReviewCompliance, computeCategoryStats, computeQualityProgression
 *
 * Research (cohort) exports — marked below:
 *   computeModelCalibration, computeCohortStats
 */

import { computeRetrievability } from "@/lib/srs";

/* ── Shared input types ── */

export interface AttemptRecord {
  problemId: number;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  outcome: "YES" | "PARTIAL" | "NO";
  quality: "OPTIMAL" | "SUBOPTIMAL" | "BRUTE_FORCE" | "NONE";
  confidence: number;
  solveTimeMinutes: number | null;
  rewroteFromScratch: "YES" | "NO" | "DID_NOT_ATTEMPT" | null;
  timeComplexityCorrect: boolean | null;
  spaceComplexityCorrect: boolean | null;
  createdAt: Date;
}

export interface StateRecord {
  problemId: number;
  stability: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  totalAttempts: number;
  bestSolutionQuality: "OPTIMAL" | "SUBOPTIMAL" | "BRUTE_FORCE" | "NONE" | null;
}

/* ── Internal helpers ── */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

const QUALITY_RANK: Record<string, number> = {
  NONE: 0,
  BRUTE_FORCE: 1,
  SUBOPTIMAL: 2,
  OPTIMAL: 3,
};

function avg(ns: number[]): number {
  return ns.length > 0 ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
}

function currentR(s: StateRecord, asOf: Date): number {
  if (!s.lastReviewedAt) return 0;
  const days = daysBetween(s.lastReviewedAt, asOf);
  return isFinite(days) ? computeRetrievability(s.stability, days) : 0;
}

/* ── Learning velocity ── */

export interface VelocityResult {
  newProblemsPerDay: number;
  trend: "improving" | "declining" | "stable" | "insufficient_data";
  recentUniqueNew: number;
  priorUniqueNew: number;
}

/**
 * Measures how many new (first-ever) problem attempts happen per day and
 * whether that rate is trending up or down across two consecutive windows.
 */
export function computeLearningVelocity(
  attempts: AttemptRecord[],
  windowDays = 14,
  asOf: Date = new Date(),
): VelocityResult {
  const sorted = [...attempts].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  // First attempt date per problem (across all time)
  const firstSeen = new Map<number, Date>();
  for (const a of sorted) {
    if (!firstSeen.has(a.problemId)) firstSeen.set(a.problemId, a.createdAt);
  }

  const recentStart = new Date(asOf.getTime() - windowDays * MS_PER_DAY);
  const priorStart = new Date(asOf.getTime() - 2 * windowDays * MS_PER_DAY);

  let recentUniqueNew = 0;
  let priorUniqueNew = 0;

  for (const firstDate of firstSeen.values()) {
    if (firstDate >= recentStart && firstDate < asOf) recentUniqueNew++;
    else if (firstDate >= priorStart && firstDate < recentStart) priorUniqueNew++;
  }

  const newProblemsPerDay = recentUniqueNew / windowDays;

  let trend: VelocityResult["trend"] = "insufficient_data";
  if (recentUniqueNew > 0 || priorUniqueNew > 0) {
    if (priorUniqueNew === 0) {
      // First-ever activity: any improvement from zero is meaningful regardless of N
      trend = recentUniqueNew > 0 ? "improving" : "stable";
    } else if (recentUniqueNew < 3 || priorUniqueNew < 3) {
      // Small-N guard: single-digit windows produce noisy, meaningless trend signals
      trend = "stable";
    } else if (
      recentUniqueNew > priorUniqueNew * 1.15 &&
      recentUniqueNew - priorUniqueNew >= 1
    ) {
      trend = "improving";
    } else if (
      recentUniqueNew < priorUniqueNew * 0.85 &&
      priorUniqueNew - recentUniqueNew >= 1
    ) {
      trend = "declining";
    } else {
      trend = "stable";
    }
  }

  return { newProblemsPerDay, trend, recentUniqueNew, priorUniqueNew };
}

/* ── Stuck problem detection ── */

export interface StuckProblem {
  problemId: number;
  totalAttempts: number;
  bestQuality: "OPTIMAL" | "SUBOPTIMAL" | "BRUTE_FORCE" | "NONE" | null;
  daysSinceFirstAttempt: number;
}

/**
 * Problems with high attempt counts where quality hasn't progressed past
 * BRUTE_FORCE need a different approach — more SRS repetition won't fix them.
 */
export function detectStuckProblems(
  states: StateRecord[],
  attempts: AttemptRecord[],
  minAttempts = 4,
  asOf: Date = new Date(),
): StuckProblem[] {
  const firstSeen = new Map<number, Date>();
  for (const a of attempts) {
    const ex = firstSeen.get(a.problemId);
    if (!ex || a.createdAt < ex) firstSeen.set(a.problemId, a.createdAt);
  }

  return states
    .filter((s) => {
      if (s.totalAttempts < minAttempts) return false;
      const rank = QUALITY_RANK[s.bestSolutionQuality ?? "NONE"] ?? 0;
      return rank <= QUALITY_RANK["BRUTE_FORCE"];
    })
    .map((s) => ({
      problemId: s.problemId,
      totalAttempts: s.totalAttempts,
      bestQuality: s.bestSolutionQuality,
      daysSinceFirstAttempt: Math.floor(
        daysBetween(firstSeen.get(s.problemId) ?? asOf, asOf),
      ),
    }));
}

/* ── Metacognition gap ── */

export interface MetacognitionResult {
  overconfidenceRate: number;
  underconfidenceRate: number;
  overconfidentAttempts: number;
  underconfidentAttempts: number;
  totalAttempts: number;
}

/**
 * Measures the gap between self-assessed confidence and actual performance.
 * High overconfidenceRate: student doesn't know what they don't know.
 * High underconfidenceRate: student underestimates their own ability.
 */
export function computeMetacognitionGap(
  attempts: AttemptRecord[],
): MetacognitionResult {
  let overconfidentAttempts = 0;
  let underconfidentAttempts = 0;

  for (const a of attempts) {
    const strongOutcome =
      a.outcome === "YES" &&
      (a.quality === "OPTIMAL" || a.quality === "SUBOPTIMAL");
    const poorOutcome =
      a.outcome === "NO" ||
      (a.outcome !== "YES" && (a.quality === "BRUTE_FORCE" || a.quality === "NONE"));

    if (a.confidence >= 4 && poorOutcome) overconfidentAttempts++;
    if (a.confidence <= 2 && strongOutcome) underconfidentAttempts++;
  }

  const total = attempts.length;
  return {
    overconfidenceRate: total > 0 ? overconfidentAttempts / total : 0,
    underconfidenceRate: total > 0 ? underconfidentAttempts / total : 0,
    overconfidentAttempts,
    underconfidentAttempts,
    totalAttempts: total,
  };
}

/* ── Review compliance ── */

export interface ComplianceResult {
  complianceRate: number;
  reviewedInWindow: number;
  reviewsScheduledInWindow: number;
  currentlyOverdue: number;
  neverReviewed: number;
}

/**
 * Estimates review schedule adherence from current SRS state.
 * reviewedInWindow = states with lastReviewedAt in the past windowDays.
 * currentlyOverdue = states where nextReviewAt has passed.
 */
export function computeReviewCompliance(
  states: StateRecord[],
  windowDays = 14,
  asOf: Date = new Date(),
): ComplianceResult {
  const windowStart = new Date(asOf.getTime() - windowDays * MS_PER_DAY);

  let reviewedInWindow = 0;
  let reviewsScheduledInWindow = 0;
  let currentlyOverdue = 0;
  let neverReviewed = 0;

  for (const s of states) {
    if (!s.lastReviewedAt) {
      neverReviewed++;
      if (s.nextReviewAt && s.nextReviewAt >= windowStart && s.nextReviewAt < asOf) {
        reviewsScheduledInWindow++;
      }
      continue;
    }
    if (s.lastReviewedAt >= windowStart) {
      reviewedInWindow++;
      reviewsScheduledInWindow++;
    } else if (s.nextReviewAt && s.nextReviewAt >= windowStart && s.nextReviewAt < asOf) {
      // Due during the window but not reviewed — missed opportunity, not old backlog
      reviewsScheduledInWindow++;
    }
    if (s.nextReviewAt && s.nextReviewAt < asOf) currentlyOverdue++;
  }

  const complianceRate =
    reviewsScheduledInWindow > 0
      ? Math.min(1, reviewedInWindow / reviewsScheduledInWindow)
      : 1;

  return { complianceRate, reviewedInWindow, reviewsScheduledInWindow, currentlyOverdue, neverReviewed };
}

/* ── Category statistics ── */

export interface CategoryStat {
  category: string;
  attemptedProblems: number;
  avgR: number;
  stuckCount: number;
  avgAttemptsToOptimal: number | null;
  complexityAccuracyRate: number;
}

/**
 * Per-category breakdown: retention health, stuck problems, complexity accuracy.
 * Category is derived from AttemptRecord.category (no separate lookup needed).
 */
export function computeCategoryStats(
  attempts: AttemptRecord[],
  states: StateRecord[],
  asOf: Date = new Date(),
): CategoryStat[] {
  // Build problemId → category from attempts
  const problemCategory = new Map<number, string>();
  for (const a of attempts) {
    if (!problemCategory.has(a.problemId)) problemCategory.set(a.problemId, a.category);
  }

  // Group states and attempts by category
  const byCategory = new Map<
    string,
    { states: StateRecord[]; attempts: AttemptRecord[] }
  >();

  for (const s of states) {
    const cat = problemCategory.get(s.problemId);
    if (!cat) continue;
    if (!byCategory.has(cat)) byCategory.set(cat, { states: [], attempts: [] });
    byCategory.get(cat)!.states.push(s);
  }

  for (const a of attempts) {
    const cat = a.category;
    if (!byCategory.has(cat)) byCategory.set(cat, { states: [], attempts: [] });
    byCategory.get(cat)!.attempts.push(a);
  }

  return Array.from(byCategory.entries()).map(([category, { states: catStates, attempts: catAttempts }]) => {
    const avgR = avg(catStates.map((s) => currentR(s, asOf)));

    const stuckCount = catStates.filter(
      (s) =>
        s.totalAttempts >= 4 &&
        (QUALITY_RANK[s.bestSolutionQuality ?? "NONE"] ?? 0) <= QUALITY_RANK["BRUTE_FORCE"],
    ).length;

    // Per-problem: how many attempts before first YES:OPTIMAL
    const attemptsByProblem = new Map<number, AttemptRecord[]>();
    for (const a of catAttempts) {
      if (!attemptsByProblem.has(a.problemId)) attemptsByProblem.set(a.problemId, []);
      attemptsByProblem.get(a.problemId)!.push(a);
    }

    const attemptsToOptimalList: number[] = [];
    for (const pAttempts of attemptsByProblem.values()) {
      const sorted = [...pAttempts].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const idx = sorted.findIndex((a) => a.outcome === "YES" && a.quality === "OPTIMAL");
      if (idx !== -1) attemptsToOptimalList.push(idx + 1);
    }

    const withComplexity = catAttempts.filter(
      (a) => a.timeComplexityCorrect !== null && a.spaceComplexityCorrect !== null,
    );
    const complexityAccuracyRate =
      withComplexity.length > 0
        ? withComplexity.filter((a) => a.timeComplexityCorrect && a.spaceComplexityCorrect).length /
          withComplexity.length
        : 0;

    return {
      category,
      attemptedProblems: catStates.length,
      avgR,
      stuckCount,
      avgAttemptsToOptimal: attemptsToOptimalList.length > 0 ? avg(attemptsToOptimalList) : null,
      complexityAccuracyRate,
    };
  });
}

/* ── Quality progression ── */

export interface QualityProgressionResult {
  problemId: number;
  attemptsToFirstOptimal: number | null;
  qualitySequence: Array<"OPTIMAL" | "SUBOPTIMAL" | "BRUTE_FORCE" | "NONE">;
  isImproving: boolean;
  hasRegressed: boolean;
}

/**
 * Traces how quality changed across all attempts on a single problem.
 * hasRegressed = quality dropped more than one tier after reaching a peak.
 */
export function computeQualityProgression(
  attempts: AttemptRecord[],
  problemId: number,
): QualityProgressionResult {
  const sorted = attempts
    .filter((a) => a.problemId === problemId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const qualitySequence = sorted.map((a) => a.quality);

  const optimalIdx = sorted.findIndex(
    (a) => a.outcome === "YES" && a.quality === "OPTIMAL",
  );

  const recent = qualitySequence.slice(-3);
  const isImproving =
    recent.length >= 2 &&
    (QUALITY_RANK[recent[recent.length - 1]] ?? 0) > (QUALITY_RANK[recent[0]] ?? 0);

  let peakRank = 0;
  let hasRegressed = false;
  for (const q of qualitySequence) {
    const rank = QUALITY_RANK[q] ?? 0;
    if (rank > peakRank) peakRank = rank;
    else if (rank < peakRank - 1) hasRegressed = true;
  }

  return {
    problemId,
    attemptsToFirstOptimal: optimalIdx === -1 ? null : optimalIdx + 1,
    qualitySequence,
    isImproving,
    hasRegressed,
  };
}

/* ── Research: forgetting curve calibration ── */

export interface ReviewPoint {
  predictedR: number;
  outcome: "YES" | "PARTIAL" | "NO";
}

export interface CalibrationBucket {
  rRange: [number, number];
  predictedMidpoint: number;
  actualSuccessRate: number;
  count: number;
}

export interface CalibrationResult {
  buckets: CalibrationBucket[];
  meanAbsoluteError: number;
  isWellCalibrated: boolean;
}

/**
 * [Research] Validates SRS model accuracy against actual outcomes.
 * If predicted R = 0.8 and actual success rate in that bucket ≈ 0.8, the model
 * is well-calibrated for coding problems. Buckets with < 5 samples are excluded
 * from MAE to avoid noise from sparse data.
 */
export function computeModelCalibration(points: ReviewPoint[]): CalibrationResult {
  const BUCKETS: [number, number][] = [
    [0.3, 0.5],
    [0.5, 0.65],
    [0.65, 0.8],
    [0.8, 0.9],
    [0.9, 1.01],
  ];

  const buckets: CalibrationBucket[] = BUCKETS.map(([lo, hi]) => {
    const inBucket = points.filter((p) => p.predictedR >= lo && p.predictedR < hi);
    const successes = inBucket.filter((p) => p.outcome === "YES").length;
    return {
      rRange: [lo, hi],
      predictedMidpoint: (lo + hi) / 2,
      actualSuccessRate: inBucket.length > 0 ? successes / inBucket.length : 0,
      count: inBucket.length,
    };
  });

  const populated = buckets.filter((b) => b.count >= 5);
  const meanAbsoluteError =
    populated.length > 0
      ? avg(populated.map((b) => Math.abs(b.predictedMidpoint - b.actualSuccessRate)))
      : 0;

  return { buckets, meanAbsoluteError, isWellCalibrated: meanAbsoluteError < 0.1 };
}

/* ── Research: cohort aggregate ── */

export interface ProblemCohortStat {
  problemId: number;
  enrolledStudentsAttempted: number;
  avgStability: number;
  avgR: number;
  avgAttemptsToOptimal: number | null;
  pctAchievedOptimal: number;
  noOutcomeRate: number;
  complexityAccuracyRate: number;
}

/**
 * [Research] Aggregates per-problem statistics across a cohort.
 * Each element of allUserAttempts / allUserStates corresponds to one student.
 */
export function computeCohortStats(
  allUserAttempts: AttemptRecord[][],
  allUserStates: StateRecord[][],
  asOf: Date = new Date(),
): ProblemCohortStat[] {
  type ProblemAcc = {
    stabilities: number[];
    Rs: number[];
    attemptsToOptimal: number[];
    achievedOptimal: number;
    totalStudents: number;
    noOutcomes: number;
    totalAttempts: number;
    complexityCorrect: number;
    complexityTotal: number;
  };

  const acc = new Map<number, ProblemAcc>();

  for (let i = 0; i < allUserStates.length; i++) {
    const userAttempts = allUserAttempts[i] ?? [];
    const userStates = allUserStates[i] ?? [];

    const attemptsByProblem = new Map<number, AttemptRecord[]>();
    for (const a of userAttempts) {
      if (!attemptsByProblem.has(a.problemId)) attemptsByProblem.set(a.problemId, []);
      attemptsByProblem.get(a.problemId)!.push(a);
    }

    for (const s of userStates) {
      if (!acc.has(s.problemId)) {
        acc.set(s.problemId, {
          stabilities: [], Rs: [], attemptsToOptimal: [],
          achievedOptimal: 0, totalStudents: 0,
          noOutcomes: 0, totalAttempts: 0,
          complexityCorrect: 0, complexityTotal: 0,
        });
      }
      const d = acc.get(s.problemId)!;
      d.totalStudents++;
      d.stabilities.push(s.stability);
      d.Rs.push(currentR(s, asOf));

      const pAttempts = (attemptsByProblem.get(s.problemId) ?? []).sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const optIdx = pAttempts.findIndex(
        (a) => a.outcome === "YES" && a.quality === "OPTIMAL",
      );
      if (optIdx !== -1) {
        d.attemptsToOptimal.push(optIdx + 1);
        d.achievedOptimal++;
      }

      for (const a of pAttempts) {
        d.totalAttempts++;
        if (a.outcome === "NO") d.noOutcomes++;
        if (a.timeComplexityCorrect !== null && a.spaceComplexityCorrect !== null) {
          d.complexityTotal++;
          if (a.timeComplexityCorrect && a.spaceComplexityCorrect) d.complexityCorrect++;
        }
      }
    }
  }

  return Array.from(acc.entries()).map(([problemId, d]) => ({
    problemId,
    enrolledStudentsAttempted: d.totalStudents,
    avgStability: avg(d.stabilities),
    avgR: avg(d.Rs),
    avgAttemptsToOptimal: d.attemptsToOptimal.length > 0 ? avg(d.attemptsToOptimal) : null,
    pctAchievedOptimal: d.totalStudents > 0 ? d.achievedOptimal / d.totalStudents : 0,
    noOutcomeRate: d.totalAttempts > 0 ? d.noOutcomes / d.totalAttempts : 0,
    complexityAccuracyRate: d.complexityTotal > 0 ? d.complexityCorrect / d.complexityTotal : 0,
  }));
}
