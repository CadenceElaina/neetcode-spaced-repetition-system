import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const ADVISORY_THRESHOLDS = ["relaxed", "moderate", "strict"] as const;
type AdvisoryThreshold = typeof ADVISORY_THRESHOLDS[number];

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { dailyTimeBudgetMinutes, newPerSession, advisoryThreshold } = body;

  const update: Partial<typeof users.$inferInsert> = {};

  if (dailyTimeBudgetMinutes !== undefined) {
    if (
      !Number.isInteger(dailyTimeBudgetMinutes) ||
      dailyTimeBudgetMinutes < 15 ||
      dailyTimeBudgetMinutes > 480
    ) {
      return NextResponse.json(
        { error: "dailyTimeBudgetMinutes must be an integer between 15 and 480" },
        { status: 400 },
      );
    }
    update.dailyTimeBudgetMinutes = dailyTimeBudgetMinutes;
  }

  if (newPerSession !== undefined) {
    if (!Number.isInteger(newPerSession) || newPerSession < 0 || newPerSession > 3) {
      return NextResponse.json(
        { error: "newPerSession must be an integer between 0 and 3" },
        { status: 400 },
      );
    }
    update.newPerSession = newPerSession;
  }

  if (advisoryThreshold !== undefined) {
    if (!ADVISORY_THRESHOLDS.includes(advisoryThreshold as AdvisoryThreshold)) {
      return NextResponse.json(
        { error: "advisoryThreshold must be relaxed, moderate, or strict" },
        { status: 400 },
      );
    }
    update.advisoryThreshold = advisoryThreshold;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.update(users).set(update).where(eq(users.id, session.user.id));

  return NextResponse.json(update);
}
