import { db } from "@/db";
import { problems, userProblemStates } from "@/db/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { computeRetrievability } from "@/lib/srs";
import { DrillClient } from "./drill-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pattern Drill — LeetcodeSRS" };

export default async function DrillPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Pattern Drill</h1>
        <p className="text-sm text-muted-foreground">Sign in to start a drill session.</p>
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
