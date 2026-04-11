import { db } from "@/db";
import { problems, userProblemStates } from "@/db/schema";
import { auth } from "@/auth";
import { eq, asc, sql } from "drizzle-orm";
import Link from "next/link";
import { ReviewQueueClient } from "./review-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review — Aurora" };

export default async function ReviewPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Review Queue</h1>
        <p className="text-sm text-muted-foreground">Sign in to see your review queue.</p>
      </div>
    );
  }

  const now = new Date();

  const queue = await db
    .select({
      stateId: userProblemStates.id,
      problemId: userProblemStates.problemId,
      nextReviewAt: userProblemStates.nextReviewAt,
      stability: userProblemStates.stability,
      totalAttempts: userProblemStates.totalAttempts,
      bestQuality: userProblemStates.bestSolutionQuality,
      notes: userProblemStates.notes,
      title: problems.title,
      leetcodeNumber: problems.leetcodeNumber,
      difficulty: problems.difficulty,
      category: problems.category,
    })
    .from(userProblemStates)
    .innerJoin(problems, eq(userProblemStates.problemId, problems.id))
    .where(
      sql`${userProblemStates.userId} = ${session.user.id} AND ${userProblemStates.nextReviewAt} <= ${now.toISOString()}`,
    )
    .orderBy(asc(userProblemStates.nextReviewAt));

  const queueItems = queue.map((item) => ({
    stateId: item.stateId,
    problemId: item.problemId,
    title: item.title,
    leetcodeNumber: item.leetcodeNumber,
    difficulty: item.difficulty as "Easy" | "Medium" | "Hard",
    category: item.category,
    totalAttempts: item.totalAttempts,
    notes: item.notes,
  }));

  return <ReviewQueueClient initialQueue={queueItems} />;
}
