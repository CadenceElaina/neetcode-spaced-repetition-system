import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { syntaxDrills, userDrillStates } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Level unlock thresholds: avg stability of reviewed drills at level N must exceed this to unlock N+1. */
const LEVEL_UNLOCK_STABILITY: Record<number, number> = {
  1: 7,  // L1 avg stability > 7d → unlocks L2
  2: 14, // L2 avg stability > 14d → unlocks L3
  3: 21, // L3 avg stability > 21d → unlocks L4
  4: 28, // L4 avg stability > 28d → unlocks L5
};

/** Compute the max unlocked drill level per category for a user. L1 is always available. */
function computeCategoryUnlocks(
  drills: Array<{ category: string; level: number; state: { stability: number } | null }>,
): Map<string, number> {
  const catLevelStabilities = new Map<string, Map<number, number[]>>();

  for (const d of drills) {
    if (!d.state) continue;
    if (!catLevelStabilities.has(d.category)) catLevelStabilities.set(d.category, new Map());
    const catMap = catLevelStabilities.get(d.category)!;
    if (!catMap.has(d.level)) catMap.set(d.level, []);
    catMap.get(d.level)!.push(d.state.stability);
  }

  const categories = [...new Set(drills.map((d) => d.category))];
  const unlocks = new Map<string, number>();

  for (const cat of categories) {
    const catMap = catLevelStabilities.get(cat);
    let maxLevel = 1; // L1 always available

    for (let level = 1; level <= 4; level++) {
      const stabs = catMap?.get(level) ?? [];
      if (stabs.length === 0) break; // no reviewed drills at this level — stop here
      const avgStability = stabs.reduce((a, b) => a + b, 0) / stabs.length;
      if (avgStability > LEVEL_UNLOCK_STABILITY[level]) {
        maxLevel = level + 1;
      } else {
        break;
      }
    }

    unlocks.set(cat, maxLevel);
  }

  return unlocks;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all"; // due | new | all
  const category = searchParams.get("category"); // optional filter
  const now = new Date();

  // Fetch all drills with user state (left join)
  const rows = await db
    .select({
      drill: syntaxDrills,
      state: userDrillStates,
    })
    .from(syntaxDrills)
    .leftJoin(
      userDrillStates,
      and(
        eq(userDrillStates.drillId, syntaxDrills.id),
        eq(userDrillStates.userId, userId),
      ),
    );

  const totalInDb = rows.length;

  let drills = rows.map((row) => {
    // If promptVariants are available, randomly pick one instead of the static prompt
    const variants = row.drill.promptVariants as string[] | null;
    const prompt =
      variants && variants.length > 0
        ? variants[Math.floor(Math.random() * variants.length)]!
        : row.drill.prompt;

    return {
      id: row.drill.id,
      title: row.drill.title,
      category: row.drill.category,
      level: row.drill.level,
      language: row.drill.language,
      prompt,
      expectedCode: row.drill.expectedCode,
      alternatives: row.drill.alternatives ?? [],
      explanation: row.drill.explanation,
      tags: row.drill.tags ?? [],
      testCases: (row.drill.testCases as Array<{ input: string; expected: string }>) ?? [],
      distractors: row.drill.distractors ?? [],
      state: row.state
        ? {
            stability: row.state.stability,
            lastReviewedAt: row.state.lastReviewedAt?.toISOString() ?? null,
            nextReviewAt: row.state.nextReviewAt?.toISOString() ?? null,
            totalAttempts: row.state.totalAttempts,
            bestConfidence: row.state.bestConfidence,
          }
        : null,
    };
  });

  // Apply level gating
  const categoryUnlocks = computeCategoryUnlocks(drills);
  drills = drills.filter((d) => d.level <= (categoryUnlocks.get(d.category) ?? 1));

  // Apply category filter
  if (category) {
    drills = drills.filter((d) => d.category === category);
  }

  // Apply status filter
  if (filter === "due") {
    drills = drills.filter(
      (d) =>
        d.state !== null &&
        d.state.nextReviewAt !== null &&
        new Date(d.state.nextReviewAt) <= now,
    );
  } else if (filter === "new") {
    drills = drills.filter((d) => d.state === null);
  }

  return NextResponse.json({
    drills,
    _meta: {
      totalInDb,
      returnedCount: drills.length,
      gatingActive: true,
      categoryUnlocks: Object.fromEntries(categoryUnlocks),
    },
  });
}
