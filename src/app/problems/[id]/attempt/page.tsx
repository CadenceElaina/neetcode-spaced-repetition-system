import { db } from "@/db";
import { problems, userProblemStates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AttemptForm } from "./attempt-form";
import { auth } from "@/auth";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(problems).where(eq(problems.id, Number(id))).limit(1);
  if (!rows[0]) return { title: "Not Found — Aurora" };
  return { title: `Log Attempt — ${rows[0].title} — Aurora` };
}

export default async function AttemptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ attemptDate?: string }> }) {
  const { id } = await params;
  const { attemptDate } = await searchParams;
  const rows = await db.select().from(problems).where(eq(problems.id, Number(id))).limit(1);
  const problem = rows[0];
  if (!problem) notFound();

  const session = await auth();
  let isReview = false;
  if (session?.user?.id) {
    const existing = await db
      .select({ id: userProblemStates.id })
      .from(userProblemStates)
      .where(
        and(
          eq(userProblemStates.userId, session.user.id),
          eq(userProblemStates.problemId, problem.id),
        ),
      )
      .limit(1);
    isReview = existing.length > 0;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Log Attempt</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {problem.leetcodeNumber}. {problem.title}
        </p>
      </div>
      <AttemptForm
        problemId={problem.id}
        problemTitle={problem.title}
        leetcodeNumber={problem.leetcodeNumber}
        isReview={isReview}
        defaultAttemptDate={attemptDate ?? null}
      />
    </div>
  );
}
