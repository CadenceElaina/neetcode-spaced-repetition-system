import type {
  VelocityResult,
  ComplianceResult,
  MetacognitionResult,
  CategoryStat,
} from "@/lib/analytics";

export interface StuckProblemDisplay {
  problemId: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  totalAttempts: number;
  bestQuality: "OPTIMAL" | "SUBOPTIMAL" | "BRUTE_FORCE" | "NONE" | null;
  daysSinceFirstAttempt: number;
}

export interface InsightsData {
  velocity: VelocityResult;
  compliance: ComplianceResult;
  metacognition: MetacognitionResult;
  stuckProblems: StuckProblemDisplay[];
  categoryStats: CategoryStat[];
  totalAttempts: number;
  totalProblems: number;
}

export const DEMO_INSIGHTS_DATA: InsightsData = {
  velocity: {
    newProblemsPerDay: 0.57,
    trend: "improving",
    recentUniqueNew: 8,
    priorUniqueNew: 6,
  },
  compliance: {
    complianceRate: 0.83,
    reviewedInWindow: 19,
    reviewsScheduledInWindow: 23,
    currentlyOverdue: 4,
    neverReviewed: 0,
  },
  metacognition: {
    overconfidenceRate: 0.06,
    underconfidenceRate: 0.09,
    overconfidentAttempts: 8,
    underconfidentAttempts: 12,
    totalAttempts: 134,
  },
  stuckProblems: [
    {
      problemId: 93,
      title: "Alien Dictionary",
      difficulty: "Hard",
      totalAttempts: 6,
      bestQuality: "BRUTE_FORCE",
      daysSinceFirstAttempt: 28,
    },
    {
      problemId: 16,
      title: "Minimum Window Substring",
      difficulty: "Hard",
      totalAttempts: 5,
      bestQuality: "NONE",
      daysSinceFirstAttempt: 19,
    },
  ],
  categoryStats: [
    { category: "Arrays & Hashing",       attemptedProblems: 9, avgR: 0.82, stuckCount: 0, avgAttemptsToOptimal: 1.8, complexityAccuracyRate: 0.71 },
    { category: "Two Pointers",           attemptedProblems: 5, avgR: 0.74, stuckCount: 0, avgAttemptsToOptimal: 2.1, complexityAccuracyRate: 0.66 },
    { category: "Stack",                  attemptedProblems: 7, avgR: 0.77, stuckCount: 0, avgAttemptsToOptimal: 1.9, complexityAccuracyRate: 0.63 },
    { category: "Sliding Window",         attemptedProblems: 4, avgR: 0.64, stuckCount: 0, avgAttemptsToOptimal: 2.4, complexityAccuracyRate: 0.54 },
    { category: "Binary Search",          attemptedProblems: 6, avgR: 0.61, stuckCount: 0, avgAttemptsToOptimal: 2.6, complexityAccuracyRate: 0.52 },
    { category: "Trees",                  attemptedProblems: 8, avgR: 0.58, stuckCount: 0, avgAttemptsToOptimal: 2.8, complexityAccuracyRate: 0.47 },
    { category: "Graphs",                 attemptedProblems: 3, avgR: 0.44, stuckCount: 0, avgAttemptsToOptimal: 3.3, complexityAccuracyRate: 0.38 },
    { category: "Advanced Graphs",        attemptedProblems: 2, avgR: 0.32, stuckCount: 1, avgAttemptsToOptimal: null, complexityAccuracyRate: 0.22 },
  ],
  totalAttempts: 134,
  totalProblems: 44,
};
