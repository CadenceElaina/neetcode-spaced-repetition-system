import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { problems, userProblemStates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [allProblems, states] = await Promise.all([
    db
      .select({
        id: problems.id,
        title: problems.title,
        leetcodeNumber: problems.leetcodeNumber,
        difficulty: problems.difficulty,
        category: problems.category,
        optimalTimeComplexity: problems.optimalTimeComplexity,
        optimalSpaceComplexity: problems.optimalSpaceComplexity,
      })
      .from(problems),
    db
      .select({ problemId: userProblemStates.problemId })
      .from(userProblemStates)
      .where(eq(userProblemStates.userId, session.user.id)),
  ]);

  const attemptedIds = states.map((s) => s.problemId);

  return <ImportClient allProblems={allProblems} attemptedIds={attemptedIds} />;
}
