import { db } from "@/db";
import { problems, userProblemStates, attempts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ExternalLink } from "lucide-react";
import { VideoEmbed } from "@/components/video-embed";
import { ProblemNotes } from "@/components/problem-notes";
import { DeleteAttemptButton } from "@/components/delete-attempt-button";
import { auth } from "@/auth";
import { computeRetrievability } from "@/lib/srs";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problem = await db.select().from(problems).where(eq(problems.id, Number(id))).limit(1);
  if (!problem[0]) return { title: "Not Found — Aurora" };
  return { title: `${problem[0].title} — Aurora` };
}

export default async function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(problems).where(eq(problems.id, Number(id))).limit(1);
  const problem = rows[0];
  if (!problem) notFound();

  const session = await auth();
  let initialNotes = "";
  let srsState: {
    retention: number;
    stability: number;
    totalAttempts: number;
    nextReviewAt: Date | null;
    lastReviewedAt: Date | null;
    bestQuality: string | null;
  } | null = null;
  let recentAttempts: {
    id: string;
    createdAt: Date;
    solvedIndependently: string;
    solutionQuality: string;
    confidence: number;
    solveTimeMinutes: number | null;
    timeCorrect: boolean | null;
    spaceCorrect: boolean | null;
  }[] = [];

  if (session?.user?.id) {
    const [stateRows, attemptRows] = await Promise.all([
      db
        .select()
        .from(userProblemStates)
        .where(
          and(
            eq(userProblemStates.userId, session.user.id),
            eq(userProblemStates.problemId, problem.id),
          ),
        )
        .limit(1),
      db
        .select({
          id: attempts.id,
          createdAt: attempts.createdAt,
          solvedIndependently: attempts.solvedIndependently,
          solutionQuality: attempts.solutionQuality,
          confidence: attempts.confidence,
          solveTimeMinutes: attempts.solveTimeMinutes,
          timeCorrect: attempts.timeComplexityCorrect,
          spaceCorrect: attempts.spaceComplexityCorrect,
        })
        .from(attempts)
        .where(
          and(
            eq(attempts.userId, session.user.id),
            eq(attempts.problemId, problem.id),
          ),
        )
        .orderBy(desc(attempts.createdAt))
        .limit(10),
    ]);

    initialNotes = stateRows[0]?.notes ?? "";

    if (stateRows[0]) {
      const s = stateRows[0];
      const daysSince = s.lastReviewedAt
        ? (Date.now() - s.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      srsState = {
        retention: computeRetrievability(s.stability, daysSince),
        stability: s.stability,
        totalAttempts: s.totalAttempts,
        nextReviewAt: s.nextReviewAt,
        lastReviewedAt: s.lastReviewedAt,
        bestQuality: s.bestSolutionQuality,
      };
    }

    recentAttempts = attemptRows;
  }

  const retentionLabel = srsState
    ? srsState.retention >= 0.8 ? "Strong" : srsState.retention >= 0.6 ? "Good" : srsState.retention >= 0.4 ? "Fading" : srsState.retention >= 0.2 ? "Weak" : "Critical"
    : null;
  const retentionColor = srsState
    ? srsState.retention >= 0.8 ? "text-green-500" : srsState.retention >= 0.6 ? "text-emerald-400" : srsState.retention >= 0.4 ? "text-amber-500" : srsState.retention >= 0.2 ? "text-orange-500" : "text-red-500"
    : "";

  const now = new Date();
  const nextReviewText = srsState?.nextReviewAt
    ? srsState.nextReviewAt <= now
      ? "Due now"
      : `In ${Math.ceil((srsState.nextReviewAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {problem.leetcodeNumber}. {problem.title}
          </h1>
          <DifficultyBadge difficulty={problem.difficulty} />
          {problem.blind75 && (
            <span className="inline-flex items-center rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-500">
              Blind 75
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{problem.category}</p>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3">
        {problem.neetcodeUrl && (
          <a
            href={problem.neetcodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
          >
            <ExternalLink size={14} />
            Open on NeetCode
          </a>
        )}
        <a
          href={problem.leetcodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm text-foreground transition-colors duration-150 hover:bg-muted"
        >
          <ExternalLink size={14} />
          Open on LeetCode
        </a>
        {problem.videoId && (
          <VideoEmbed videoId={problem.videoId} />
        )}
      </div>

      {/* Complexity + SRS State */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted p-4">
          <h2 className="mb-3 text-lg font-semibold">Optimal Complexity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="font-mono text-sm">{problem.optimalTimeComplexity ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Space</p>
              <p className="font-mono text-sm">{problem.optimalSpaceComplexity ?? "—"}</p>
            </div>
          </div>
        </div>

        {srsState && (
          <div className="rounded-lg border border-border bg-muted p-4">
            <h2 className="mb-3 text-lg font-semibold">Your Progress</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Retention</p>
                <p className={`text-sm font-medium ${retentionColor}`}>
                  {Math.round(srsState.retention * 100)}% · {retentionLabel}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next Review</p>
                <p className={`text-sm font-medium ${nextReviewText === "Due now" ? "text-red-500" : "text-foreground"}`}>
                  {nextReviewText ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Attempts</p>
                <p className="text-sm">{srsState.totalAttempts}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best Quality</p>
                <p className="text-sm">{srsState.bestQuality ?? "—"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attempt History */}
      {recentAttempts.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Attempt History</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Outcome</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Quality</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Confidence</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Complexity</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2 text-muted-foreground">
                      {a.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      <span className="ml-1 text-xs opacity-60">
                        {a.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={
                        a.solvedIndependently === "YES" ? "text-green-500" :
                        a.solvedIndependently === "PARTIAL" ? "text-amber-500" :
                        "text-red-500"
                      }>
                        {a.solvedIndependently === "YES" ? "Solved" : a.solvedIndependently === "PARTIAL" ? "Partial" : "No solve"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {a.solutionQuality === "NONE" ? "—" : a.solutionQuality === "OPTIMAL" ? "Optimal" : a.solutionQuality === "BRUTE_FORCE" ? "Brute Force" : a.solutionQuality}
                    </td>
                    <td className="px-4 py-2">{a.confidence}/5</td>
                    <td className="px-4 py-2 text-muted-foreground">{a.solveTimeMinutes ? `${a.solveTimeMinutes}m` : "—"}</td>
                    <td className="px-4 py-2">
                      {a.timeCorrect !== null ? (
                        <span className={a.timeCorrect && a.spaceCorrect ? "text-green-500" : "text-orange-500"}>
                          {a.timeCorrect ? "T✓" : "T✗"} {a.spaceCorrect ? "S✓" : "S✗"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <DeleteAttemptButton attemptId={a.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {session?.user?.id && (
        <ProblemNotes problemId={problem.id} initialNotes={initialNotes} />
      )}

      {/* Log Attempt CTA */}
      <Link
        href={`/problems/${problem.id}/attempt`}
        className={`inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm transition-colors duration-150 hover:opacity-90 ${
          srsState && srsState.nextReviewAt && srsState.nextReviewAt <= now
            ? "bg-red-500 text-white"
            : "bg-accent text-accent-foreground"
        }`}
      >
        {srsState
          ? srsState.nextReviewAt && srsState.nextReviewAt <= now
            ? "Review Now (Due)"
            : "Log Attempt"
          : "Start First Attempt"
        }
      </Link>
    </div>
  );
}
