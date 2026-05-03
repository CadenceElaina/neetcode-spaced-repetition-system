/**
 * Spaced Repetition System — stability + retrievability calculations.
 * Based on FSRS adapted for coding problems (see docs/ARCHITECTURE.md).
 */

/* ── Types ── */

export type SolvedIndependently = "YES" | "PARTIAL" | "NO";
export type SolutionQuality = "OPTIMAL" | "SUBOPTIMAL" | "BRUTE_FORCE" | "NONE";
export type RewroteFromScratch = "YES" | "NO" | "DID_NOT_ATTEMPT";

export interface AttemptSignals {
  solvedIndependently: SolvedIndependently;
  solutionQuality: SolutionQuality;
  rewroteFromScratch: RewroteFromScratch | null;
  confidence: number; // 1–5
  solveTimeMinutes: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
}

/* ── Constants ── */

const MIN_STABILITY = 0.5; // days
const MAX_STABILITY = 365; // days
const RETRIEVABILITY_FLOOR = 0.3;

// Base for first-attempt stability. Using 2.0 rather than MIN_STABILITY (0.5)
// because coding problems require ~5-30 min to review — aggressive daily recall
// is counterproductive and builds queue debt faster than the user can clear it.
// FSRS calibration for "good" first recall targets ~15 days; 2.0 × 2.5 = 5 days
// is a deliberate conservative choice for a skill-heavy domain.
const INITIAL_STABILITY_BASE = 2.0; // days

/* ── Base multipliers (§6.2) ── */

const BASE_MULTIPLIERS: Record<string, number> = {
  // solved=YES — quality matters
  "YES:OPTIMAL": 2.5,
  "YES:SUBOPTIMAL": 2.0,
  "YES:BRUTE_FORCE": 1.5,
  "YES:NONE": 1.0,
  // solved=PARTIAL — needed help, quality is irrelevant (all map to 1.1)
  "PARTIAL:OPTIMAL": 1.1,
  "PARTIAL:SUBOPTIMAL": 1.1,
  "PARTIAL:BRUTE_FORCE": 1.1,
  "PARTIAL:NONE": 1.1,
  // solved=NO — all failed outcomes reduce stability
  // NO:OPTIMAL and NO:SUBOPTIMAL are UI-unreachable (the attempt form hardcodes
  // solutionQuality=NONE for NO_SOLUTION), but are handled defensively here so
  // a direct API call never accidentally benefits from the ?? 1.0 fallback.
  "NO:OPTIMAL": 0.8,
  "NO:SUBOPTIMAL": 0.8,
  "NO:BRUTE_FORCE": 0.8,
  "NO:NONE": 0.5,
};

/* ── Modifier bonuses (§6.2) ── */

function computeModifier(signals: AttemptSignals): number {
  let mod = 0;
  const solvedAlone = signals.solvedIndependently === "YES";

  // Rewrote from scratch = YES → +0.5 (only meaningful if solved independently)
  if (solvedAlone && signals.rewroteFromScratch === "YES") mod += 0.5;

  // Confidence — stronger impact
  if (signals.confidence >= 5) mod += 0.3;
  else if (signals.confidence >= 4) mod += 0.1;
  else if (signals.confidence <= 1) mod -= 0.4;
  else if (signals.confidence <= 2) mod -= 0.2;

  // Fast solve for mediums
  if (
    signals.difficulty === "Medium" &&
    signals.solveTimeMinutes !== null &&
    signals.solveTimeMinutes > 0 &&
    signals.solveTimeMinutes < 10
  ) {
    mod += 0.2;
  }

  return mod;
}

/* ── Core functions ── */

/** Compute retrievability: probability user can still solve this problem. */
export function computeRetrievability(
  stabilityDays: number,
  daysSinceReview: number,
): number {
  if (daysSinceReview <= 0) return 1.0;
  const r = Math.exp(-daysSinceReview / stabilityDays);
  return Math.max(r, RETRIEVABILITY_FLOOR);
}

/** Calculate new stability after an attempt. */
export function computeNewStability(
  oldStability: number,
  signals: AttemptSignals,
): number {
  const key = `${signals.solvedIndependently}:${signals.solutionQuality}`;
  const baseMultiplier = BASE_MULTIPLIERS[key] ?? 1.0;
  const modifier = computeModifier(signals);
  const effectiveMultiplier = baseMultiplier + modifier;

  const newS = oldStability * effectiveMultiplier;
  return clampStability(newS);
}

/** Calculate initial stability for a first attempt. */
export function computeInitialStability(signals: AttemptSignals): number {
  const key = `${signals.solvedIndependently}:${signals.solutionQuality}`;
  const baseMultiplier = BASE_MULTIPLIERS[key] ?? 1.0;
  const modifier = computeModifier(signals);

  const s = INITIAL_STABILITY_BASE * (baseMultiplier + modifier);
  return clampStability(s);
}

/** Compute next review date from stability. */
export function computeNextReviewDate(
  stability: number,
  fromDate: Date = new Date(),
): Date {
  const ms = stability * 24 * 60 * 60 * 1000;
  return new Date(fromDate.getTime() + ms);
}

/** Clamp stability to valid range. */
function clampStability(s: number): number {
  return Math.max(MIN_STABILITY, Math.min(MAX_STABILITY, s));
}

/* ── Review queue priority (§6.3) ── */

export interface PriorityInput {
  retrievability: number;
  blind75: boolean;
  difficulty: "Easy" | "Medium" | "Hard";
  categoryAvgR: number; // average retrievability for problems in this category
}

const DIFFICULTY_WEIGHT: Record<string, number> = {
  Easy: 0.8,
  Medium: 1.0,
  Hard: 1.1,
};

export function computeReviewPriority(input: PriorityInput): number {
  let weight = DIFFICULTY_WEIGHT[input.difficulty] ?? 1.0;

  // Blind 75 bonus
  if (input.blind75) weight += 0.2;

  // Category weakness bonus
  if (input.categoryAvgR < 0.6) weight += 0.3;

  return (1 - input.retrievability) * weight;
}

/* ── Readiness engine (§7) ── */

export interface ReadinessInput {
  totalProblems: number; // total in problem set (e.g. 150)
  attemptedCount: number;
  retainedCount: number; // problems with R > 0.7
  lowestCategoryAvgR: number; // 0–1
  reviewsCompletedPct: number; // % of scheduled reviews done in last 14 days (0–1)
  // pace is computed separately
}

export interface ReadinessResult {
  score: number; // 0–100
  tier: "S" | "A" | "B" | "C" | "D";
  coverage: number; // 0–1
  retention: number; // 0–1
  categoryBalance: number; // 0–1
  consistency: number; // 0–1
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const coverage = input.totalProblems > 0
    ? input.attemptedCount / input.totalProblems
    : 0;

  const retention = input.attemptedCount > 0
    ? input.retainedCount / input.attemptedCount
    : 0;

  const categoryBalance = input.lowestCategoryAvgR;
  const consistency = input.reviewsCompletedPct;

  // Weighted sum: coverage 30%, retention 40%, category balance 20%, consistency 10%
  const score = Math.round(
    (coverage * 30 + retention * 40 + categoryBalance * 20 + consistency * 10) * 100,
  ) / 100;

  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: clamped,
    tier: scoreToTier(clamped),
    coverage,
    retention,
    categoryBalance,
    consistency,
  };
}

function scoreToTier(score: number): "S" | "A" | "B" | "C" | "D" {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 55) return "B";
  if (score >= 35) return "C";
  return "D";
}

