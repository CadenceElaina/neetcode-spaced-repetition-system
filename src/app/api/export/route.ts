import { auth } from "@/auth";
import { db } from "@/db";
import { attempts, userProblemStates, problems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { computeRetrievability } from "@/lib/srs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();

  const [attemptRows, stateRows] = await Promise.all([
    db
      .select({
        createdAt: attempts.createdAt,
        outcome: attempts.solvedIndependently,
        quality: attempts.solutionQuality,
        userTimeComplexity: attempts.userTimeComplexity,
        userSpaceComplexity: attempts.userSpaceComplexity,
        timeComplexityCorrect: attempts.timeComplexityCorrect,
        spaceComplexityCorrect: attempts.spaceComplexityCorrect,
        solveTimeMinutes: attempts.solveTimeMinutes,
        studyTimeMinutes: attempts.studyTimeMinutes,
        rewroteFromScratch: attempts.rewroteFromScratch,
        confidence: attempts.confidence,
        code: attempts.code,
        notes: attempts.notes,
        source: attempts.source,
        problemTitle: problems.title,
        problemNumber: problems.leetcodeNumber,
        problemDifficulty: problems.difficulty,
        problemCategory: problems.category,
        optimalTimeComplexity: problems.optimalTimeComplexity,
        optimalSpaceComplexity: problems.optimalSpaceComplexity,
      })
      .from(attempts)
      .innerJoin(problems, eq(attempts.problemId, problems.id))
      .where(eq(attempts.userId, userId))
      .orderBy(asc(attempts.createdAt)),

    db
      .select({
        stability: userProblemStates.stability,
        lastReviewedAt: userProblemStates.lastReviewedAt,
        nextReviewAt: userProblemStates.nextReviewAt,
        totalAttempts: userProblemStates.totalAttempts,
        bestSolutionQuality: userProblemStates.bestSolutionQuality,
        notes: userProblemStates.notes,
        problemTitle: problems.title,
        problemNumber: problems.leetcodeNumber,
        problemDifficulty: problems.difficulty,
        problemCategory: problems.category,
      })
      .from(userProblemStates)
      .innerJoin(problems, eq(userProblemStates.problemId, problems.id))
      .where(eq(userProblemStates.userId, userId))
      .orderBy(asc(problems.leetcodeNumber)),
  ]);

  const exportData = {
    exportedAt: now.toISOString(),
    version: 1,
    attempts: attemptRows.map((r) => ({
      date: r.createdAt.toISOString(),
      problem: {
        title: r.problemTitle,
        leetcodeNumber: r.problemNumber,
        difficulty: r.problemDifficulty,
        category: r.problemCategory,
      },
      outcome: r.outcome,
      quality: r.quality,
      userTimeComplexity: r.userTimeComplexity,
      optimalTimeComplexity: r.optimalTimeComplexity,
      timeCorrect: r.timeComplexityCorrect,
      userSpaceComplexity: r.userSpaceComplexity,
      optimalSpaceComplexity: r.optimalSpaceComplexity,
      spaceCorrect: r.spaceComplexityCorrect,
      solveTimeMinutes: r.solveTimeMinutes,
      studyTimeMinutes: r.studyTimeMinutes,
      rewroteFromScratch: r.rewroteFromScratch,
      confidence: r.confidence,
      code: r.code ?? null,
      notes: r.notes ?? null,
      source: r.source,
    })),
    srsState: stateRows.map((r) => {
      const daysSince = r.lastReviewedAt
        ? (now.getTime() - r.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      const retrievability = isFinite(daysSince)
        ? computeRetrievability(r.stability, daysSince)
        : 0;
      return {
        problem: {
          title: r.problemTitle,
          leetcodeNumber: r.problemNumber,
          difficulty: r.problemDifficulty,
          category: r.problemCategory,
        },
        stability: r.stability,
        retrievability: Math.round(retrievability * 100) / 100,
        lastReviewedAt: r.lastReviewedAt?.toISOString() ?? null,
        nextReviewAt: r.nextReviewAt?.toISOString() ?? null,
        totalAttempts: r.totalAttempts,
        bestSolutionQuality: r.bestSolutionQuality ?? null,
        notes: r.notes ?? null,
      };
    }),
  };

  const date = now.toISOString().slice(0, 10);
  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="aurora-export-${date}.json"`,
    },
  });
}
