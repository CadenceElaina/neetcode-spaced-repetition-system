import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { userProblemStates } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const VALID_SKIP_REASONS = ["too_easy", "wrong_timing", "wrong_category"] as const;
const VALID_FEEDBACK = ["too_early", "too_late"] as const;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { problemId, action } = body;

  if (typeof problemId !== "number") {
    return NextResponse.json({ error: "Invalid problemId" }, { status: 400 });
  }

  const [state] = await db
    .select()
    .from(userProblemStates)
    .where(
      and(
        eq(userProblemStates.userId, session.user.id),
        eq(userProblemStates.problemId, problemId),
      ),
    )
    .limit(1);

  if (!state) {
    return NextResponse.json({ error: "No state found for this problem" }, { status: 404 });
  }

  const now = new Date();

  if (action === "skip") {
    const reason = body.reason;
    if (!VALID_SKIP_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid skip reason" }, { status: 400 });
    }

    // Push the problem back by 1 day (lower priority) — it re-enters the queue tomorrow
    const postponeHours = reason === "too_easy" ? 72 : 24; // "too easy" gets 3 days
    const newNextReview = new Date(now.getTime() + postponeHours * 60 * 60 * 1000);

    await db
      .update(userProblemStates)
      .set({
        nextReviewAt: newNextReview,
        updatedAt: now,
      })
      .where(eq(userProblemStates.id, state.id));

    return NextResponse.json({ ok: true, nextReviewAt: newNextReview.toISOString() });
  }

  if (action === "feedback") {
    const feedback = body.feedback;
    if (!VALID_FEEDBACK.includes(feedback)) {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
    }

    // Adjust stability based on feedback
    let newStability = state.stability;
    if (feedback === "too_early") {
      // User says this came back too soon — increase stability by 30%
      newStability = Math.min(365, state.stability * 1.3);
    } else if (feedback === "too_late") {
      // User says this came back too late — decrease stability by 20%
      newStability = Math.max(0.5, state.stability * 0.8);
    }

    const newNextReview = new Date(now.getTime() + newStability * 24 * 60 * 60 * 1000);

    await db
      .update(userProblemStates)
      .set({
        stability: newStability,
        nextReviewAt: newNextReview,
        updatedAt: now,
      })
      .where(eq(userProblemStates.id, state.id));

    return NextResponse.json({ ok: true, newStability, nextReviewAt: newNextReview.toISOString() });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
