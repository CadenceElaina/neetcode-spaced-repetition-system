import { notFound } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, attempts, userProblemStates, problems } from "@/db/schema";
import { eq, like, notLike, count, asc } from "drizzle-orm";
import {
  computeCohortStats,
  computeCategoryStats,
  type AttemptRecord,
  type StateRecord,
} from "@/lib/analytics";
import { AdminClient } from "./admin-client";
import type { AdminData } from "./admin-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Aurora" };

const DEMO_SUFFIX = "%@research-demo.aurora";
const MS_PER_DAY = 86_400_000;

export default async function AdminPage() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!session?.user?.id || !adminEmail || session.user.email !== adminEmail) {
    notFound();
  }

  const now = new Date();
  const ago7  = new Date(now.getTime() - 7  * MS_PER_DAY);
  const ago30 = new Date(now.getTime() - 30 * MS_PER_DAY);

  /* ── Parallel fetches ── */
  const [
    realUsers,
    demoUserCount,
    allRealAttempts,
    allRealStates,
    allProblems,
  ] = await Promise.all([
    // Real users with basic info
    db
      .select({
        id:        users.id,
        name:      users.name,
        email:     users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(notLike(users.email!, DEMO_SUFFIX))
      .orderBy(asc(users.createdAt)),

    // Count of demo seed users (shown in the "excluded" note)
    db.select({ n: count() }).from(users).where(like(users.email!, DEMO_SUFFIX)),

    // All attempts for real users (joined with problems for category/difficulty)
    // Scale note: this loads all rows into app memory. Fine up to ~500 users × 300 attempts.
    // Add pagination or aggregate-only queries beyond that.
    db
      .select({
        userId:                attempts.userId,
        problemId:             attempts.problemId,
        category:              problems.category,
        difficulty:            problems.difficulty,
        outcome:               attempts.solvedIndependently,
        quality:               attempts.solutionQuality,
        confidence:            attempts.confidence,
        solveTimeMinutes:      attempts.solveTimeMinutes,
        rewroteFromScratch:    attempts.rewroteFromScratch,
        timeComplexityCorrect: attempts.timeComplexityCorrect,
        spaceComplexityCorrect: attempts.spaceComplexityCorrect,
        createdAt:             attempts.createdAt,
      })
      .from(attempts)
      .innerJoin(users,    eq(attempts.userId,    users.id))
      .innerJoin(problems, eq(attempts.problemId, problems.id))
      .where(notLike(users.email!, DEMO_SUFFIX)),

    // All states for real users
    db
      .select({
        userId:              userProblemStates.userId,
        problemId:           userProblemStates.problemId,
        stability:           userProblemStates.stability,
        lastReviewedAt:      userProblemStates.lastReviewedAt,
        nextReviewAt:        userProblemStates.nextReviewAt,
        totalAttempts:       userProblemStates.totalAttempts,
        bestSolutionQuality: userProblemStates.bestSolutionQuality,
      })
      .from(userProblemStates)
      .innerJoin(users, eq(userProblemStates.userId, users.id))
      .where(notLike(users.email!, DEMO_SUFFIX)),

    db.select({ id: problems.id, title: problems.title, difficulty: problems.difficulty, category: problems.category }).from(problems),
  ]);

  const problemMap = new Map(allProblems.map((p) => [p.id, p]));
  const realUserIds = new Set(realUsers.map((u) => u.id));

  /* ── Per-user attempt + state grouping for cohort analytics ── */
  const attemptsByUser = new Map<string, AttemptRecord[]>();
  const statesByUser   = new Map<string, StateRecord[]>();
  for (const u of realUsers) {
    attemptsByUser.set(u.id, []);
    statesByUser.set(u.id, []);
  }
  for (const a of allRealAttempts) {
    if (!realUserIds.has(a.userId)) continue;
    attemptsByUser.get(a.userId)!.push({
      problemId:             a.problemId,
      category:              a.category,
      difficulty:            a.difficulty,
      outcome:               a.outcome,
      quality:               a.quality,
      confidence:            a.confidence,
      solveTimeMinutes:      a.solveTimeMinutes,
      rewroteFromScratch:    a.rewroteFromScratch,
      timeComplexityCorrect: a.timeComplexityCorrect,
      spaceComplexityCorrect: a.spaceComplexityCorrect,
      createdAt:             a.createdAt,
    });
  }
  for (const s of allRealStates) {
    if (!realUserIds.has(s.userId)) continue;
    statesByUser.get(s.userId)!.push({
      problemId:           s.problemId,
      stability:           s.stability,
      lastReviewedAt:      s.lastReviewedAt,
      nextReviewAt:        s.nextReviewAt,
      totalAttempts:       s.totalAttempts,
      bestSolutionQuality: s.bestSolutionQuality,
    });
  }

  /* ── Overview stats ── */
  const lastActiveByUser = new Map<string, Date>();
  for (const a of allRealAttempts) {
    const prev = lastActiveByUser.get(a.userId);
    if (!prev || a.createdAt > prev) lastActiveByUser.set(a.userId, a.createdAt);
  }
  const activeUsers7d  = [...lastActiveByUser.values()].filter((d) => d >= ago7).length;
  const activeUsers30d = [...lastActiveByUser.values()].filter((d) => d >= ago30).length;

  /* ── User roster ── */
  const userRoster = realUsers.map((u) => {
    const uAttempts = attemptsByUser.get(u.id) ?? [];
    const uStates   = statesByUser.get(u.id)   ?? [];
    const optimal   = uStates.filter((s) => s.bestSolutionQuality === "OPTIMAL").length;
    return {
      id:               u.id,
      name:             u.name,
      email:            u.email,
      createdAt:        u.createdAt.toISOString(),
      lastActive:       lastActiveByUser.get(u.id)?.toISOString() ?? null,
      attemptCount:     uAttempts.length,
      problemsAttempted: uStates.length,
      optimalCount:     optimal,
    };
  }).sort((a, b) => {
    if (!a.lastActive && !b.lastActive) return 0;
    if (!a.lastActive) return 1;
    if (!b.lastActive) return -1;
    return b.lastActive.localeCompare(a.lastActive);
  });

  /* ── Cohort analytics ── */
  const allUserAttempts = realUsers.map((u) => attemptsByUser.get(u.id) ?? []);
  const allUserStates   = realUsers.map((u) => statesByUser.get(u.id)   ?? []);

  const cohortStats   = computeCohortStats(allUserAttempts, allUserStates, now);
  const flatAttempts  = allRealAttempts.map((a) => ({
    problemId:             a.problemId,
    category:              a.category,
    difficulty:            a.difficulty,
    outcome:               a.outcome,
    quality:               a.quality,
    confidence:            a.confidence,
    solveTimeMinutes:      a.solveTimeMinutes,
    rewroteFromScratch:    a.rewroteFromScratch,
    timeComplexityCorrect: a.timeComplexityCorrect,
    spaceComplexityCorrect: a.spaceComplexityCorrect,
    createdAt:             a.createdAt,
  } as AttemptRecord));
  const flatStates = allRealStates.map((s) => ({
    problemId:           s.problemId,
    stability:           s.stability,
    lastReviewedAt:      s.lastReviewedAt,
    nextReviewAt:        s.nextReviewAt,
    totalAttempts:       s.totalAttempts,
    bestSolutionQuality: s.bestSolutionQuality,
  } as StateRecord));
  const catStats = computeCategoryStats(flatAttempts, flatStates, now);

  const enrichedCohort = cohortStats
    .map((c) => ({
      ...c,
      title:      problemMap.get(c.problemId)?.title      ?? `Problem ${c.problemId}`,
      difficulty: problemMap.get(c.problemId)?.difficulty ?? "Medium",
      category:   problemMap.get(c.problemId)?.category   ?? "Unknown",
    }))
    .sort((a, b) => b.noOutcomeRate - a.noOutcomeRate);

  const newThisWeek  = realUsers.filter((u) => u.createdAt >= ago7).length;
  const newThisMonth = realUsers.filter((u) => u.createdAt >= ago30).length;

  const data: AdminData = {
    overview: {
      totalUsers:          realUsers.length,
      newThisWeek,
      newThisMonth,
      activeUsers7d,
      activeUsers30d,
      totalAttempts:       allRealAttempts.length,
      demoUsersExcluded:   demoUserCount[0]?.n ?? 0,
    },
    users:          userRoster,
    cohortProblems: enrichedCohort,
    categoryStats:  catStats.sort((a, b) => a.avgR - b.avgR),
  };

  return (
    <Suspense>
      <AdminClient data={data} />
    </Suspense>
  );
}
