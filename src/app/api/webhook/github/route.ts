import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, problems, pendingSubmissions, userProblemStates, attempts } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import crypto from "crypto";

/**
 * GitHub webhook endpoint for NeetCode submission sync.
 * Receives push events, parses commit messages (format: "Add: {slug} - submission-{N}"),
 * matches slugs to problems, and creates pending submissions for user confirmation.
 */
export async function POST(req: NextRequest) {
  const event = req.headers.get("x-github-event");
  if (event === "ping") {
    return NextResponse.json({ ok: true, message: "pong" });
  }
  if (event !== "push") {
    return NextResponse.json({ ok: true, message: "ignored" });
  }

  // Read raw body for signature verification
  const rawBody = await req.text();
  let payload: GitHubPushPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repoFullName = payload.repository?.full_name;
  if (!repoFullName) {
    return NextResponse.json({ error: "Missing repository info" }, { status: 400 });
  }

  // Find the user who registered this repo
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.githubRepo, repoFullName))
    .limit(1);

  if (!user || !user.githubWebhookSecret) {
    return NextResponse.json({ error: "No user registered for this repo" }, { status: 404 });
  }

  // Verify HMAC signature
  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const expected = "sha256=" + crypto
    .createHmac("sha256", user.githubWebhookSecret)
    .update(rawBody)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only process commits after user connected
  const connectedAt = user.githubConnectedAt;

  // Build slug → problemId map from neetcodeUrl
  const allProblems = await db.select({ id: problems.id, neetcodeUrl: problems.neetcodeUrl }).from(problems);
  const slugMap = new Map<string, number>();
  for (const p of allProblems) {
    if (p.neetcodeUrl) {
      const slug = p.neetcodeUrl.split("/problems/")[1]?.replace(/\/$/, "");
      if (slug) slugMap.set(slug, p.id);
    }
  }

  // Check which problems user already has attempts for (to tag as review)
  const existingStates = await db
    .select({ problemId: userProblemStates.problemId })
    .from(userProblemStates)
    .where(eq(userProblemStates.userId, user.id));
  const attemptedProblemIds = new Set(existingStates.map((s) => s.problemId));

  // Parse commits
  const created: string[] = [];
  const skipped: string[] = [];

  for (const commit of payload.commits ?? []) {
    // Skip commits before connection time
    if (connectedAt && new Date(commit.timestamp) < connectedAt) {
      skipped.push(commit.id);
      continue;
    }

    // Parse commit message: "Add: {slug} - submission-{N}"
    const match = commit.message.match(/^Add:\s+(.+?)\s+-\s+submission-\d+/i);
    if (!match) {
      skipped.push(commit.id);
      continue;
    }

    const slug = match[1].trim();
    const problemId = slugMap.get(slug);
    if (!problemId) {
      skipped.push(commit.id);
      continue;
    }

    // Check for duplicate pending submission (same commit SHA)
    const [existingPending] = await db
      .select({ id: pendingSubmissions.id })
      .from(pendingSubmissions)
      .where(
        and(
          eq(pendingSubmissions.userId, user.id),
          eq(pendingSubmissions.commitSha, commit.id),
        ),
      )
      .limit(1);

    if (existingPending) {
      skipped.push(commit.id);
      continue;
    }

    // Skip if there's already an unresolved pending for this problem
    const [unresolvedPending] = await db
      .select({ id: pendingSubmissions.id })
      .from(pendingSubmissions)
      .where(
        and(
          eq(pendingSubmissions.userId, user.id),
          eq(pendingSubmissions.problemId, problemId),
          eq(pendingSubmissions.status, "pending"),
        ),
      )
      .limit(1);

    if (unresolvedPending) {
      skipped.push(commit.id);
      continue;
    }

    // Time-window dedup: skip if user already has an attempt for this problem within last 60 min
    const commitTime = new Date(commit.timestamp);
    const windowStart = new Date(commitTime.getTime() - 60 * 60 * 1000);

    const [recentAttempt] = await db
      .select({ id: attempts.id })
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, user.id),
          eq(attempts.problemId, problemId),
          gte(attempts.createdAt, windowStart),
        ),
      )
      .limit(1);

    if (recentAttempt) {
      skipped.push(commit.id);
      continue;
    }

    // Extract code from added/modified files if available
    // (GitHub push payloads don't include file content — we'd need the API for that.
    //  For now, code will be null. Users can paste it during confirmation.)

    const isReview = attemptedProblemIds.has(problemId);

    await db.insert(pendingSubmissions).values({
      userId: user.id,
      problemId,
      commitSha: commit.id,
      code: null,
      isReview,
      detectedAt: new Date(commit.timestamp),
    });

    // If this was a new problem, add it to the attempted set for subsequent commits in this batch
    attemptedProblemIds.add(problemId);
    created.push(commit.id);
  }

  return NextResponse.json({ created: created.length, skipped: skipped.length });
}

/* ── Types for GitHub push webhook payload ── */

type GitHubPushPayload = {
  ref?: string;
  repository?: { full_name: string };
  commits?: {
    id: string;
    message: string;
    timestamp: string;
    added?: string[];
    modified?: string[];
  }[];
};
