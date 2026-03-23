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

  // Compare complexities
  const optTime = problem[0].optimalTimeComplexity;
  const optSpace = problem[0].optimalSpaceComplexity;
  const timeCorrect = isNoSolution ? null : (optTime ? normalize(finalTimeComplexity) === normalize(optTime) : null);
  const spaceCorrect = isNoSolution ? null : (optSpace ? normalize(finalSpaceComplexity) === normalize(optSpace) : null);

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

  if (existing[0]) {
    const newStability = computeNewStability(existing[0].stability, signals);
    const nextReview = computeNextReviewDate(newStability, now);

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
    const initialStability = computeInitialStability(signals);
    const nextReview = computeNextReviewDate(initialStability, now);

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

  return NextResponse.json({ id: attempt.id }, { status: 201 });
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

function rankQuality(q: string | null): number {
  const ranks: Record<string, number> = { OPTIMAL: 4, SUBOPTIMAL: 3, BRUTE_FORCE: 2, NONE: 1 };
  return ranks[q ?? ""] ?? 0;
}
