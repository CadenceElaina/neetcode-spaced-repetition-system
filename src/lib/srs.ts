/**
 * Spaced Repetition System — stability + retrievability calculations.
 * Based on FSRS adapted for coding problems (see docs/ARCHITECTURE.md).
 */

/* ── Types ── */

export type SolvedIndependently = "YES" | "PARTIAL" | "NO";
export type SolutionQuality = "OPTIMAL" | "BRUTE_FORCE" | "NONE";
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

/* ── Base multipliers (§6.2) ── */

const BASE_MULTIPLIERS: Record<string, number> = {
  // solved=YES — quality matters
  "YES:OPTIMAL": 2.5,
  "YES:BRUTE_FORCE": 1.5,
  "YES:NONE": 1.0,
  // solved=PARTIAL — needed help, quality is irrelevant
  "PARTIAL:OPTIMAL": 1.1,
  "PARTIAL:BRUTE_FORCE": 1.1,
  "PARTIAL:NONE": 1.0,
  // solved=NO
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

  const s = MIN_STABILITY * (baseMultiplier + modifier);
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

/* ── Tier badge colors (from STYLE_GUIDE.md) ── */
export const TIER_COLORS: Record<string, string> = {
  S: "bg-violet-500 text-white",
  A: "bg-blue-500 text-white",
  B: "bg-emerald-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-zinc-400 text-white",
};

/* ── Retention badge colors (from STYLE_GUIDE.md) ── */
export function retentionLabel(r: number): { label: string; color: string } {
  if (r >= 0.8) return { label: "Strong", color: "text-green-500" };
  if (r >= 0.6) return { label: "Good", color: "text-emerald-400" };
  if (r >= 0.4) return { label: "Fading", color: "text-amber-500" };
  if (r >= 0.2) return { label: "Weak", color: "text-orange-500" };
  return { label: "Critical", color: "text-red-500" };
}

/* ── Drill SRS — fatigue & stability ── */

/** Drill confidence maps to a base stability multiplier (simpler than problem signals). */
const DRILL_CONFIDENCE_MULTIPLIERS: Record<number, number> = {
  1: 0.5,  // Again — forgot it
  2: 1.0,  // Hard — struggled
  3: 1.8,  // Good — got it
  4: 2.5,  // Easy — instant recall
};

/** Session fatigue: diminishing returns based on how many drills done this session. */
export function computeSessionFatigue(sessionPosition: number): number {
  if (sessionPosition <= 8) return 1.0;
  if (sessionPosition <= 15) return 0.7;
  if (sessionPosition <= 25) return 0.4;
  return 0.2;
}

/** Same-category consecutive penalty: grinding one category has diminishing returns. */
export function computeCategoryStreakPenalty(categoryStreak: number): number {
  if (categoryStreak <= 1) return 1.0;
  if (categoryStreak === 2) return 0.8;
  if (categoryStreak === 3) return 0.5;
  return 0.3;
}

/** Combined fatigue credit for a drill attempt. */
export function computeFatigueCredit(
  sessionPosition: number,
  categoryStreak: number,
): number {
  return computeSessionFatigue(sessionPosition) *
    computeCategoryStreakPenalty(categoryStreak);
}

/** Calculate new drill stability after a self-rated attempt. */
export function computeDrillStability(
  oldStability: number,
  confidence: number, // 1-4
  fatigueCredit: number, // 0-1 from computeFatigueCredit
): number {
  const baseMultiplier = DRILL_CONFIDENCE_MULTIPLIERS[confidence] ?? 1.0;

  // Fatigue scales the multiplier toward 1.0 (neutral)
  // At full credit (1.0), full multiplier applies
  // At low credit (0.2), multiplier is pulled toward 1.0 (barely any change)
  const effectiveMultiplier = 1.0 + (baseMultiplier - 1.0) * fatigueCredit;

  const newS = oldStability * effectiveMultiplier;
  return clampStability(newS);
}

/** Compute per-category syntax fluency from drill stabilities. */
export interface DrillFluencyInput {
  totalDrills: number;
  reviewedDrills: number;
  avgStability: number; // average stability across reviewed drills
  dueCount: number; // drills currently due for review
}

export interface DrillFluencyResult {
  fluency: number; // 0-1
  tier: "S" | "A" | "B" | "C" | "D";
  mastered: number; // drills with stability > 21 days
}

export function computeDrillFluency(input: DrillFluencyInput): DrillFluencyResult {
  if (input.totalDrills === 0) return { fluency: 0, tier: "D", mastered: 0 };

  const coverageRatio = input.reviewedDrills / input.totalDrills;
  // Normalize stability: 30 days = fully fluent
  const stabilityScore = Math.min(input.avgStability / 30, 1.0);
  // Penalty for overdue drills
  const duePenalty = input.dueCount / Math.max(input.reviewedDrills, 1);
  const dueScore = Math.max(0, 1 - duePenalty);

  // Coverage 30%, stability 50%, due freshness 20%
  const fluency = coverageRatio * 0.3 + stabilityScore * 0.5 + dueScore * 0.2;
  const pct = Math.round(fluency * 100);

  return {
    fluency,
    tier: scoreToTier(pct),
    mastered: 0, // caller fills this in from actual data
  };
}
