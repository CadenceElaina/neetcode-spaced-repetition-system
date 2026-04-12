import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { drillAttempts, userDrillStates, syntaxDrills } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  computeFatigueCredit,
  computeDrillStability,
  computeNextReviewDate,
} from "@/lib/srs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();

  const { drillId, userCode, confidence, sessionPosition, categoryStreak } =
    body;

  // Validation
  if (typeof drillId !== "number") {
    return NextResponse.json({ error: "Invalid drillId" }, { status: 400 });
  }
  if (typeof confidence !== "number" || confidence < 1 || confidence > 4) {
    return NextResponse.json(
      { error: "confidence must be 1-4" },
      { status: 400 },
    );
  }

  const pos = typeof sessionPosition === "number" ? sessionPosition : 1;
  const streak = typeof categoryStreak === "number" ? categoryStreak : 1;

  // Verify drill exists
  const [drill] = await db
    .select()
    .from(syntaxDrills)
    .where(eq(syntaxDrills.id, drillId))
    .limit(1);

  if (!drill) {
    return NextResponse.json({ error: "Drill not found" }, { status: 404 });
  }

  // Compute fatigue credit
  const effectiveCredit = computeFatigueCredit(pos, streak);

  // Get or create user drill state
  const [existingState] = await db
    .select()
    .from(userDrillStates)
    .where(
      and(
        eq(userDrillStates.userId, userId),
        eq(userDrillStates.drillId, drillId),
      ),
    )
    .limit(1);

  const now = new Date();
  const oldStability = existingState?.stability ?? 0.5;
  const newStability = computeDrillStability(
    oldStability,
    confidence,
    effectiveCredit,
  );
  const nextReviewAt = computeNextReviewDate(newStability, now);

  if (existingState) {
    await db
      .update(userDrillStates)
      .set({
        stability: newStability,
        lastReviewedAt: now,
        nextReviewAt: nextReviewAt,
        totalAttempts: existingState.totalAttempts + 1,
        bestConfidence:
          existingState.bestConfidence === null ||
          confidence > existingState.bestConfidence
            ? confidence
            : existingState.bestConfidence,
        updatedAt: now,
      })
      .where(eq(userDrillStates.id, existingState.id));
  } else {
    await db.insert(userDrillStates).values({
      userId,
      drillId,
      stability: newStability,
      lastReviewedAt: now,
      nextReviewAt: nextReviewAt,
      totalAttempts: 1,
      bestConfidence: confidence,
    });
  }

  // Log the attempt
  await db.insert(drillAttempts).values({
    userId,
    drillId,
    userCode: typeof userCode === "string" ? userCode : null,
    confidence,
    sessionPosition: pos,
    categoryStreak: streak,
    effectiveCredit,
  });

  return NextResponse.json({
    newStability,
    nextReviewAt: nextReviewAt.toISOString(),
    effectiveCredit,
  });
}
