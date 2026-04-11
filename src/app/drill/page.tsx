import { db } from "@/db";
import { problems, userProblemStates } from "@/db/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { computeRetrievability } from "@/lib/srs";
import { DrillClient } from "./drill-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pattern Drill — Aurora" };

export default async function DrillPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Pattern Drill</h1>
        <div className="rounded-lg border border-border bg-muted p-6 space-y-4 max-w-2xl">
          <p className="text-sm text-foreground">
            Pattern Drill lets you focus on one category at a time — like Sliding Window or Binary Search — and practice problems sorted by weakness.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Pick a category to drill</li>
            <li>Problems are sorted by retention — weakest first</li>
            <li>Track your progress across each pattern</li>
          </ul>
          <div className="pt-2">
            <a
              href="/api/auth/signin"
              className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
            >
              Sign in to start drilling
            </a>
          </div>
        </div>
      </div>
    );
  }

  const userId = session.user.id;
  const now = new Date();

  const allProblems = await db.select().from(problems);
  const userStates = await db
    .select()
    .from(userProblemStates)
    .where(eq(userProblemStates.userId, userId));

  const stateMap = new Map(userStates.map((s) => [s.problemId, s]));

  // Build per-category data
  const categoryMap = new Map<string, {
    problems: {
      id: number;
      leetcodeNumber: number;
      title: string;
      difficulty: "Easy" | "Medium" | "Hard";
      leetcodeUrl: string;
      attempted: boolean;
      retention: number | null;
      totalAttempts: number;
    }[];
    avgRetention: number;
  }>();

  for (const p of allProblems) {
    const entry = categoryMap.get(p.category) ?? { problems: [], avgRetention: 0 };
    const state = stateMap.get(p.id);
    let r: number | null = null;
    if (state?.lastReviewedAt) {
      const daysSince = (now.getTime() - state.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24);
      r = computeRetrievability(state.stability, daysSince);
    }
    entry.problems.push({
      id: p.id,
      leetcodeNumber: p.leetcodeNumber!,
      title: p.title,
      difficulty: p.difficulty,
      leetcodeUrl: p.leetcodeUrl,
      attempted: !!state,
      retention: r,
      totalAttempts: state?.totalAttempts ?? 0,
    });
    categoryMap.set(p.category, entry);
  }

  // Compute avg retention per category
  const categories: {
    name: string;
    total: number;
    attempted: number;
    avgRetention: number;
    problems: typeof categoryMap extends Map<string, { problems: infer P }> ? P : never;
  }[] = [];

  for (const [name, data] of categoryMap) {
    const retentions = data.problems.filter((p) => p.retention !== null).map((p) => p.retention!);
    const avgR = retentions.length > 0
      ? retentions.reduce((a, b) => a + b, 0) / retentions.length
      : 0;
    // Sort by: unattempted first, then by retention ascending
    data.problems.sort((a, b) => {
      if (!a.attempted && b.attempted) return -1;
      if (a.attempted && !b.attempted) return 1;
      return (a.retention ?? 0) - (b.retention ?? 0);
    });
    categories.push({
      name,
      total: data.problems.length,
      attempted: data.problems.filter((p) => p.attempted).length,
      avgRetention: avgR,
      problems: data.problems,
    });
  }

  categories.sort((a, b) => a.name.localeCompare(b.name));

  return <DrillClient categories={categories} />;
}
