import { describe, it, expect } from "vitest";
import { computeCapacity, computePracticeRecommendation, type DashboardData, type QueueProjection } from "@/lib/capacity";

/* ── computeCapacity ── */

describe("computeCapacity", () => {
  it("budget=60 due=0 → reviewCapacity=2 remainingMinutes=60 newCapacity=1 canFitEasy=true", () => {
    const r = computeCapacity(60, 0);
    expect(r.reviewCapacity).toBe(2);
    expect(r.remainingMinutes).toBe(60);
    expect(r.newCapacity).toBe(1);
    expect(r.canFitEasy).toBe(true);
  });

  it("budget=60 due=2 → remainingMinutes=10 newCapacity=0 canFitEasy=false", () => {
    const r = computeCapacity(60, 2);
    expect(r.remainingMinutes).toBe(10);
    expect(r.newCapacity).toBe(0);
    expect(r.canFitEasy).toBe(false);
  });

  it("budget=90 due=2 → remainingMinutes=40 newCapacity=0 canFitEasy=true (Lost Minutes case)", () => {
    const r = computeCapacity(90, 2);
    expect(r.remainingMinutes).toBe(40);
    expect(r.newCapacity).toBe(0);
    expect(r.canFitEasy).toBe(true);
  });

  it("budget=90 due=1 → remainingMinutes=65 newCapacity=1 canFitEasy=true", () => {
    const r = computeCapacity(90, 1);
    expect(r.remainingMinutes).toBe(65);
    expect(r.newCapacity).toBe(1);
    expect(r.canFitEasy).toBe(true);
  });

  it("budget=30 due=0 → remainingMinutes=30 newCapacity=0 canFitEasy=true", () => {
    const r = computeCapacity(30, 0);
    expect(r.remainingMinutes).toBe(30);
    expect(r.newCapacity).toBe(0);
    expect(r.canFitEasy).toBe(true);
  });

  it("budget=30 due=1 → remainingMinutes=5 newCapacity=0 canFitEasy=false", () => {
    const r = computeCapacity(30, 1);
    expect(r.remainingMinutes).toBe(5);
    expect(r.newCapacity).toBe(0);
    expect(r.canFitEasy).toBe(false);
  });

  it("budget=120 due=2 → reviewCapacity=4 remainingMinutes=70 newCapacity=1 (Intensive preset)", () => {
    const r = computeCapacity(120, 2);
    expect(r.reviewCapacity).toBe(4);
    expect(r.remainingMinutes).toBe(70);
    expect(r.newCapacity).toBe(1);
    expect(r.canFitEasy).toBe(true);
  });

  it("budget=0 due=0 → reviewCapacity floors at 1 (prevents division-by-zero in Phase 2 ratio)", () => {
    const r = computeCapacity(0, 0);
    expect(r.reviewCapacity).toBe(1);
    expect(r.remainingMinutes).toBe(0);
    expect(r.newCapacity).toBe(0);
    expect(r.canFitEasy).toBe(false);
  });
});

/* ── computePracticeRecommendation fixtures ── */

// Minimal DashboardData that passes all the guards in computePracticeRecommendation
// without triggering break/critical/growing/heavy branches.
// The function only reads: fullAttemptHistory, reviewQueue.length, avgNewPerDay,
// readinessBreakdown, attemptedCount, learningCount.
function makeData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    fullAttemptHistory: [{ date: "2026-05-09", count: 1, newCount: 1, reviewCount: 0 }],
    reviewQueue: [],
    avgNewPerDay: 2,
    readinessBreakdown: { retention: 0.7, categoryBalance: 0.6, coverage: 0.5, consistency: 0.5 },
    attemptedCount: 10,
    learningCount: 5,
    // Unused fields below — satisfy the full DashboardData shape
    deferredProblems: [],
    autoDeferHards: false,
    dailyTimeBudgetMinutes: 60,
    newProblems: [],
    totalProblems: 150,
    retainedCount: 8,
    readiness: { score: 0.6, tier: "B" },
    consistencyReviewed: 5,
    consistencyDue: 5,
    currentStreak: 3,
    bestStreak: 7,
    avgPerDay: 2,
    avgReviewPerDay: 1,
    overallPerDay: 2,
    overallNewPerDay: 1,
    overallReviewPerDay: 1,
    categoryStats: [],
    difficultyBreakdown: [],
    attemptHistory: [],
    totalSolveMinutes: 100,
    totalStudyMinutes: 120,
    avgSolveMinutes: 30,
    avgConfidence: 3,
    masteredCount: 2,
    masteryList: [],
    learningList: [],
    completedProblems: [],
    importProblems: [],
    importAttemptedIds: [],
    importTodayAttemptedIds: [],
    pendingSubmissions: [],
    mockCandidates: [],
    ...overrides,
  };
}

// Stable projection: flat queue of 2 due/day, drainRate=0, peakLoadDays≈0.67
// backAvg=2 → computeCapacity(90, 2) → canFitEasy=true, newCapacity=0 (Lost Minutes case)
const stableProjection: QueueProjection = {
  currentSize: 1,
  dailyQueueSize: Array(30).fill(2),
  clearDay: null,
  reviewsPerDay: 3,
  newPerDay: 1,
};

// Countdown where behindCoverage is false:
// neededPerDay = 30/30 = 1.0, avgNewPerDay = 2 → 1.0 < 2*1.25=2.5 → false
const stableCountdown = { daysLeft: 30, remaining: 30, onTrack: true, neededPerDay: 1.0 };

/* ── computePracticeRecommendation: Lost Minutes branch ── */

describe("computePracticeRecommendation — Lost Minutes suffix", () => {
  it('appends "Easy (~25 min)" when queueStable + canFitEasy=true + newCapacity=0', () => {
    const rec = computePracticeRecommendation({
      data: makeData(),
      countdown: stableCountdown,
      goalType: "neetcode150",
      actualProjection: stableProjection,
      dailyTimeBudgetMinutes: 90,
    });

    expect(rec.tone).toBe("good");
    expect(rec.reason).toContain("Easy (~25 min)");
  });

  it('does NOT append "Easy" when newCapacity >= 1 (budget comfortably covers a full new session)', () => {
    // budget=90, due=1 → backAvg=1 → remaining=65, newCapacity=1 → canFitEasy=true but newCapacity≠0
    const projLightLoad: QueueProjection = {
      currentSize: 1,
      dailyQueueSize: Array(30).fill(1),
      clearDay: null,
      reviewsPerDay: 3,
      newPerDay: 1,
    };

    const rec = computePracticeRecommendation({
      data: makeData(),
      countdown: stableCountdown,
      goalType: "neetcode150",
      actualProjection: projLightLoad,
      dailyTimeBudgetMinutes: 90,
    });

    expect(rec.tone).toBe("good");
    expect(rec.reason).not.toContain("Easy (~25 min)");
  });
});

/* ── Negative test: danger tone must NOT include Easy suffix ── */

describe("computePracticeRecommendation — danger tone", () => {
  it('returns tone="danger" and reason does NOT mention "Easy" when queue is critical', () => {
    // Growing queue: front avg=1, back avg=9 → drainRate=(1-9)/15≈-0.533 → queueCritical=true
    const criticalProjection: QueueProjection = {
      currentSize: 5,
      dailyQueueSize: [...Array(15).fill(1), ...Array(15).fill(9)],
      clearDay: null,
      reviewsPerDay: 3,
      newPerDay: 1,
    };

    const rec = computePracticeRecommendation({
      data: makeData(),
      countdown: stableCountdown,
      goalType: "neetcode150",
      actualProjection: criticalProjection,
      dailyTimeBudgetMinutes: 90,
    });

    expect(rec.tone).toBe("danger");
    expect(rec.reason).not.toContain("Easy");
  });
});
