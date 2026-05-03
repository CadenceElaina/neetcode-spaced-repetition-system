import { describe, it, expect } from "vitest";
import {
  computeRetrievability,
  computeNewStability,
  computeInitialStability,
  computeNextReviewDate,
  computeReviewPriority,
  computeReadiness,
  type AttemptSignals,
  type PriorityInput,
  type ReadinessInput,
} from "@/lib/srs";

// ── Helpers ──────────────────────────────────────────────────────────────────

function signals(overrides: Partial<AttemptSignals> = {}): AttemptSignals {
  return {
    solvedIndependently: "YES",
    solutionQuality: "OPTIMAL",
    rewroteFromScratch: "NO",
    confidence: 3,
    solveTimeMinutes: 20,
    difficulty: "Medium",
    ...overrides,
  };
}

// ── computeRetrievability ─────────────────────────────────────────────────────

describe("computeRetrievability", () => {
  it("returns 1.0 on the same day (no decay)", () => {
    expect(computeRetrievability(10, 0)).toBe(1.0);
  });

  it("returns 1.0 for negative days since review", () => {
    expect(computeRetrievability(10, -1)).toBe(1.0);
  });

  it("returns e^-1 ≈ 0.368 when t equals stability", () => {
    // R(S, S) = e^(-S/S) = e^-1
    const r = computeRetrievability(10, 10);
    expect(r).toBeCloseTo(Math.exp(-1), 3);
  });

  it("clamps to RETRIEVABILITY_FLOOR (0.3) on heavy decay", () => {
    expect(computeRetrievability(1, 100)).toBe(0.3);
  });

  it("approaches RETRIEVABILITY_FLOOR for very large t", () => {
    expect(computeRetrievability(365, 99999)).toBe(0.3);
  });

  it("returns near 1.0 for very large stability relative to t", () => {
    expect(computeRetrievability(365, 1)).toBeGreaterThan(0.99);
  });
});

// ── computeNewStability ───────────────────────────────────────────────────────

describe("computeNewStability", () => {
  const OLD = 10; // days

  it("YES+OPTIMAL, conf 3 → old × 2.5", () => {
    const s = computeNewStability(OLD, signals());
    expect(s).toBeCloseTo(OLD * 2.5, 5);
  });

  it("YES+OPTIMAL, conf 4 → old × (2.5 + 0.1)", () => {
    const s = computeNewStability(OLD, signals({ confidence: 4 }));
    expect(s).toBeCloseTo(OLD * 2.6, 5);
  });

  it("YES+OPTIMAL, conf 5 + rewrite → old × (2.5 + 0.5 + 0.3)", () => {
    const s = computeNewStability(
      OLD,
      signals({ confidence: 5, rewroteFromScratch: "YES" }),
    );
    expect(s).toBeCloseTo(OLD * 3.3, 5);
  });

  it("YES+SUBOPTIMAL, conf 3 → old × 2.0", () => {
    const s = computeNewStability(OLD, signals({ solutionQuality: "SUBOPTIMAL" }));
    expect(s).toBeCloseTo(OLD * 2.0, 5);
  });

  it("YES+BRUTE_FORCE, conf 3 → old × 1.5", () => {
    const s = computeNewStability(OLD, signals({ solutionQuality: "BRUTE_FORCE" }));
    expect(s).toBeCloseTo(OLD * 1.5, 5);
  });

  it("PARTIAL+OPTIMAL, conf 3 → old × 1.1 (quality irrelevant for PARTIAL)", () => {
    const s = computeNewStability(
      OLD,
      signals({ solvedIndependently: "PARTIAL", solutionQuality: "OPTIMAL" }),
    );
    expect(s).toBeCloseTo(OLD * 1.1, 5);
  });

  it("PARTIAL+SUBOPTIMAL, conf 3 → old × 1.1 (same as OPTIMAL — quality irrelevant)", () => {
    const s = computeNewStability(
      OLD,
      signals({ solvedIndependently: "PARTIAL", solutionQuality: "SUBOPTIMAL" }),
    );
    expect(s).toBeCloseTo(OLD * 1.1, 5);
  });

  it("PARTIAL+BRUTE_FORCE, conf 3 → old × 1.1", () => {
    const s = computeNewStability(
      OLD,
      signals({ solvedIndependently: "PARTIAL", solutionQuality: "BRUTE_FORCE" }),
    );
    expect(s).toBeCloseTo(OLD * 1.1, 5);
  });

  it("PARTIAL+NONE, conf 3 → old × 1.1 (quality irrelevant for PARTIAL)", () => {
    const s = computeNewStability(
      OLD,
      signals({ solvedIndependently: "PARTIAL", solutionQuality: "NONE" }),
    );
    expect(s).toBeCloseTo(OLD * 1.1, 5);
  });

  it("all four PARTIAL quality combos produce identical stability", () => {
    const qualities = ["OPTIMAL", "SUBOPTIMAL", "BRUTE_FORCE", "NONE"] as const;
    const results = qualities.map((q) =>
      computeNewStability(OLD, signals({ solvedIndependently: "PARTIAL", solutionQuality: q }))
    );
    for (const r of results) expect(r).toBeCloseTo(results[0], 5);
  });

  it("NO+NONE, conf 3 → old × 0.5", () => {
    const s = computeNewStability(
      OLD,
      signals({ solvedIndependently: "NO", solutionQuality: "NONE" }),
    );
    expect(s).toBeCloseTo(OLD * 0.5, 5);
  });

  it("NO+NONE, conf 1 → clamps to MIN_STABILITY (0.5) when effective multiplier drives it below", () => {
    // old=1, multiplier=(0.5 + (-0.4))=0.1 → 0.1 < 0.5 → clamp
    const s = computeNewStability(1, signals({ solvedIndependently: "NO", solutionQuality: "NONE", confidence: 1 }));
    expect(s).toBe(0.5);
  });

  it("NO+OPTIMAL → 0.8 (explicit entry; UI-unreachable but handled defensively)", () => {
    const s = computeNewStability(
      OLD,
      signals({ solvedIndependently: "NO", solutionQuality: "OPTIMAL" }),
    );
    expect(s).toBeCloseTo(OLD * 0.8, 5);
  });

  it("NO+SUBOPTIMAL → 0.8 (explicit entry; UI-unreachable but handled defensively)", () => {
    const s = computeNewStability(
      OLD,
      signals({ solvedIndependently: "NO", solutionQuality: "SUBOPTIMAL" }),
    );
    expect(s).toBeCloseTo(OLD * 0.8, 5);
  });

  it("fast solve bonus applies for Medium < 10 min", () => {
    const s = computeNewStability(
      OLD,
      signals({ difficulty: "Medium", solveTimeMinutes: 8 }),
    );
    // base 2.5 + fast bonus 0.2 = 2.7
    expect(s).toBeCloseTo(OLD * 2.7, 5);
  });

  it("fast solve bonus does NOT apply for Easy", () => {
    const withBonus = computeNewStability(
      OLD,
      signals({ difficulty: "Easy", solveTimeMinutes: 5 }),
    );
    const withoutBonus = computeNewStability(
      OLD,
      signals({ difficulty: "Easy", solveTimeMinutes: 30 }),
    );
    expect(withBonus).toBeCloseTo(withoutBonus, 5);
  });

  it("fast solve bonus does NOT apply for Hard", () => {
    const withBonus = computeNewStability(
      OLD,
      signals({ difficulty: "Hard", solveTimeMinutes: 5 }),
    );
    const withoutBonus = computeNewStability(
      OLD,
      signals({ difficulty: "Hard", solveTimeMinutes: 60 }),
    );
    expect(withBonus).toBeCloseTo(withoutBonus, 5);
  });

  it("fast solve bonus does NOT apply when solve time is exactly 10 min", () => {
    const at10 = computeNewStability(OLD, signals({ difficulty: "Medium", solveTimeMinutes: 10 }));
    const at30 = computeNewStability(OLD, signals({ difficulty: "Medium", solveTimeMinutes: 30 }));
    expect(at10).toBeCloseTo(at30, 5);
  });

  it("rewrite bonus only applies when solved independently (YES)", () => {
    const partial = computeNewStability(
      OLD,
      signals({ solvedIndependently: "PARTIAL", rewroteFromScratch: "YES" }),
    );
    const partialNoRewrite = computeNewStability(
      OLD,
      signals({ solvedIndependently: "PARTIAL", rewroteFromScratch: "NO" }),
    );
    expect(partial).toBeCloseTo(partialNoRewrite, 5);
  });

  it("clamps to MAX_STABILITY (365) on very high multiplier", () => {
    // stability=300, multiplier=2.5+0.5+0.3+0.2=3.5 → 1050 → clamp to 365
    const s = computeNewStability(
      300,
      signals({ confidence: 5, rewroteFromScratch: "YES", solveTimeMinutes: 5 }),
    );
    expect(s).toBe(365);
  });

  it("conf 1 → -0.4 modifier", () => {
    const base = computeNewStability(OLD, signals({ confidence: 3 }));
    const low = computeNewStability(OLD, signals({ confidence: 1 }));
    expect(low).toBeCloseTo(OLD * (2.5 - 0.4), 5);
    expect(low).toBeLessThan(base);
  });

  it("conf 2 → -0.2 modifier", () => {
    const s = computeNewStability(OLD, signals({ confidence: 2 }));
    expect(s).toBeCloseTo(OLD * (2.5 - 0.2), 5);
  });
});

// ── computeInitialStability ───────────────────────────────────────────────────

describe("computeInitialStability", () => {
  // INITIAL_STABILITY_BASE = 2.0
  const BASE = 2.0;

  it("YES+OPTIMAL, conf 3 → BASE × 2.5", () => {
    const s = computeInitialStability(signals());
    expect(s).toBeCloseTo(BASE * 2.5, 5);
  });

  it("YES+OPTIMAL, conf 5 + rewrite → BASE × (2.5 + 0.5 + 0.3)", () => {
    const s = computeInitialStability(
      signals({ confidence: 5, rewroteFromScratch: "YES" }),
    );
    expect(s).toBeCloseTo(BASE * 3.3, 5);
  });

  it("NO+NONE, conf 1 → clamps to MIN_STABILITY", () => {
    // BASE × (0.5 + (-0.4)) = 2.0 × 0.1 = 0.2 → clamp to 0.5
    const s = computeInitialStability(
      signals({ solvedIndependently: "NO", solutionQuality: "NONE", confidence: 1 }),
    );
    expect(s).toBe(0.5);
  });

  it("NO+NONE, conf 3 → BASE × 0.5", () => {
    const s = computeInitialStability(
      signals({ solvedIndependently: "NO", solutionQuality: "NONE" }),
    );
    expect(s).toBeCloseTo(BASE * 0.5, 5);
  });

  it("PARTIAL+SUBOPTIMAL, conf 3 → BASE × 1.1", () => {
    const s = computeInitialStability(
      signals({ solvedIndependently: "PARTIAL", solutionQuality: "SUBOPTIMAL" }),
    );
    expect(s).toBeCloseTo(BASE * 1.1, 5);
  });
});

// ── computeNextReviewDate ─────────────────────────────────────────────────────

describe("computeNextReviewDate", () => {
  const FROM = new Date("2026-04-20T12:00:00Z");

  it("stability of 1 day → fromDate + 86400000ms", () => {
    const next = computeNextReviewDate(1, FROM);
    expect(next.getTime()).toBe(FROM.getTime() + 86400000);
  });

  it("stability of 7 days → fromDate + 7 × 86400000ms", () => {
    const next = computeNextReviewDate(7, FROM);
    expect(next.getTime()).toBe(FROM.getTime() + 7 * 86400000);
  });

  it("stability of 0.5 days → fromDate + 12 hours", () => {
    const next = computeNextReviewDate(0.5, FROM);
    expect(next.getTime()).toBe(FROM.getTime() + 0.5 * 86400000);
  });

  it("defaults fromDate to now", () => {
    const before = Date.now();
    const next = computeNextReviewDate(1);
    const after = Date.now();
    const expected = before + 86400000;
    // allow small drift from test execution
    expect(next.getTime()).toBeGreaterThanOrEqual(expected - 10);
    expect(next.getTime()).toBeLessThanOrEqual(after + 86400000 + 10);
  });
});

// ── computeReviewPriority ─────────────────────────────────────────────────────

describe("computeReviewPriority", () => {
  function priority(overrides: Partial<PriorityInput> = {}): number {
    return computeReviewPriority({
      retrievability: 0.5,
      blind75: false,
      difficulty: "Medium",
      categoryAvgR: 0.7,
      ...overrides,
    });
  }

  it("lower retrievability → higher priority", () => {
    expect(priority({ retrievability: 0.1 })).toBeGreaterThan(
      priority({ retrievability: 0.9 }),
    );
  });

  it("Blind 75 adds +0.2 to weight", () => {
    const b75 = priority({ blind75: true });
    const notB75 = priority({ blind75: false });
    // diff should be (1 - 0.5) × 0.2 = 0.1
    expect(b75 - notB75).toBeCloseTo(0.5 * 0.2, 5);
  });

  it("weak category (avgR < 0.6) adds +0.3 to weight", () => {
    const weak = priority({ categoryAvgR: 0.5 });
    const strong = priority({ categoryAvgR: 0.7 });
    // diff should be (1 - 0.5) × 0.3 = 0.15
    expect(weak - strong).toBeCloseTo(0.5 * 0.3, 5);
  });

  it("Hard problems have higher weight than Easy", () => {
    expect(priority({ difficulty: "Hard" })).toBeGreaterThan(
      priority({ difficulty: "Easy" }),
    );
  });

  it("fully retained problem → near-zero priority", () => {
    expect(priority({ retrievability: 1.0 })).toBe(0);
  });
});

// ── computeReadiness ──────────────────────────────────────────────────────────

describe("computeReadiness", () => {
  function readiness(overrides: Partial<ReadinessInput> = {}) {
    return computeReadiness({
      totalProblems: 150,
      attemptedCount: 0,
      retainedCount: 0,
      lowestCategoryAvgR: 0,
      reviewsCompletedPct: 0,
      ...overrides,
    });
  }

  it("all zeros → score 0, tier D", () => {
    const r = readiness();
    expect(r.score).toBe(0);
    expect(r.tier).toBe("D");
  });

  it("perfect inputs → score 100, tier S", () => {
    const r = readiness({
      attemptedCount: 150,
      retainedCount: 150,
      lowestCategoryAvgR: 1,
      reviewsCompletedPct: 1,
    });
    expect(r.score).toBe(100);
    expect(r.tier).toBe("S");
  });

  it("coverage weight is 30%", () => {
    // only coverage: 75/150 = 0.5 → 0.5 × 30 = 15
    const r = readiness({ attemptedCount: 75, retainedCount: 0 });
    expect(r.score).toBe(15);
    expect(r.coverage).toBeCloseTo(0.5, 5);
  });

  it("retention weight is 40%", () => {
    // coverage = 1.0 (30pts), retention = 0.5 (20pts), rest = 0 → total 50
    const r = readiness({
      attemptedCount: 150,
      retainedCount: 75,
      lowestCategoryAvgR: 0,
      reviewsCompletedPct: 0,
    });
    expect(r.score).toBe(50);
  });

  it("tier boundaries — exactly 90 → S", () => {
    expect(readiness({ attemptedCount: 150, retainedCount: 150, lowestCategoryAvgR: 1, reviewsCompletedPct: 1 }).tier).toBe("S");
  });

  it("tier boundary — score 75 → A", () => {
    // coverage=1(30) + retention=1(40) + catBal=0(0) + consistency=0.5(5) = 75
    const r = readiness({
      attemptedCount: 150,
      retainedCount: 150,
      lowestCategoryAvgR: 0,
      reviewsCompletedPct: 0.5,
    });
    expect(r.score).toBe(75);
    expect(r.tier).toBe("A");
  });

  it("score 74 → B", () => {
    const r = readiness({
      attemptedCount: 150,
      retainedCount: 150,
      lowestCategoryAvgR: 0,
      reviewsCompletedPct: 0.4,
    });
    expect(r.score).toBe(74);
    expect(r.tier).toBe("B");
  });

  it("score 55 → B (boundary)", () => {
    // coverage=1(30) + retention=0.5(20) + cat=0 + consistency=0.5(5) = 55
    const r = readiness({
      attemptedCount: 150,
      retainedCount: 75,
      lowestCategoryAvgR: 0,
      reviewsCompletedPct: 0.5,
    });
    expect(r.score).toBe(55);
    expect(r.tier).toBe("B");
  });

  it("score 35 → C (boundary)", () => {
    // coverage=1(30) + retention=0.125(5) + rest=0 = 35
    const r = readiness({
      attemptedCount: 150,
      retainedCount: Math.round(150 * 0.125),
      lowestCategoryAvgR: 0,
      reviewsCompletedPct: 0,
    });
    expect(r.score).toBe(35);
    expect(r.tier).toBe("C");
  });

  it("score 34 → D", () => {
    const r = readiness({
      attemptedCount: 150,
      retainedCount: Math.round(150 * 0.1),
      lowestCategoryAvgR: 0,
      reviewsCompletedPct: 0,
    });
    expect(r.score).toBeLessThan(35);
    expect(r.tier).toBe("D");
  });

  it("totalProblems = 0 → coverage 0 (no divide-by-zero)", () => {
    const r = computeReadiness({
      totalProblems: 0,
      attemptedCount: 0,
      retainedCount: 0,
      lowestCategoryAvgR: 0,
      reviewsCompletedPct: 0,
    });
    expect(r.coverage).toBe(0);
    expect(r.score).toBe(0);
  });

  it("attemptedCount = 0 → retention 0 (no divide-by-zero)", () => {
    const r = readiness({ attemptedCount: 0, retainedCount: 0 });
    expect(r.retention).toBe(0);
  });

  it("score is clamped to [0, 100]", () => {
    const r = readiness({
      attemptedCount: 150,
      retainedCount: 150,
      lowestCategoryAvgR: 1,
      reviewsCompletedPct: 1,
    });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
