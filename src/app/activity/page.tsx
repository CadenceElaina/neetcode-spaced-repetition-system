import { db } from "@/db";
import { attempts, problems, userProblemStates } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { ActivityClient } from "./activity-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity — Aurora" };

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; range?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground">Sign in to see your activity.</p>
      </div>
    );
  }

  const params = await searchParams;
  const dateStr = params.date ?? new Date().toISOString().slice(0, 10);
  const range = params.range === "week" ? "week" : "day";

  // Compute date range
  const startDate = new Date(dateStr + "T00:00:00Z");
  let endDate: Date;

  if (range === "week") {
    // Start of week (Monday) containing the selected date
    const day = startDate.getUTCDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
    startDate.setUTCDate(startDate.getUTCDate() - diff);
    endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 7);
  } else {
    endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
  }

  const userId = session.user.id;

  // Fetch attempts in range with problem info
  const rows = await db
    .select({
      attemptId: attempts.id,
      problemId: attempts.problemId,
      solvedIndependently: attempts.solvedIndependently,
      solutionQuality: attempts.solutionQuality,
      confidence: attempts.confidence,
      solveTimeMinutes: attempts.solveTimeMinutes,
      studyTimeMinutes: attempts.studyTimeMinutes,
      timeCorrect: attempts.timeComplexityCorrect,
      spaceCorrect: attempts.spaceComplexityCorrect,
      code: attempts.code,
      notes: attempts.notes,
      createdAt: attempts.createdAt,
      title: problems.title,
      leetcodeNumber: problems.leetcodeNumber,
      difficulty: problems.difficulty,
      category: problems.category,
    })
    .from(attempts)
    .innerJoin(problems, eq(attempts.problemId, problems.id))
    .where(
      and(
        eq(attempts.userId, userId),
        gte(attempts.createdAt, startDate),
        lt(attempts.createdAt, endDate),
      ),
    )
    .orderBy(attempts.createdAt);

  // Determine which problems were first attempts (new) vs reviews
  const firstAttemptCheck = await db
    .select({
      problemId: userProblemStates.problemId,
      totalAttempts: userProblemStates.totalAttempts,
    })
    .from(userProblemStates)
    .where(eq(userProblemStates.userId, userId));

  const stateMap = new Map(firstAttemptCheck.map((s) => [s.problemId, s]));

  // Count attempts per problem before this date range to determine new vs review
  const priorCountRows = await db
    .select({
      problemId: attempts.problemId,
      count: sql<number>`count(*)::int`,
    })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        lt(attempts.createdAt, startDate),
      ),
    )
    .groupBy(attempts.problemId);

  const priorCounts = new Map(priorCountRows.map((r) => [r.problemId, r.count]));

  const activityItems = rows.map((row) => {
    const prior = priorCounts.get(row.problemId) ?? 0;
    const isNew = prior === 0;

    return {
      attemptId: row.attemptId,
      problemId: row.problemId,
      title: row.title,
      leetcodeNumber: row.leetcodeNumber,
      difficulty: row.difficulty as "Easy" | "Medium" | "Hard",
      category: row.category,
      solvedIndependently: row.solvedIndependently,
      solutionQuality: row.solutionQuality,
      confidence: row.confidence,
      solveTimeMinutes: row.solveTimeMinutes,
      studyTimeMinutes: row.studyTimeMinutes,
      timeCorrect: row.timeCorrect,
      spaceCorrect: row.spaceCorrect,
      createdAt: row.createdAt.toISOString(),
      isNew,
    };
  });

  // Summary stats
  const totalTime = activityItems.reduce(
    (sum, a) => sum + (a.solveTimeMinutes ?? 0) + (a.studyTimeMinutes ?? 0),
    0,
  );
  const newCount = activityItems.filter((a) => a.isNew).length;
  const reviewCount = activityItems.filter((a) => !a.isNew).length;
  const solvedCount = activityItems.filter(
    (a) => a.solvedIndependently === "YES",
  ).length;
  const avgConfidence =
    activityItems.length > 0
      ? activityItems.reduce((sum, a) => sum + a.confidence, 0) / activityItems.length
      : 0;

  return (
    <ActivityClient
      items={activityItems}
      date={dateStr}
      range={range}
      summary={{
        total: activityItems.length,
        newCount,
        reviewCount,
        solvedCount,
        totalTime,
        avgConfidence,
      }}
    />
  );
}
