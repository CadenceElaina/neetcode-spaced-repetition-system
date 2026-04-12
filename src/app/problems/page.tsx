import { db } from "@/db";
import { problems, userProblemStates } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ProblemsTable } from "./problems-table";
import { auth } from "@/auth";
import { computeRetrievability } from "@/lib/srs";
import { DEMO_PROBLEM_STATES } from "@/app/dashboard/demo-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Problems — Aurora" };

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; difficulty?: string; status?: string }>;
}) {
  const params = await searchParams;
  const allProblems = await db
    .select()
    .from(problems)
    .orderBy(asc(problems.id));

  const session = await auth();
  let problemStates: Record<number, { retention: number; totalAttempts: number; lastReviewed: string | null; bestQuality: string | null }> = {};
  let isDemo = false;

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
  } else {
    problemStates = DEMO_PROBLEM_STATES;
    isDemo = true;
  }

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 flex items-center gap-2 text-sm">
          <span className="text-xs font-medium text-accent">DEMO</span>
          <span className="text-muted-foreground text-xs">Showing sample progress — sign in to track your own</span>
        </div>
      )}
      <h1 className="text-2xl font-semibold">Problems</h1>
      <ProblemsTable
        problems={allProblems}
        problemStates={problemStates}
        initialCategory={params.category}
        initialDifficulty={params.difficulty}
        initialStatus={params.status}
      />
    </div>
  );
}
