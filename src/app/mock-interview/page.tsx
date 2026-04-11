import { db } from "@/db";
import { problems, userProblemStates } from "@/db/schema";
import { auth } from "@/auth";
import { eq, sql } from "drizzle-orm";
import { computeRetrievability } from "@/lib/srs";
import { MockInterviewClient } from "./mock-interview-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mock Interview — Aurora" };

type InterviewProblem = {
  id: number;
  leetcodeNumber: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  leetcodeUrl: string;
};

export default async function MockInterviewPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Mock Interview</h1>
        <div className="rounded-lg border border-border bg-muted p-6 space-y-4 max-w-2xl">
          <p className="text-sm text-foreground">
            Simulate a real coding interview with a 45-minute timer and problems selected from your weak areas.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Get 3 problems (medium + hard) targeting your weakest categories</li>
            <li>45-minute countdown timer — just like a real interview</li>
            <li>Log results and track improvement over time</li>
          </ul>
          <div className="pt-2">
            <a
              href="/api/auth/signin"
              className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
            >
              Sign in to start a mock interview
            </a>
          </div>
        </div>
      </div>
    );
  }

  const userId = session.user.id;
  const now = new Date();

  // Fetch all problems and user states
  const allProblems = await db.select().from(problems);
  const userStates = await db
    .select()
    .from(userProblemStates)
    .where(eq(userProblemStates.userId, userId));

  const stateMap = new Map(userStates.map((s) => [s.problemId, s]));

  // Compute category avg R
  const categoryRMap = new Map<string, number[]>();
  for (const p of allProblems) {
    const state = stateMap.get(p.id);
    if (state) {
      const daysSince = state.lastReviewedAt
        ? (now.getTime() - state.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      const r = computeRetrievability(state.stability, daysSince);
      const arr = categoryRMap.get(p.category) ?? [];
      arr.push(r);
      categoryRMap.set(p.category, arr);
    }
  }

  // Find weak categories (avg R < 0.7) — or all categories if none are weak
  const categoryAvgs = Array.from(categoryRMap.entries()).map(([cat, rs]) => ({
    category: cat,
    avgR: rs.reduce((a, b) => a + b, 0) / rs.length,
  }));
  const weakCategories = categoryAvgs.filter((c) => c.avgR < 0.7);
  const targetCategories = weakCategories.length > 0
    ? new Set(weakCategories.map((c) => c.category))
    : new Set(allProblems.map((p) => p.category)); // Fall back to all

  // Filter to medium + hard problems in weak categories
  const mediums = allProblems.filter(
    (p) => p.difficulty === "Medium" && targetCategories.has(p.category),
  );
  const hards = allProblems.filter(
    (p) => p.difficulty === "Hard" && targetCategories.has(p.category),
  );

  // Pick 1 medium + 1 hard randomly (or however many are available)
  const selectedMedium = mediums.length > 0
    ? mediums[Math.floor(Math.random() * mediums.length)]
    : null;
  const selectedHard = hards.length > 0
    ? hards[Math.floor(Math.random() * hards.length)]
    : null;

  const interviewProblems: InterviewProblem[] = [];
  if (selectedMedium) {
    interviewProblems.push({
      id: selectedMedium.id,
      leetcodeNumber: selectedMedium.leetcodeNumber!,
      title: selectedMedium.title,
      difficulty: selectedMedium.difficulty,
      category: selectedMedium.category,
      leetcodeUrl: selectedMedium.leetcodeUrl,
    });
  }
  if (selectedHard) {
    interviewProblems.push({
      id: selectedHard.id,
      leetcodeNumber: selectedHard.leetcodeNumber!,
      title: selectedHard.title,
      difficulty: selectedHard.difficulty,
      category: selectedHard.category,
      leetcodeUrl: selectedHard.leetcodeUrl,
    });
  }

  const categories = Array.from(new Set(allProblems.map((p) => p.category))).sort();

  return (
    <MockInterviewClient
      problems={interviewProblems}
      categories={categories}
      weakCategories={weakCategories.map((c) => c.category)}
    />
  );
}
