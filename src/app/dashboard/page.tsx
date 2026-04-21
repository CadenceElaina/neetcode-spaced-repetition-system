import { Suspense } from "react";
import { db } from "@/db";
import { problems, userProblemStates, attempts, pendingSubmissions, users } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, asc, count, sql, sum, avg, gte, lt } from "drizzle-orm";
import Link from "next/link";
import { computeRetrievability, computeReadiness } from "@/lib/srs";
import { DashboardClient } from "./dashboard-client";
import { DEMO_DASHBOARD_DATA } from "./demo-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Aurora" };

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <Suspense>
        <DashboardClient data={DEMO_DASHBOARD_DATA} isDemo />
      </Suspense>
    );
  }

  const userId = session.user.id;
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // Parallel data fetching
  const [allProblems, userStates, attemptDateRows, timeRows, pendingRows, todayAttemptRows, userRow, firstAttemptByProblem] = await Promise.all([
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
    db
      .select({
        id: pendingSubmissions.id,
        problemId: pendingSubmissions.problemId,
        isReview: pendingSubmissions.isReview,
        detectedAt: pendingSubmissions.detectedAt,
        problemTitle: problems.title,
        leetcodeNumber: problems.leetcodeNumber,
        difficulty: problems.difficulty,
        category: problems.category,
      })
      .from(pendingSubmissions)
      .innerJoin(problems, eq(pendingSubmissions.problemId, problems.id))
      .where(
        and(
          eq(pendingSubmissions.userId, userId),
          eq(pendingSubmissions.status, "pending"),
        ),
      )
      .orderBy(pendingSubmissions.detectedAt),
    db
      .select({ problemId: attempts.problemId })
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, userId),
          gte(attempts.createdAt, todayStart),
          lt(attempts.createdAt, tomorrowStart),
        ),
      ),
    db.select({ autoDeferHards: users.autoDeferHards }).from(users).where(eq(users.id, userId)).limit(1),
    db
      .select({
        problemId: attempts.problemId,
        firstDate: sql<string>`date(min(${attempts.createdAt}))`,
      })
      .from(attempts)
      .where(eq(attempts.userId, userId))
      .groupBy(attempts.problemId),
  ]);

  const stateMap = new Map(userStates.map((s) => [s.problemId, s]));
  const attemptedIds = new Set(userStates.map((s) => s.problemId));
  const autoDeferHards = userRow[0]?.autoDeferHards ?? false;

  // Helper: check if a problem is currently deferred
  const isDeferred = (s: typeof userStates[number], difficulty?: string) => {
    // Explicitly deferred with a future date
    if (s.deferredUntil && s.deferredUntil > now) return true;
    // Auto-defer hards (only if setting enabled and problem is Hard)
    if (autoDeferHards && difficulty === "Hard") return true;
    return false;
  };

  // Review queue: problems due for review (excluding deferred)
  const reviewQueue = userStates
    .filter((s) => {
      if (!s.nextReviewAt || s.nextReviewAt > now) return false;
      const p = allProblems.find((prob) => prob.id === s.problemId);
      if (isDeferred(s, p?.difficulty)) return false;
      return true;
    })
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
        neetcodeUrl: p.neetcodeUrl,
        difficulty: p.difficulty as "Easy" | "Medium" | "Hard",
        category: p.category,
        totalAttempts: s.totalAttempts,
        daysOverdue,
        retrievability,
        stability: s.stability,
        lastReviewedAt: s.lastReviewedAt ? s.lastReviewedAt.toISOString() : null,
      };
    })
    .filter(Boolean) as {
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
    }[];

  // Deferred problems: due for review but deferred
  const deferredProblems = userStates
    .filter((s) => {
      if (!s.nextReviewAt || s.nextReviewAt > now) return false;
      const p = allProblems.find((prob) => prob.id === s.problemId);
      return isDeferred(s, p?.difficulty);
    })
    .map((s) => {
      const p = allProblems.find((prob) => prob.id === s.problemId);
      if (!p) return null;
      return {
        stateId: s.id,
        problemId: s.problemId,
        title: p.title,
        leetcodeNumber: p.leetcodeNumber,
        difficulty: p.difficulty as "Easy" | "Medium" | "Hard",
        category: p.category,
        totalAttempts: s.totalAttempts,
        stability: s.stability,
        deferredUntil: s.deferredUntil ? s.deferredUntil.toISOString() : null,
        isAutoDeferred: autoDeferHards && p.difficulty === "Hard" && !(s.deferredUntil && s.deferredUntil > now),
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
      stability: number;
      deferredUntil: string | null;
      isAutoDeferred: boolean;
    }[];

  // New (unattempted) problems in curriculum order
  const newProblems = allProblems
    .filter((p) => !attemptedIds.has(p.id))
    .map((p) => ({
      id: p.id,
      leetcodeNumber: p.leetcodeNumber,
      title: p.title,
      neetcodeUrl: p.neetcodeUrl,
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

  // Average per day (last 14 days — consistent window for all pace stats)
  const fourteenDayAttempts = attemptDateRows
    .filter((a) => a.date >= fourteenDaysAgo.toISOString().slice(0, 10))
    .reduce((s, a) => s + a.count, 0);
  const avgPerDay = fourteenDayAttempts / 14;

  // New problems per day (rate of progress through curriculum)
  const newProbsRecent = userStates.filter(
    (s) => s.createdAt >= fourteenDaysAgo,
  ).length;
  const avgNewPerDay = newProbsRecent / 14;
  const avgReviewPerDay = Math.max(0, avgPerDay - avgNewPerDay);

  // Overall averages (since first attempt)
  const totalAllTimeAttempts = attemptDateRows.reduce((s, a) => s + a.count, 0);
  const firstDate = attemptDateRows.length > 0 ? attemptDateRows[attemptDateRows.length - 1].date : today;
  const totalDays = Math.max(1, Math.ceil((now.getTime() - new Date(firstDate + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)));
  const overallPerDay = totalAllTimeAttempts / totalDays;
  const totalNewProblems = userStates.length;
  const overallNewPerDay = totalNewProblems / totalDays;
  const overallReviewPerDay = Math.max(0, overallPerDay - overallNewPerDay);

  // Attempt history (last 14 days) with new vs review breakdown
  // A "new" attempt on a given day = the first-ever attempt for that problem
  const newByDate = new Map<string, number>();
  for (const r of firstAttemptByProblem) {
    newByDate.set(r.firstDate, (newByDate.get(r.firstDate) ?? 0) + 1);
  }

  const attemptHistory: { date: string; count: number; newCount: number; reviewCount: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const found = attemptDateRows.find((a) => a.date === key);
    const total = found?.count ?? 0;
    const newCount = Math.min(newByDate.get(key) ?? 0, total);
    attemptHistory.push({ date: key, count: total, newCount, reviewCount: total - newCount });
  }

  // Full attempt history (all days since first attempt)
  const fullAttemptHistory: { date: string; count: number; newCount: number; reviewCount: number }[] = [];
  if (attemptDateRows.length > 0) {
    const firstDateStr = attemptDateRows[attemptDateRows.length - 1].date;
    const firstD = new Date(firstDateStr + "T00:00:00");
    const totalHistDays = Math.ceil((now.getTime() - firstD.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    for (let i = totalHistDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const found = attemptDateRows.find((a) => a.date === key);
      const total = found?.count ?? 0;
      const nc = Math.min(newByDate.get(key) ?? 0, total);
      fullAttemptHistory.push({ date: key, count: total, newCount: nc, reviewCount: total - nc });
    }
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
  const MASTERY_THRESHOLD = 45;
  const masteryData = userStates
    .map((s) => {
      const p = allProblems.find((prob) => prob.id === s.problemId);
      return p ? { problemId: p.id, title: p.title, leetcodeNumber: p.leetcodeNumber, stability: s.stability, category: p.category } : null;
    })
    .filter(Boolean) as { problemId: number; title: string; leetcodeNumber: number | null; stability: number; category: string }[];

  // Mock interview candidates: attempted medium/hard from weak categories
  const weakCategorySet = new Set(
    categoryStats.filter((c) => c.avgRetention < 0.7 && c.attempted > 0).map((c) => c.category),
  );
  const mockTargetCats = weakCategorySet.size > 0 ? weakCategorySet : new Set(allProblems.map((p) => p.category));
  const mockCandidates = allProblems
    .filter((p) => attemptedIds.has(p.id) && (p.difficulty === "Medium" || p.difficulty === "Hard") && mockTargetCats.has(p.category))
    .map((p) => ({
      id: p.id,
      leetcodeNumber: p.leetcodeNumber,
      title: p.title,
      difficulty: p.difficulty as "Easy" | "Medium" | "Hard",
      category: p.category,
      leetcodeUrl: p.leetcodeUrl,
      neetcodeUrl: p.neetcodeUrl,
    }));

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
      userId={userId}
      data={{
        reviewQueue,
        deferredProblems,
        autoDeferHards,
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
        avgReviewPerDay,
        overallPerDay,
        overallNewPerDay,
        overallReviewPerDay,
        categoryStats,
        difficultyBreakdown,
        attemptHistory,
        fullAttemptHistory,
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
        })),
        importAttemptedIds: [...attemptedIds],
        importTodayAttemptedIds: todayAttemptRows.map((a) => a.problemId),
        mockCandidates,
        pendingSubmissions: pendingRows.map((p) => ({
          id: p.id,
          problemId: p.problemId,
          problemTitle: p.problemTitle,
          leetcodeNumber: p.leetcodeNumber,
          difficulty: p.difficulty as "Easy" | "Medium" | "Hard",
          category: p.category,
          isReview: p.isReview,
          detectedAt: p.detectedAt.toISOString(),
        })),
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
