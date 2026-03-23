import { auth } from "@/auth";
import { db } from "@/db";
import { problems, attempts, userProblemStates } from "@/db/schema";
import { eq, sql, count, avg, sum } from "drizzle-orm";
import Link from "next/link";
import { StatsCharts } from "./stats-charts";
import { computeRetrievability } from "@/lib/srs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats — LeetcodeSRS" };

export default async function StatsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Stats</h1>
        <p className="text-sm text-muted-foreground">Sign in to see your statistics.</p>
      </div>
    );
  }

  const userId = session.user.id;
  const now = new Date();

  // Category stats: for each category, count total problems + user's attempted + avg retention
  const allProblems = await db.select().from(problems);
  const userStates = await db
    .select()
    .from(userProblemStates)
    .where(eq(userProblemStates.userId, userId));

  // Map problemId -> state
  const stateMap = new Map(userStates.map((s) => [s.problemId, s]));

  // Build category stats
  const categoryMap = new Map<string, { total: number; attempted: number; retentions: number[] }>();
  for (const p of allProblems) {
    const entry = categoryMap.get(p.category) ?? { total: 0, attempted: 0, retentions: [] };
    entry.total++;
    const state = stateMap.get(p.id);
    if (state) {
      entry.attempted++;
      const daysSince = state.lastReviewedAt
        ? (now.getTime() - state.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      entry.retentions.push(computeRetrievability(state.stability, daysSince));
    }
    categoryMap.set(p.category, entry);
  }

  const categoryStats = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      attempted: data.attempted,
      avgRetention: data.retentions.length > 0
        ? data.retentions.reduce((a, b) => a + b, 0) / data.retentions.length
        : 0,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

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

  // Retention distribution buckets
  const buckets = [
    { label: "Strong", min: 0.8, max: 1.01, color: "bg-green-500", count: 0 },
    { label: "Good", min: 0.6, max: 0.8, color: "bg-emerald-400", count: 0 },
    { label: "Fading", min: 0.4, max: 0.6, color: "bg-amber-500", count: 0 },
    { label: "Weak", min: 0.2, max: 0.4, color: "bg-orange-500", count: 0 },
    { label: "Critical", min: 0, max: 0.2, color: "bg-red-500", count: 0 },
  ];
  for (const state of userStates) {
    const daysSince = state.lastReviewedAt
      ? (now.getTime() - state.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    const r = computeRetrievability(state.stability, daysSince);
    for (const b of buckets) {
      if (r >= b.min && r < b.max) {
        b.count++;
        break;
      }
    }
  }

  // Quality distribution from all attempts
  const qualityRows = await db
    .select({
      quality: attempts.solutionQuality,
      count: count(),
    })
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .groupBy(attempts.solutionQuality);

  const qualityDistribution = ["OPTIMAL", "SUBOPTIMAL", "BRUTE_FORCE", "NONE"].map((q) => ({
    quality: q,
    count: qualityRows.find((r) => r.quality === q)?.count ?? 0,
  }));

  // Attempt history (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentAttempts = await db
    .select({
      date: sql<string>`date(${attempts.createdAt})`,
      count: count(),
    })
    .from(attempts)
    .where(
      sql`${attempts.userId} = ${userId} AND ${attempts.createdAt} >= ${thirtyDaysAgo.toISOString()}`,
    )
    .groupBy(sql`date(${attempts.createdAt})`)
    .orderBy(sql`date(${attempts.createdAt})`);

  // Fill in missing days
  const attemptHistory: { date: string; count: number }[] = [];
  const attemptMap = new Map(recentAttempts.map((r) => [r.date, r.count]));
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    attemptHistory.push({ date: key, count: attemptMap.get(key) ?? 0 });
  }

  // Time totals
  const timeRows = await db
    .select({
      totalSolve: sum(attempts.solveTimeMinutes),
      totalStudy: sum(attempts.studyTimeMinutes),
      avgSolve: avg(attempts.solveTimeMinutes),
      avgConfidence: avg(attempts.confidence),
    })
    .from(attempts)
    .where(eq(attempts.userId, userId));

  const totalSolveMinutes = Number(timeRows[0]?.totalSolve ?? 0);
  const totalStudyMinutes = Number(timeRows[0]?.totalStudy ?? 0);
  const avgSolveMinutes = Number(timeRows[0]?.avgSolve ?? 0);
  const avgConfidence = Number(timeRows[0]?.avgConfidence ?? 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Stats</h1>

      {userStates.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-muted-foreground">No data yet. Log your first attempt to see stats.</p>
          <Link
            href="/problems"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
          >
            Browse Problems
          </Link>
        </div>
      ) : (
        <StatsCharts
          categoryStats={categoryStats}
          difficultyBreakdown={difficultyBreakdown}
          attemptHistory={attemptHistory}
          qualityDistribution={qualityDistribution}
          retentionBuckets={buckets.map((b) => ({ label: b.label, count: b.count, color: b.color }))}
          totalSolveMinutes={totalSolveMinutes}
          totalStudyMinutes={totalStudyMinutes}
          avgSolveMinutes={avgSolveMinutes}
          avgConfidence={avgConfidence}
        />
      )}
    </div>
  );
}
