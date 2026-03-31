import { Suspense } from "react";
import { db } from "@/db";
import { problems, userProblemStates, attempts } from "@/db/schema";
import { auth } from "@/auth";
import { eq, asc, count, sql, sum, avg } from "drizzle-orm";
import Link from "next/link";
import { computeRetrievability, computeReadiness } from "@/lib/srs";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — NeetcodeSRS" };

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-muted-foreground">Sign in to track your progress.</p>
          <Link
            href="/api/auth/signin"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const userId = session.user.id;
  const now = new Date();

  // Parallel data fetching
  const [allProblems, userStates, attemptDateRows, timeRows] = await Promise.all([
    db.select().from(problems).orderBy(asc(problems.id)),
    db.select().from(userProblemStates).where(eq(userProblemStates.userId, userId)),
    db
      .select({
        date: sql<string>`date(${attempts.createdAt})`,
        count: count(),
      })
      .from(attempts)
      .where(eq(attempts.userId, userId))
      .groupBy(sql`date(${attempts.createdAt})`)
      .orderBy(sql`date(${attempts.createdAt}) DESC`),
    db
      .select({
        totalSolve: sum(attempts.solveTimeMinutes),
        totalStudy: sum(attempts.studyTimeMinutes),
        avgSolve: avg(attempts.solveTimeMinutes),
        avgConfidence: avg(attempts.confidence),
      })
      .from(attempts)
      .where(eq(attempts.userId, userId)),
  ]);

  const stateMap = new Map(userStates.map((s) => [s.problemId, s]));
  const attemptedIds = new Set(userStates.map((s) => s.problemId));

  // Review queue: problems due for review
  const reviewQueue = userStates
    .filter((s) => s.nextReviewAt && s.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt!.getTime() - b.nextReviewAt!.getTime())
    .map((s) => {
      const p = allProblems.find((prob) => prob.id === s.problemId);
      if (!p) return null;
      const daysSince = s.lastReviewedAt
        ? (now.getTime() - s.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      const daysOverdue = Math.floor(
        (now.getTime() - s.nextReviewAt!.getTime()) / (1000 * 60 * 60 * 24),
      );
      const retrievability = computeRetrievability(s.stability, daysSince);
      return {
        stateId: s.id,
        problemId: s.problemId,
        title: p.title,
        leetcodeNumber: p.leetcodeNumber,
        difficulty: p.difficulty as "Easy" | "Medium" | "Hard",
        category: p.category,
        totalAttempts: s.totalAttempts,
        daysOverdue,
        retrievability,
        lastReviewedAt: s.lastReviewedAt ? s.lastReviewedAt.toISOString() : null,
      };
    })
    .filter(Boolean) as {
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
    }[];

  // New (unattempted) problems in curriculum order
  const newProblems = allProblems
    .filter((p) => !attemptedIds.has(p.id))
    .map((p) => ({
      id: p.id,
      leetcodeNumber: p.leetcodeNumber,
      title: p.title,
      difficulty: p.difficulty as "Easy" | "Medium" | "Hard",
      category: p.category,
      blind75: p.blind75,
      leetcodeUrl: p.leetcodeUrl,
    }));

  // Completed: ALL attempted problems (full history of what you've worked on)
  const reviewIds = new Set(reviewQueue.map((r) => r.problemId));
  const completedProblems = userStates
    .map((s) => {
      const p = allProblems.find((prob) => prob.id === s.problemId);
      if (!p) return null;
      const daysSince = s.lastReviewedAt
        ? (now.getTime() - s.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      const retrievability = computeRetrievability(s.stability, daysSince);
      const daysUntilReview = s.nextReviewAt
        ? Math.ceil((s.nextReviewAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        problemId: s.problemId,
        title: p.title,
        leetcodeNumber: p.leetcodeNumber,
        difficulty: p.difficulty as "Easy" | "Medium" | "Hard",
        category: p.category,
        totalAttempts: s.totalAttempts,
        retrievability,
        stability: s.stability,
        lastReviewedAt: s.lastReviewedAt ? s.lastReviewedAt.toISOString() : null,
        daysUntilReview,
        isDue: reviewIds.has(s.problemId),
        bestQuality: s.bestSolutionQuality,
      };
    })
    .filter(Boolean) as {
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
    }[];

  // Compute retrievability for each attempted problem
  const retentions = allProblems
    .filter((p) => stateMap.has(p.id))
    .map((p) => {
      const state = stateMap.get(p.id)!;
      const daysSince = state.lastReviewedAt
        ? (now.getTime() - state.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      return {
        problemId: p.id,
        r: computeRetrievability(state.stability, daysSince),
        category: p.category,
      };
    });

  const retainedCount = retentions.filter((r) => r.r > 0.5).length;

  // Category stats
  const categoryMap = new Map<string, { total: number; attempted: number; retentions: number[] }>();
  for (const p of allProblems) {
    const entry = categoryMap.get(p.category) ?? { total: 0, attempted: 0, retentions: [] };
    entry.total++;
    const ret = retentions.find((r) => r.problemId === p.id);
    if (ret) {
      entry.attempted++;
      entry.retentions.push(ret.r);
    }
    categoryMap.set(p.category, entry);
  }

  const categoryStats = Array.from(categoryMap.entries())
    .map(([category, d]) => ({
      category,
      total: d.total,
      attempted: d.attempted,
      avgRetention: d.retentions.length > 0
        ? d.retentions.reduce((a, b) => a + b, 0) / d.retentions.length
        : 0,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  // Readiness score
  const categoryAvgRs = categoryStats.filter((c) => c.attempted > 0);
  const lowestCategoryAvgR = categoryAvgRs.length > 0
    ? Math.min(...categoryAvgRs.map((c) => c.avgRetention))
    : 0;

  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentAttemptCount = attemptDateRows
    .filter((a) => a.date >= fourteenDaysAgo.toISOString().slice(0, 10))
    .reduce((s, a) => s + a.count, 0);
  const scheduledInWindow = userStates.filter(
    (s) => s.nextReviewAt && s.nextReviewAt <= now,
  ).length;
  const totalScheduled = recentAttemptCount + scheduledInWindow;
  const consistencyPct = totalScheduled > 0 ? recentAttemptCount / totalScheduled : 1;

  const readiness = computeReadiness({
    totalProblems: allProblems.length,
    attemptedCount: userStates.length,
    retainedCount,
    lowestCategoryAvgR,
    reviewsCompletedPct: Math.min(1, consistencyPct),
  });

  // Streak calculation
  const today = now.toISOString().slice(0, 10);
  const attemptDates = attemptDateRows.map((a) => a.date);
  const streaks = computeStreak(attemptDates, today);

  // Average per day (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const totalRecentAttempts = attemptDateRows
    .filter((a) => a.date >= thirtyDaysAgo)
    .reduce((s, a) => s + a.count, 0);
  const avgPerDay = totalRecentAttempts / 30;

  // New problems per day (rate of progress through curriculum)
  const newProbsRecent = userStates.filter(
    (s) => s.createdAt >= fourteenDaysAgo,
  ).length;
  const avgNewPerDay = newProbsRecent / 14;

  // Attempt history (last 14 days)
  const attemptHistory: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const found = attemptDateRows.find((a) => a.date === key);
    attemptHistory.push({ date: key, count: found?.count ?? 0 });
  }

  // Difficulty breakdown
  const diffMap = new Map<string, { count: number; attempted: number }>();
  for (const p of allProblems) {
    const entry = diffMap.get(p.difficulty) ?? { count: 0, attempted: 0 };
    entry.count++;
    if (stateMap.has(p.id)) entry.attempted++;
    diffMap.set(p.difficulty, entry);
  }
  const difficultyBreakdown = ["Easy", "Medium", "Hard"].map((d) => ({
    difficulty: d,
    count: diffMap.get(d)?.count ?? 0,
    attempted: diffMap.get(d)?.attempted ?? 0,
  }));

  // Mastery: problems with stability >= 30 days
  const MASTERY_THRESHOLD = 30;
  const masteryData = userStates
    .map((s) => {
      const p = allProblems.find((prob) => prob.id === s.problemId);
      return p ? { title: p.title, leetcodeNumber: p.leetcodeNumber, stability: s.stability, category: p.category } : null;
    })
    .filter(Boolean) as { title: string; leetcodeNumber: number | null; stability: number; category: string }[];

  const masteredCount = masteryData.filter((m) => m.stability >= MASTERY_THRESHOLD).length;
  const learningCount = userStates.length - masteredCount;
  const masteryList = masteryData
    .filter((m) => m.stability >= MASTERY_THRESHOLD)
    .sort((a, b) => b.stability - a.stability);
  const learningList = masteryData
    .filter((m) => m.stability < MASTERY_THRESHOLD)
    .sort((a, b) => b.stability - a.stability);

  return (
    <Suspense>
    <DashboardClient
      data={{
        reviewQueue,
        newProblems,
        completedProblems,
        totalProblems: allProblems.length,
        attemptedCount: userStates.length,
        retainedCount,
        readiness: { score: readiness.score, tier: readiness.tier },
        readinessBreakdown: {
          coverage: readiness.coverage,
          retention: readiness.retention,
          categoryBalance: readiness.categoryBalance,
          consistency: readiness.consistency,
        },
        currentStreak: streaks.current,
        bestStreak: streaks.best,
        avgPerDay,
        avgNewPerDay,
        categoryStats,
        difficultyBreakdown,
        attemptHistory,
        totalSolveMinutes: Number(timeRows[0]?.totalSolve ?? 0),
        totalStudyMinutes: Number(timeRows[0]?.totalStudy ?? 0),
        avgSolveMinutes: Number(timeRows[0]?.avgSolve ?? 0),
        avgConfidence: Number(timeRows[0]?.avgConfidence ?? 0),
        masteredCount,
        learningCount,
        masteryList,
        learningList,
        importProblems: allProblems.map((p) => ({
          id: p.id,
          title: p.title,
          leetcodeNumber: p.leetcodeNumber,
          difficulty: p.difficulty as "Easy" | "Medium" | "Hard",
          category: p.category,
          optimalTimeComplexity: p.optimalTimeComplexity,
          optimalSpaceComplexity: p.optimalSpaceComplexity,
        })),
        importAttemptedIds: [...attemptedIds],
      }}
    />
    </Suspense>
  );
}

/* ── Streak computation ── */

function computeStreak(
  dates: string[],
  today: string,
): { current: number; best: number } {
  if (dates.length === 0) return { current: 0, best: 0 };

  const dateSet = new Set(dates);

  // Current streak: count back from today (allow missing today if yesterday was active)
  let current = 0;
  const start = new Date(today + "T12:00:00");
  if (!dateSet.has(today)) {
    start.setDate(start.getDate() - 1);
    if (!dateSet.has(start.toISOString().slice(0, 10))) {
      // No activity today or yesterday
      return { current: 0, best: computeBest(dates) };
    }
  }

  const cursor = dateSet.has(today)
    ? new Date(today + "T12:00:00")
    : new Date(today + "T12:00:00");
  if (!dateSet.has(today)) cursor.setDate(cursor.getDate() - 1);

  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, best: Math.max(current, computeBest(dates)) };
}

function computeBest(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort();
  let best = 1;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T12:00:00");
    const curr = new Date(sorted[i] + "T12:00:00");
    const diff = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff === 1) {
      streak++;
      best = Math.max(best, streak);
    } else if (diff > 1) {
      streak = 1;
    }
  }
  return best;
}
