import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  smallint,
  real,
  timestamp,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";

/* ── Enums ── */

export const difficultyEnum = pgEnum("difficulty", [
  "Easy",
  "Medium",
  "Hard",
]);

export const listSourceEnum = pgEnum("list_source", [
  "NEETCODE_150",
  "NEETCODE_250",
  "CUSTOM",
]);

export const solvedEnum = pgEnum("solved_independently", [
  "YES",
  "PARTIAL",
  "NO",
]);

export const qualityEnum = pgEnum("solution_quality", [
  "OPTIMAL",
  "SUBOPTIMAL",
  "BRUTE_FORCE",
  "NONE",
]);

export const rewroteEnum = pgEnum("rewrote_from_scratch", [
  "YES",
  "NO",
  "DID_NOT_ATTEMPT",
]);

export const attemptSourceEnum = pgEnum("attempt_source", [
  "manual",
  "import",
  "github",
]);

export const pendingStatusEnum = pgEnum("pending_status", [
  "pending",
  "confirmed",
  "dismissed",
]);

/* ── Users (NextAuth compatible) ── */

export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  targetDate: date("target_date"),
  autoDeferHards: boolean("auto_defer_hards").notNull().default(false),
  githubRepo: varchar("github_repo", { length: 255 }),
  githubWebhookSecret: varchar("github_webhook_secret", { length: 255 }),
  githubConnectedAt: timestamp("github_connected_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("account", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  id_token: text("id_token"),
  session_state: varchar("session_state", { length: 255 }),
});

export const sessions = pgTable("session", {
  sessionToken: varchar("session_token", { length: 255 })
    .notNull()
    .primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_token", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

/* ── Problems ── */

export const problems = pgTable("problem", {
  id: integer("id").primaryKey(),
  leetcodeNumber: integer("leetcode_number").unique(),
  title: varchar("title", { length: 255 }).notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  leetcodeUrl: text("leetcode_url").notNull(),
  neetcodeUrl: text("neetcode_url"),
  videoId: varchar("video_id", { length: 20 }),
  listSource: listSourceEnum("list_source").notNull().default("NEETCODE_150"),
  blind75: boolean("blind75").notNull().default(false),
  optimalTimeComplexity: varchar("optimal_time_complexity", { length: 50 }),
  optimalSpaceComplexity: varchar("optimal_space_complexity", { length: 50 }),
});

/* ── Attempts ── */

export const attempts = pgTable("attempt", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  solvedIndependently: solvedEnum("solved_independently").notNull(),
  solutionQuality: qualityEnum("solution_quality").notNull(),
  userTimeComplexity: varchar("user_time_complexity", { length: 50 }).notNull(),
  userSpaceComplexity: varchar("user_space_complexity", {
    length: 50,
  }).notNull(),
  timeComplexityCorrect: boolean("time_complexity_correct"),
  spaceComplexityCorrect: boolean("space_complexity_correct"),
  solveTimeMinutes: integer("solve_time_minutes"),
  studyTimeMinutes: integer("study_time_minutes"),
  rewroteFromScratch: rewroteEnum("rewrote_from_scratch"),
  confidence: smallint("confidence").notNull(),
  code: text("code"),
  notes: text("notes"),
  source: attemptSourceEnum("source").notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ── User Problem State (spaced repetition state) ── */

export const userProblemStates = pgTable("user_problem_state", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  stability: real("stability").notNull().default(0.5),
  lastReviewedAt: timestamp("last_reviewed_at"),
  nextReviewAt: timestamp("next_review_at"),
  deferredUntil: timestamp("deferred_until"),
  totalAttempts: integer("total_attempts").notNull().default(0),
  bestSolutionQuality: qualityEnum("best_solution_quality"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ── Pending Submissions (from GitHub webhook) ── */

export const pendingSubmissions = pgTable("pending_submission", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  commitSha: varchar("commit_sha", { length: 40 }).notNull(),
  code: text("code"),
  isReview: boolean("is_review").notNull().default(false),
  status: pendingStatusEnum("status").notNull().default("pending"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});
