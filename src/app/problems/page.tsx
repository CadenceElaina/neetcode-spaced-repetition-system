import { db } from "@/db";
import { problems, userProblemStates } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ProblemsTable } from "./problems-table";
import { auth } from "@/auth";
import { computeRetrievability } from "@/lib/srs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Problems — NeetcodeSRS" };

export default async function ProblemsPage() {
  const allProblems = await db
    .select()
    .from(problems)
    .orderBy(asc(problems.id));

  const session = await auth();
  let problemStates: Record<number, { retention: number; totalAttempts: number; lastReviewed: string | null; bestQuality: string | null }> = {};

  if (session?.user?.id) {
    const states = await db
      .select()
      .from(userProblemStates)
      .where(eq(userProblemStates.userId, session.user.id));

    const now = new Date();
    for (const s of states) {
      const daysSince = s.lastReviewedAt
        ? (now.getTime() - s.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      problemStates[s.problemId] = {
        retention: computeRetrievability(s.stability, daysSince),
        totalAttempts: s.totalAttempts,
        lastReviewed: s.lastReviewedAt?.toISOString() ?? null,
        bestQuality: s.bestSolutionQuality,
      };
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Problems</h1>
      <ProblemsTable problems={allProblems} problemStates={problemStates} />
    </div>
  );
}
