import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { attempts, userProblemStates, problems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  computeNewStability,
  computeInitialStability,
  computeNextReviewDate,
  type AttemptSignals,
  type SolvedIndependently,
  type SolutionQuality,
  type RewroteFromScratch,
} from "@/lib/srs";

const VALID_SOLVED = ["YES", "PARTIAL", "NO"] as const;
const VALID_QUALITY = ["OPTIMAL", "SUBOPTIMAL", "BRUTE_FORCE", "NONE"] as const;
const VALID_REWROTE = ["YES", "NO", "DID_NOT_ATTEMPT"] as const;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Validate required fields
  const {
    problemId,
    solvedIndependently,
    solutionQuality,
    userTimeComplexity,
    userSpaceComplexity,
    confidence,
  } = body;

  if (
    typeof problemId !== "number" ||
    !VALID_SOLVED.includes(solvedIndependently) ||
    !VALID_QUALITY.includes(solutionQuality) ||
    typeof confidence !== "number" || confidence < 1 || confidence > 5
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Complexity is required unless quality is NONE (could not solve)
  const isNoSolution = solutionQuality === "NONE";
  const finalTimeComplexity = isNoSolution ? "N/A" : (typeof userTimeComplexity === "string" ? userTimeComplexity.trim() : "");
  const finalSpaceComplexity = isNoSolution ? "N/A" : (typeof userSpaceComplexity === "string" ? userSpaceComplexity.trim() : "");

  if (!isNoSolution && (!finalTimeComplexity || !finalSpaceComplexity)) {
    return NextResponse.json({ error: "Complexity required when solution was found" }, { status: 400 });
  }

  // Verify problem exists
  const problem = await db.select().from(problems).where(eq(problems.id, problemId)).limit(1);
  if (!problem[0]) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  // Compare complexities — only meaningful when solved independently
  const solvedAlone = solvedIndependently === "YES";
  const optTime = problem[0].optimalTimeComplexity;
  const optSpace = problem[0].optimalSpaceComplexity;
  const timeCorrect = (isNoSolution || !solvedAlone) ? null : (optTime ? normalize(finalTimeComplexity) === normalize(optTime) : null);
  const spaceCorrect = (isNoSolution || !solvedAlone) ? null : (optSpace ? normalize(finalSpaceComplexity) === normalize(optSpace) : null);

  const rewrote: RewroteFromScratch | null = VALID_REWROTE.includes(body.rewroteFromScratch)
    ? body.rewroteFromScratch
    : null;

  // Insert attempt
  const [attempt] = await db
    .insert(attempts)
    .values({
      userId: session.user.id,
      problemId,
      solvedIndependently,
      solutionQuality,
      userTimeComplexity: finalTimeComplexity,
      userSpaceComplexity: finalSpaceComplexity,
      timeComplexityCorrect: timeCorrect,
      spaceComplexityCorrect: spaceCorrect,
      solveTimeMinutes: typeof body.solveTimeMinutes === "number" ? body.solveTimeMinutes : null,
      studyTimeMinutes: typeof body.studyTimeMinutes === "number" ? body.studyTimeMinutes : null,
      rewroteFromScratch: rewrote,
      confidence,
      code: typeof body.code === "string" ? body.code : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    })
    .returning({ id: attempts.id });

  // Build signals for SRS algorithm
  const signals: AttemptSignals = {
    solvedIndependently: solvedIndependently as SolvedIndependently,
    solutionQuality: solutionQuality as SolutionQuality,
    rewroteFromScratch: rewrote,
    timeComplexityCorrect: timeCorrect,
    spaceComplexityCorrect: spaceCorrect,
    confidence,
    solveTimeMinutes: typeof body.solveTimeMinutes === "number" ? body.solveTimeMinutes : null,
    difficulty: problem[0].difficulty,
  };

  // Upsert user problem state
  const existing = await db
    .select()
    .from(userProblemStates)
    .where(
      and(
        eq(userProblemStates.userId, session.user.id),
        eq(userProblemStates.problemId, problemId),
      ),
    )
    .limit(1);

  const now = new Date();

  // Failed or struggled attempts should come back quickly
  const isFailed = solvedIndependently === "NO";
  const isStruggled = solvedIndependently === "PARTIAL" && confidence <= 2;

  let oldStability: number;
  let newStability: number;
  let nextReview: Date;

  if (existing[0]) {
    oldStability = existing[0].stability;
    newStability = computeNewStability(existing[0].stability, signals);
    nextReview = isFailed
      ? now // immediately
      : isStruggled
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000) // 1 day
        : computeNextReviewDate(newStability, now);

    await db
      .update(userProblemStates)
      .set({
        stability: newStability,
        lastReviewedAt: now,
        nextReviewAt: nextReview,
        totalAttempts: existing[0].totalAttempts + 1,
        bestSolutionQuality:
          rankQuality(solutionQuality) > rankQuality(existing[0].bestSolutionQuality)
            ? solutionQuality
            : existing[0].bestSolutionQuality,
        updatedAt: now,
      })
      .where(eq(userProblemStates.id, existing[0].id));
  } else {
    oldStability = 0;
    const initialStability = computeInitialStability(signals);
    newStability = initialStability;
    nextReview = isFailed
      ? now
      : isStruggled
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
        : computeNextReviewDate(initialStability, now);

    await db.insert(userProblemStates).values({
      userId: session.user.id,
      problemId,
      stability: initialStability,
      lastReviewedAt: now,
      nextReviewAt: nextReview,
      totalAttempts: 1,
      bestSolutionQuality: solutionQuality,
    });
  }

  const MASTERY_THRESHOLD = 30;
  return NextResponse.json({
    id: attempt.id,
    srs: {
      oldStability: Math.round(oldStability * 10) / 10,
      newStability: Math.round(newStability * 10) / 10,
      nextReviewAt: nextReview.toISOString(),
      masteryPct: Math.min(100, Math.round((newStability / MASTERY_THRESHOLD) * 100)),
    },
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const attemptId = searchParams.get("id");
  if (!attemptId) {
    return NextResponse.json({ error: "Missing attempt id" }, { status: 400 });
  }

  // Verify the attempt belongs to the user
  const [attempt] = await db
    .select({ id: attempts.id, problemId: attempts.problemId, userId: attempts.userId })
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .limit(1);

  if (!attempt || attempt.userId !== session.user.id) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  // Delete the attempt
  await db.delete(attempts).where(eq(attempts.id, attemptId));

  // Find remaining attempts for this problem
  const remainingAttempts = await db
    .select()
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, session.user.id),
        eq(attempts.problemId, attempt.problemId),
      ),
    )
    .orderBy(attempts.createdAt);

  if (remainingAttempts.length === 0) {
    // No more attempts — delete the user problem state
    await db
      .delete(userProblemStates)
      .where(
        and(
          eq(userProblemStates.userId, session.user.id),
          eq(userProblemStates.problemId, attempt.problemId),
        ),
      );
  } else {
    // Replay remaining attempts to rebuild state
    const problem = await db.select().from(problems).where(eq(problems.id, attempt.problemId)).limit(1);
    if (!problem[0]) {
      return NextResponse.json({ ok: true });
    }

    let stability = 0;
    let bestQuality: string | null = null;

    for (let i = 0; i < remainingAttempts.length; i++) {
      const a = remainingAttempts[i];
      const solvedAlone = a.solvedIndependently === "YES";
      const signals: AttemptSignals = {
        solvedIndependently: a.solvedIndependently as SolvedIndependently,
        solutionQuality: a.solutionQuality as SolutionQuality,
        rewroteFromScratch: a.rewroteFromScratch as RewroteFromScratch | null,
        timeComplexityCorrect: a.timeComplexityCorrect,
        spaceComplexityCorrect: a.spaceComplexityCorrect,
        confidence: a.confidence,
        solveTimeMinutes: a.solveTimeMinutes,
        difficulty: problem[0].difficulty,
      };

      if (i === 0) {
        stability = computeInitialStability(signals);
      } else {
        stability = computeNewStability(stability, signals);
      }

      if (rankQuality(a.solutionQuality) > rankQuality(bestQuality)) {
        bestQuality = a.solutionQuality;
      }
    }

    const lastAttempt = remainingAttempts[remainingAttempts.length - 1];
    const lastSignals: AttemptSignals = {
      solvedIndependently: lastAttempt.solvedIndependently as SolvedIndependently,
      solutionQuality: lastAttempt.solutionQuality as SolutionQuality,
      rewroteFromScratch: lastAttempt.rewroteFromScratch as RewroteFromScratch | null,
      timeComplexityCorrect: lastAttempt.timeComplexityCorrect,
      spaceComplexityCorrect: lastAttempt.spaceComplexityCorrect,
      confidence: lastAttempt.confidence,
      solveTimeMinutes: lastAttempt.solveTimeMinutes,
      difficulty: problem[0].difficulty,
    };

    const isFailed = lastAttempt.solvedIndependently === "NO";
    const isStruggled = lastAttempt.solvedIndependently === "PARTIAL" && lastAttempt.confidence <= 2;
    const lastDate = lastAttempt.createdAt;
    const nextReview = isFailed
      ? lastDate
      : isStruggled
        ? new Date(lastDate.getTime() + 24 * 60 * 60 * 1000)
        : computeNextReviewDate(stability, lastDate);

    await db
      .update(userProblemStates)
      .set({
        stability,
        lastReviewedAt: lastDate,
        nextReviewAt: nextReview,
        totalAttempts: remainingAttempts.length,
        bestSolutionQuality: bestQuality as typeof userProblemStates.$inferInsert.bestSolutionQuality,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userProblemStates.userId, session.user.id),
          eq(userProblemStates.problemId, attempt.problemId),
        ),
      );
  }

  return NextResponse.json({ ok: true });
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

function rankQuality(q: string | null): number {
  const ranks: Record<string, number> = { OPTIMAL: 4, SUBOPTIMAL: 3, BRUTE_FORCE: 2, NONE: 1 };
  return ranks[q ?? ""] ?? 0;
}
