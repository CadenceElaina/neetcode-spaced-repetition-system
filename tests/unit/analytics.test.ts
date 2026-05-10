import { describe, it, expect } from "vitest";
import {
  computeLearningVelocity,
  detectStuckProblems,
  computeMetacognitionGap,
  computeReviewCompliance,
  computeCategoryStats,
  computeQualityProgression,
  computeModelCalibration,
  computeCohortStats,
  type AttemptRecord,
  type StateRecord,
  type ReviewPoint,
} from "@/lib/analytics";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number, from: Date = NOW): Date {
  return new Date(from.getTime() - n * DAY);
}

function daysFromNow(n: number, from: Date = NOW): Date {
  return new Date(from.getTime() + n * DAY);
}

const NOW = new Date("2026-05-03T12:00:00Z");

function attempt(
  problemId: number,
  createdAt: Date,
  overrides: Partial<AttemptRecord> = {},
): AttemptRecord {
  return {
    problemId,
    category: "Arrays & Hashing",
    difficulty: "Medium",
    outcome: "YES",
    quality: "OPTIMAL",
    confidence: 3,
    solveTimeMinutes: 15,
    rewroteFromScratch: "NO",
    timeComplexityCorrect: null,
    spaceComplexityCorrect: null,
    createdAt,
    ...overrides,
  };
}

function state(
  problemId: number,
  overrides: Partial<StateRecord> = {},
): StateRecord {
  return {
    problemId,
    stability: 10,
    lastReviewedAt: daysAgo(3),
    nextReviewAt: daysFromNow(7),
    totalAttempts: 1,
    bestSolutionQuality: "OPTIMAL",
    ...overrides,
  };
}

// ── computeLearningVelocity ───────────────────────────────────────────────────

describe("computeLearningVelocity", () => {
  it("returns 0 velocity and insufficient_data for empty attempts", () => {
    const r = computeLearningVelocity([], 14, NOW);
    expect(r.newProblemsPerDay).toBe(0);
    expect(r.trend).toBe("insufficient_data");
  });

  it("counts only first attempts per problem, not repeat reviews", () => {
    const attempts = [
      attempt(1, daysAgo(3)),
      attempt(1, daysAgo(1)), // repeat of problem 1
      attempt(2, daysAgo(2)),
    ];
    const r = computeLearningVelocity(attempts, 14, NOW);
    expect(r.recentUniqueNew).toBe(2); // 2 unique problems, not 3 attempts
  });

  it("trend is improving when recent window has significantly more new problems", () => {
    const prior = [1, 2, 3].map((id) => attempt(id, daysAgo(20)));
    const recent = [4, 5, 6, 7, 8, 9].map((id) => attempt(id, daysAgo(5)));
    const r = computeLearningVelocity([...prior, ...recent], 14, NOW);
    expect(r.trend).toBe("improving");
  });

  it("trend is declining when recent window has significantly fewer new problems", () => {
    const prior = [1, 2, 3, 4, 5, 6].map((id) => attempt(id, daysAgo(20)));
    // Use 3 recent problems so the small-N guard (< 3) does not suppress the signal.
    // 3 vs 6: 3 < 6 * 0.85 = 5.1 and diff = 3 ≥ 1 → declining.
    const recent = [7, 8, 9].map((id) => attempt(id, daysAgo(3)));
    const r = computeLearningVelocity([...prior, ...recent], 14, NOW);
    expect(r.trend).toBe("declining");
  });

  it("trend is stable when both windows have similar counts", () => {
    const prior = [1, 2, 3].map((id) => attempt(id, daysAgo(20)));
    const recent = [4, 5, 3].map((id, i) => attempt(id + 10, daysAgo(i + 2)));
    const r = computeLearningVelocity([...prior, ...recent], 14, NOW);
    expect(r.trend).toBe("stable");
  });

  it("trend is improving when prior is 0 and recent is > 0", () => {
    const recent = [attempt(1, daysAgo(3))];
    const r = computeLearningVelocity(recent, 14, NOW);
    expect(r.trend).toBe("improving");
    expect(r.priorUniqueNew).toBe(0);
    expect(r.recentUniqueNew).toBe(1);
  });

  it("newProblemsPerDay equals recentUniqueNew / windowDays", () => {
    const attempts = [1, 2, 3, 4].map((id) => attempt(id, daysAgo(5)));
    const r = computeLearningVelocity(attempts, 14, NOW);
    expect(r.newProblemsPerDay).toBeCloseTo(4 / 14, 5);
  });

  // small-N guard
  it("small-N guard: 1 vs 1 → stable regardless of relative change", () => {
    const prior = [attempt(1, daysAgo(20))];
    const recent = [attempt(2, daysAgo(3))];
    const r = computeLearningVelocity([...prior, ...recent], 14, NOW);
    expect(r.recentUniqueNew).toBe(1);
    expect(r.priorUniqueNew).toBe(1);
    expect(r.trend).toBe("stable");
  });

  it("small-N guard: 2 vs 2 → stable", () => {
    const prior = [1, 2].map((id) => attempt(id, daysAgo(20)));
    const recent = [3, 4].map((id) => attempt(id, daysAgo(3)));
    const r = computeLearningVelocity([...prior, ...recent], 14, NOW);
    expect(r.trend).toBe("stable");
  });

  it("small-N guard: 3 vs 3 with < 15% difference → stable", () => {
    const prior = [1, 2, 3].map((id) => attempt(id, daysAgo(20)));
    const recent = [4, 5, 6].map((id) => attempt(id, daysAgo(3)));
    const r = computeLearningVelocity([...prior, ...recent], 14, NOW);
    // 3 vs 3: 0% difference, well within ±15%
    expect(r.trend).toBe("stable");
  });

  it("5 vs 8 (≥ 15% difference, ≥ 3 each) → improving", () => {
    const prior = [1, 2, 3, 4, 5].map((id) => attempt(id, daysAgo(20)));
    const recent = [6, 7, 8, 9, 10, 11, 12, 13].map((id) => attempt(id, daysAgo(3)));
    const r = computeLearningVelocity([...prior, ...recent], 14, NOW);
    expect(r.priorUniqueNew).toBe(5);
    expect(r.recentUniqueNew).toBe(8);
    expect(r.trend).toBe("improving");
  });

  it("8 vs 5 (≥ 15% difference, ≥ 3 each) → declining", () => {
    const prior = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => attempt(id, daysAgo(20)));
    const recent = [9, 10, 11, 12, 13].map((id) => attempt(id, daysAgo(3)));
    const r = computeLearningVelocity([...prior, ...recent], 14, NOW);
    expect(r.priorUniqueNew).toBe(8);
    expect(r.recentUniqueNew).toBe(5);
    expect(r.trend).toBe("declining");
  });
});

// ── detectStuckProblems ───────────────────────────────────────────────────────

describe("detectStuckProblems", () => {
  it("returns empty when no states meet threshold", () => {
    const s = [state(1, { totalAttempts: 2, bestSolutionQuality: "BRUTE_FORCE" })];
    expect(detectStuckProblems(s, [], 4, NOW)).toHaveLength(0);
  });

  it("flags problem with >= minAttempts and best quality BRUTE_FORCE", () => {
    const s = [state(1, { totalAttempts: 5, bestSolutionQuality: "BRUTE_FORCE" })];
    const stuck = detectStuckProblems(s, [], 4, NOW);
    expect(stuck).toHaveLength(1);
    expect(stuck[0].problemId).toBe(1);
    expect(stuck[0].totalAttempts).toBe(5);
  });

  it("flags problem with best quality NONE", () => {
    const s = [state(1, { totalAttempts: 4, bestSolutionQuality: "NONE" })];
    expect(detectStuckProblems(s, [], 4, NOW)).toHaveLength(1);
  });

  it("does not flag problem with best quality SUBOPTIMAL", () => {
    const s = [state(1, { totalAttempts: 4, bestSolutionQuality: "SUBOPTIMAL" })];
    expect(detectStuckProblems(s, [], 4, NOW)).toHaveLength(0);
  });

  it("does not flag mastered problem (OPTIMAL)", () => {
    const s = [state(1, { totalAttempts: 6, bestSolutionQuality: "OPTIMAL" })];
    expect(detectStuckProblems(s, [], 4, NOW)).toHaveLength(0);
  });

  it("computes daysSinceFirstAttempt from earliest attempt", () => {
    const s = [state(1, { totalAttempts: 4, bestSolutionQuality: "BRUTE_FORCE" })];
    const attempts = [
      attempt(1, daysAgo(30)),
      attempt(1, daysAgo(10)),
    ];
    const stuck = detectStuckProblems(s, attempts, 4, NOW);
    expect(stuck[0].daysSinceFirstAttempt).toBe(30);
  });
});

// ── computeMetacognitionGap ───────────────────────────────────────────────────

describe("computeMetacognitionGap", () => {
  it("returns 0 rates for empty input", () => {
    const r = computeMetacognitionGap([]);
    expect(r.overconfidenceRate).toBe(0);
    expect(r.underconfidenceRate).toBe(0);
  });

  it("detects overconfidence: high confidence + NO outcome", () => {
    const attempts = [
      attempt(1, daysAgo(1), { confidence: 5, outcome: "NO", quality: "NONE" }),
      attempt(2, daysAgo(2), { confidence: 4, outcome: "NO", quality: "NONE" }),
    ];
    const r = computeMetacognitionGap(attempts);
    expect(r.overconfidentAttempts).toBe(2);
    expect(r.overconfidenceRate).toBeCloseTo(1.0, 3);
  });

  it("detects overconfidence: high confidence + PARTIAL BRUTE_FORCE", () => {
    const attempts = [
      attempt(1, daysAgo(1), { confidence: 4, outcome: "PARTIAL", quality: "BRUTE_FORCE" }),
    ];
    const r = computeMetacognitionGap(attempts);
    expect(r.overconfidentAttempts).toBe(1);
  });

  it("detects underconfidence: low confidence + YES OPTIMAL", () => {
    const attempts = [
      attempt(1, daysAgo(1), { confidence: 1, outcome: "YES", quality: "OPTIMAL" }),
      attempt(2, daysAgo(2), { confidence: 2, outcome: "YES", quality: "SUBOPTIMAL" }),
    ];
    const r = computeMetacognitionGap(attempts);
    expect(r.underconfidentAttempts).toBe(2);
  });

  it("confidence 3 + YES OPTIMAL is neither overconfident nor underconfident", () => {
    const attempts = [attempt(1, daysAgo(1), { confidence: 3 })];
    const r = computeMetacognitionGap(attempts);
    expect(r.overconfidentAttempts).toBe(0);
    expect(r.underconfidentAttempts).toBe(0);
  });

  it("computes rates as fraction of total attempts", () => {
    const attempts = [
      attempt(1, daysAgo(1), { confidence: 5, outcome: "NO", quality: "NONE" }), // overconfident
      attempt(2, daysAgo(2)), // well-calibrated
      attempt(3, daysAgo(3)), // well-calibrated
      attempt(4, daysAgo(4)), // well-calibrated
    ];
    const r = computeMetacognitionGap(attempts);
    expect(r.overconfidenceRate).toBeCloseTo(0.25, 3);
    expect(r.totalAttempts).toBe(4);
  });
});

// ── computeReviewCompliance ───────────────────────────────────────────────────

describe("computeReviewCompliance", () => {
  it("returns compliance 1 when no states have been reviewed (empty)", () => {
    const r = computeReviewCompliance([], 14, NOW);
    expect(r.complianceRate).toBe(1);
    expect(r.neverReviewed).toBe(0);
  });

  it("counts never-reviewed states separately", () => {
    const states = [state(1, { lastReviewedAt: null, nextReviewAt: null })];
    const r = computeReviewCompliance(states, 14, NOW);
    expect(r.neverReviewed).toBe(1);
  });

  it("counts state reviewed in window as reviewedInWindow", () => {
    const states = [state(1, { lastReviewedAt: daysAgo(5), nextReviewAt: daysFromNow(5) })];
    const r = computeReviewCompliance(states, 14, NOW);
    expect(r.reviewedInWindow).toBe(1);
    expect(r.currentlyOverdue).toBe(0);
  });

  it("counts state with overdue nextReviewAt as currentlyOverdue", () => {
    const states = [
      state(1, { lastReviewedAt: daysAgo(20), nextReviewAt: daysAgo(5) }),
    ];
    const r = computeReviewCompliance(states, 14, NOW);
    expect(r.currentlyOverdue).toBe(1);
  });

  it("full compliance: all reviewed in window, none overdue", () => {
    const states = [
      state(1, { lastReviewedAt: daysAgo(2), nextReviewAt: daysFromNow(8) }),
      state(2, { lastReviewedAt: daysAgo(7), nextReviewAt: daysFromNow(3) }),
    ];
    const r = computeReviewCompliance(states, 14, NOW);
    expect(r.complianceRate).toBe(1);
  });

  it("zero compliance: none reviewed in window, all overdue", () => {
    const states = [
      state(1, { lastReviewedAt: daysAgo(20), nextReviewAt: daysAgo(6) }),
      state(2, { lastReviewedAt: daysAgo(18), nextReviewAt: daysAgo(4) }),
    ];
    const r = computeReviewCompliance(states, 14, NOW);
    expect(r.complianceRate).toBe(0);
  });

  // denominator fix: scheduled-in-window replaces reviewed+overdue
  it("returning user: large backlog from before the window, nothing scheduled in window → 1.0", () => {
    // All reviews were due 20+ days ago — before the 14-day window started.
    // With the old denominator this would appear near-zero; correct answer is 1.0.
    const states = [
      state(1, { lastReviewedAt: daysAgo(50), nextReviewAt: daysAgo(30) }),
      state(2, { lastReviewedAt: daysAgo(45), nextReviewAt: daysAgo(25) }),
      state(3, { lastReviewedAt: daysAgo(40), nextReviewAt: daysAgo(20) }),
    ];
    const r = computeReviewCompliance(states, 14, NOW);
    expect(r.reviewedInWindow).toBe(0);
    expect(r.currentlyOverdue).toBe(3);
    expect(r.reviewsScheduledInWindow).toBe(0);
    expect(r.complianceRate).toBe(1);
  });

  it("active user: 5 scheduled in window, all 5 reviewed → 1.0", () => {
    const states = [1, 2, 3, 4, 5].map((id) =>
      state(id, { lastReviewedAt: daysAgo(3), nextReviewAt: daysFromNow(7) }),
    );
    const r = computeReviewCompliance(states, 14, NOW);
    expect(r.reviewedInWindow).toBe(5);
    expect(r.reviewsScheduledInWindow).toBe(5);
    expect(r.complianceRate).toBe(1);
  });

  it("partial compliance: 5 scheduled in window, 3 reviewed → 0.6", () => {
    const reviewed = [1, 2, 3].map((id) =>
      state(id, { lastReviewedAt: daysAgo(3), nextReviewAt: daysFromNow(7) }),
    );
    // These two were due in the window but were not reviewed
    const missed = [4, 5].map((id) =>
      state(id, { lastReviewedAt: daysAgo(20), nextReviewAt: daysAgo(5) }),
    );
    const r = computeReviewCompliance([...reviewed, ...missed], 14, NOW);
    expect(r.reviewedInWindow).toBe(3);
    expect(r.reviewsScheduledInWindow).toBe(5);
    expect(r.complianceRate).toBeCloseTo(0.6, 5);
  });

  it("overdue backlog before the window does not affect compliance rate", () => {
    const reviewed = [1, 2, 3].map((id) =>
      state(id, { lastReviewedAt: daysAgo(3), nextReviewAt: daysFromNow(7) }),
    );
    const missed = [4, 5].map((id) =>
      state(id, { lastReviewedAt: daysAgo(20), nextReviewAt: daysAgo(5) }),
    );
    const oldBacklog = [6, 7, 8, 9, 10].map((id) =>
      state(id, { lastReviewedAt: daysAgo(60), nextReviewAt: daysAgo(45) }),
    );
    const r = computeReviewCompliance([...reviewed, ...missed, ...oldBacklog], 14, NOW);
    // Old backlog had nextReviewAt well before the window — should not inflate denominator
    expect(r.reviewsScheduledInWindow).toBe(5);
    expect(r.complianceRate).toBeCloseTo(0.6, 5);
  });
});

// ── computeCategoryStats ──────────────────────────────────────────────────────

describe("computeCategoryStats", () => {
  it("returns empty array when no attempts or states", () => {
    expect(computeCategoryStats([], [], NOW)).toHaveLength(0);
  });

  it("groups by category from AttemptRecord.category", () => {
    const attempts = [
      attempt(1, daysAgo(5), { category: "Arrays & Hashing" }),
      attempt(2, daysAgo(4), { category: "Stack" }),
    ];
    const states = [
      state(1, { totalAttempts: 1 }),
      state(2, { totalAttempts: 1 }),
    ];
    const result = computeCategoryStats(attempts, states, NOW);
    const categories = result.map((r) => r.category).sort();
    expect(categories).toContain("Arrays & Hashing");
    expect(categories).toContain("Stack");
  });

  it("counts stuck problems correctly within a category", () => {
    const attempts = [attempt(1, daysAgo(5), { category: "Stack" })];
    const states = [
      state(1, { totalAttempts: 5, bestSolutionQuality: "BRUTE_FORCE" }),
    ];
    const result = computeCategoryStats(attempts, states, NOW);
    const stack = result.find((r) => r.category === "Stack")!;
    expect(stack.stuckCount).toBe(1);
  });

  it("computes avgAttemptsToOptimal from attempt sequence", () => {
    // Problem 1: BRUTE_FORCE → OPTIMAL (2 attempts to optimal)
    const attempts = [
      attempt(1, daysAgo(5), { quality: "BRUTE_FORCE", outcome: "YES", category: "Stack" }),
      attempt(1, daysAgo(2), { quality: "OPTIMAL", outcome: "YES", category: "Stack" }),
    ];
    const states = [state(1, { totalAttempts: 2, bestSolutionQuality: "OPTIMAL" })];
    const result = computeCategoryStats(attempts, states, NOW);
    const stack = result.find((r) => r.category === "Stack")!;
    expect(stack.avgAttemptsToOptimal).toBe(2);
  });

  it("complexityAccuracyRate is 0 when no attempts have complexity data", () => {
    const attempts = [attempt(1, daysAgo(5))]; // timeComplexityCorrect: null
    const states = [state(1)];
    const result = computeCategoryStats(attempts, states, NOW);
    expect(result[0].complexityAccuracyRate).toBe(0);
  });

  it("computes complexityAccuracyRate from attempts with both fields set", () => {
    const attempts = [
      attempt(1, daysAgo(5), { timeComplexityCorrect: true, spaceComplexityCorrect: true }),
      attempt(2, daysAgo(4), { timeComplexityCorrect: false, spaceComplexityCorrect: true }),
    ];
    const states = [state(1), state(2)];
    const result = computeCategoryStats(attempts, states, NOW);
    expect(result[0].complexityAccuracyRate).toBeCloseTo(0.5, 3);
  });
});

// ── computeQualityProgression ─────────────────────────────────────────────────

describe("computeQualityProgression", () => {
  it("returns null attemptsToFirstOptimal when OPTIMAL never reached", () => {
    const attempts = [
      attempt(1, daysAgo(5), { quality: "BRUTE_FORCE" }),
      attempt(1, daysAgo(2), { quality: "BRUTE_FORCE" }),
    ];
    const r = computeQualityProgression(attempts, 1);
    expect(r.attemptsToFirstOptimal).toBeNull();
  });

  it("returns correct attempt index for first OPTIMAL", () => {
    const attempts = [
      attempt(1, daysAgo(6), { quality: "BRUTE_FORCE" }),
      attempt(1, daysAgo(4), { quality: "SUBOPTIMAL" }),
      attempt(1, daysAgo(2), { quality: "OPTIMAL" }),
    ];
    const r = computeQualityProgression(attempts, 1);
    expect(r.attemptsToFirstOptimal).toBe(3);
  });

  it("detects improving trend in last 3 attempts", () => {
    const attempts = [
      attempt(1, daysAgo(6), { quality: "NONE" }),
      attempt(1, daysAgo(4), { quality: "BRUTE_FORCE" }),
      attempt(1, daysAgo(2), { quality: "OPTIMAL" }),
    ];
    const r = computeQualityProgression(attempts, 1);
    expect(r.isImproving).toBe(true);
  });

  it("detects regression after a quality peak", () => {
    const attempts = [
      attempt(1, daysAgo(8), { quality: "BRUTE_FORCE" }),
      attempt(1, daysAgo(5), { quality: "OPTIMAL", outcome: "YES" }),
      attempt(1, daysAgo(2), { quality: "NONE", outcome: "NO" }), // dropped 3 tiers
    ];
    const r = computeQualityProgression(attempts, 1);
    expect(r.hasRegressed).toBe(true);
  });

  it("does not flag regression for a single-tier drop", () => {
    const attempts = [
      attempt(1, daysAgo(5), { quality: "OPTIMAL", outcome: "YES" }),
      attempt(1, daysAgo(2), { quality: "SUBOPTIMAL", outcome: "YES" }), // 1 tier drop
    ];
    const r = computeQualityProgression(attempts, 1);
    expect(r.hasRegressed).toBe(false);
  });

  it("returns empty sequence for unknown problemId", () => {
    const r = computeQualityProgression([], 99);
    expect(r.qualitySequence).toHaveLength(0);
    expect(r.attemptsToFirstOptimal).toBeNull();
  });
});

// ── computeModelCalibration ───────────────────────────────────────────────────

describe("computeModelCalibration", () => {
  it("returns empty buckets and MAE 0 for empty input", () => {
    const r = computeModelCalibration([]);
    expect(r.meanAbsoluteError).toBe(0);
    expect(r.isWellCalibrated).toBe(true);
  });

  it("is well-calibrated when predicted R matches actual success rate", () => {
    // High R bucket: 8 YES out of 10 (0.8 success rate ≈ predicted midpoint 0.85)
    const points: ReviewPoint[] = [
      ...Array(8).fill({ predictedR: 0.85, outcome: "YES" as const }),
      ...Array(2).fill({ predictedR: 0.85, outcome: "NO" as const }),
    ];
    const r = computeModelCalibration(points);
    const highBucket = r.buckets.find((b) => b.rRange[0] === 0.8)!;
    expect(highBucket.actualSuccessRate).toBeCloseTo(0.8, 2);
    expect(r.isWellCalibrated).toBe(true);
  });

  it("is NOT well-calibrated when actual success rate diverges from predicted R", () => {
    // High R predicted (0.85) but almost no one succeeds (overconfident model)
    const points: ReviewPoint[] = Array(10).fill({
      predictedR: 0.85,
      outcome: "NO" as const,
    });
    const r = computeModelCalibration(points);
    expect(r.isWellCalibrated).toBe(false);
  });

  it("excludes buckets with fewer than 5 samples from MAE", () => {
    // Only 2 points — not enough for MAE computation
    const points: ReviewPoint[] = [
      { predictedR: 0.85, outcome: "YES" },
      { predictedR: 0.85, outcome: "NO" },
    ];
    const r = computeModelCalibration(points);
    expect(r.meanAbsoluteError).toBe(0); // sparse bucket excluded
  });
});

// ── computeCohortStats ────────────────────────────────────────────────────────

describe("computeCohortStats", () => {
  it("returns empty array for empty cohort", () => {
    expect(computeCohortStats([], [], NOW)).toHaveLength(0);
  });

  it("aggregates stability and R across multiple students", () => {
    const student1States = [state(1, { stability: 10, lastReviewedAt: daysAgo(2) })];
    const student2States = [state(1, { stability: 20, lastReviewedAt: daysAgo(2) })];
    const result = computeCohortStats(
      [[], []],
      [student1States, student2States],
      NOW,
    );
    const p = result.find((r) => r.problemId === 1)!;
    expect(p.avgStability).toBeCloseTo(15, 3);
    expect(p.enrolledStudentsAttempted).toBe(2);
  });

  it("computes pctAchievedOptimal correctly", () => {
    const student1Attempts = [attempt(1, daysAgo(3), { quality: "OPTIMAL" })];
    const student2Attempts = [attempt(1, daysAgo(3), { quality: "BRUTE_FORCE" })];
    const states = [state(1)];
    const result = computeCohortStats(
      [student1Attempts, student2Attempts],
      [states, states],
      NOW,
    );
    const p = result.find((r) => r.problemId === 1)!;
    expect(p.pctAchievedOptimal).toBeCloseTo(0.5, 3); // 1 of 2
  });

  it("computes noOutcomeRate from NO outcomes", () => {
    const attempts = [
      attempt(1, daysAgo(3), { outcome: "NO", quality: "NONE" }),
      attempt(1, daysAgo(2), { outcome: "YES", quality: "OPTIMAL" }),
    ];
    const result = computeCohortStats([attempts], [[state(1)]], NOW);
    const p = result.find((r) => r.problemId === 1)!;
    expect(p.noOutcomeRate).toBeCloseTo(0.5, 3);
  });

  it("handles student with no attempts for a problem they have state for", () => {
    const result = computeCohortStats([[]], [[state(1)]], NOW);
    const p = result.find((r) => r.problemId === 1)!;
    expect(p.avgAttemptsToOptimal).toBeNull();
    expect(p.pctAchievedOptimal).toBe(0);
  });
});
