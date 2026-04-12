import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { syntaxDrills, userDrillStates } from "@/db/schema";
import { eq, and, lte, isNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

  let drills = rows.map((row) => ({
    id: row.drill.id,
    title: row.drill.title,
    category: row.drill.category,
    level: row.drill.level,
    language: row.drill.language,
    prompt: row.drill.prompt,
    expectedCode: row.drill.expectedCode,
    alternatives: row.drill.alternatives ?? [],
    explanation: row.drill.explanation,
    tags: row.drill.tags ?? [],
    state: row.state
      ? {
          stability: row.state.stability,
          lastReviewedAt: row.state.lastReviewedAt?.toISOString() ?? null,
          nextReviewAt: row.state.nextReviewAt?.toISOString() ?? null,
          totalAttempts: row.state.totalAttempts,
          bestConfidence: row.state.bestConfidence,
        }
      : null,
  }));

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

  return NextResponse.json({ drills });
}
