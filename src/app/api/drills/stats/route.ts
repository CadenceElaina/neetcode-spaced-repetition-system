import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { syntaxDrills, userDrillStates } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { computeDrillFluency } from "@/lib/srs";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();

  // Get all drills and user states
  const allDrills = await db.select().from(syntaxDrills);
  const userStates = await db
    .select()
    .from(userDrillStates)
    .where(eq(userDrillStates.userId, userId));

  const stateMap = new Map(userStates.map((s) => [s.drillId, s]));

  // Group drills by category
  const categoryMap = new Map<
    string,
    { total: number; reviewed: number; stabilities: number[]; due: number; mastered: number }
  >();

  for (const drill of allDrills) {
    const cat = drill.category;
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, {
        total: 0,
        reviewed: 0,
        stabilities: [],
        due: 0,
        mastered: 0,
      });
    }

    const entry = categoryMap.get(cat)!;
    entry.total++;

    const state = stateMap.get(drill.id);
    if (state) {
      entry.reviewed++;
      entry.stabilities.push(state.stability);
      if (state.stability > 21) entry.mastered++;
      if (state.nextReviewAt && state.nextReviewAt <= now) entry.due++;
    }
  }

  // Compute fluency per category
  const categories = Array.from(categoryMap.entries()).map(([name, data]) => {
    const avgStability =
      data.stabilities.length > 0
        ? data.stabilities.reduce((a, b) => a + b, 0) / data.stabilities.length
        : 0;

    const result = computeDrillFluency({
      totalDrills: data.total,
      reviewedDrills: data.reviewed,
      avgStability,
      dueCount: data.due,
    });

    return {
      name,
      fluency: Math.round(result.fluency * 100) / 100,
      tier: result.tier,
      totalDrills: data.total,
      reviewedDrills: data.reviewed,
      mastered: data.mastered,
      drillsDue: data.due,
    };
  });

  // Overall fluency: weighted average by drill count
  const totalDrills = allDrills.length;
  const totalReviewed = userStates.length;
  const allStabilities = userStates.map((s) => s.stability);
  const overallAvgStability =
    allStabilities.length > 0
      ? allStabilities.reduce((a, b) => a + b, 0) / allStabilities.length
      : 0;
  const totalDue = userStates.filter(
    (s) => s.nextReviewAt && s.nextReviewAt <= now,
  ).length;

  const overall = computeDrillFluency({
    totalDrills,
    reviewedDrills: totalReviewed,
    avgStability: overallAvgStability,
    dueCount: totalDue,
  });

  return NextResponse.json({
    overallFluency: Math.round(overall.fluency * 100) / 100,
    overallTier: overall.tier,
    totalDrills,
    totalReviewed,
    totalMastered: userStates.filter((s) => s.stability > 21).length,
    categories,
  });
}
