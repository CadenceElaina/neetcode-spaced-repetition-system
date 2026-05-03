"use client";

import { useState } from "react";
import type { CategoryStat, ProblemCohortStat } from "@/lib/analytics";

export interface AdminData {
  overview: {
    totalUsers:        number;
    newThisWeek:       number;
    newThisMonth:      number;
    activeUsers7d:     number;
    activeUsers30d:    number;
    totalAttempts:     number;
    demoUsersExcluded: number;
  };
  users: Array<{
    id:               string;
    name:             string | null;
    email:            string | null;
    createdAt:        string;
    lastActive:       string | null;
    attemptCount:     number;
    problemsAttempted: number;
    optimalCount:     number;
  }>;
  cohortProblems: Array<ProblemCohortStat & {
    title:      string;
    difficulty: string;
    category:   string;
  }>;
  categoryStats: CategoryStat[];
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function pct(n: number) { return `${(n * 100).toFixed(0)}%`; }

const DIFF_COLOR: Record<string, string> = {
  Easy:   "text-green-400",
  Medium: "text-amber-400",
  Hard:   "text-red-400",
};

export function AdminClient({ data }: { data: AdminData }) {
  const { overview, users, cohortProblems, categoryStats } = data;
  const [activeTab, setActiveTab] = useState<"users" | "cohort" | "categories">("users");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Site analytics
          {overview.demoUsersExcluded > 0 && (
            <span className="ml-1 text-muted-foreground/60">
              — {overview.demoUsersExcluded} demo seed users excluded
            </span>
          )}
        </p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={overview.totalUsers}
          sub={overview.newThisWeek > 0 ? `+${overview.newThisWeek} this week` : "all time"}
        />
        <StatCard label="Active 7d"      value={overview.activeUsers7d}  sub="unique users with attempts" />
        <StatCard label="Active 30d"     value={overview.activeUsers30d} sub="unique users with attempts" />
        <StatCard label="Total Attempts" value={overview.totalAttempts.toLocaleString()} sub="all time" />
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border/60">
        <nav className="-mb-px flex gap-6" aria-label="Admin sections">
          {(["users", "cohort", "categories"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "cohort" ? "Cohort Problems" : tab === "categories" ? "Categories" : "Users"}
            </button>
          ))}
        </nav>
      </div>

      {/* Users tab */}
      {activeTab === "users" && (
        <section>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/30">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Last Active</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Attempts</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Problems</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Optimal</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground">{u.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {relativeTime(u.lastActive)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {u.attemptCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {u.problemsAttempted}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {u.optimalCount}
                        {u.problemsAttempted > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground/60">
                            ({pct(u.optimalCount / u.problemsAttempted)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Cohort problems tab */}
      {activeTab === "cohort" && (
        <section>
          <p className="mb-3 text-xs text-muted-foreground">
            Sorted by no-outcome rate (high = many students couldn&apos;t solve it). Showing problems attempted by at least 2 users.
          </p>
          {cohortProblems.filter((p) => p.enrolledStudentsAttempted >= 2).length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough cohort data yet — need ≥2 users to have attempted the same problem.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/30">
                  <tr>
                    <th className="px-4 py-2.5 text-left   text-xs font-medium text-muted-foreground">Problem</th>
                    <th className="px-4 py-2.5 text-left   text-xs font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-2.5 text-right  text-xs font-medium text-muted-foreground">Students</th>
                    <th className="px-4 py-2.5 text-right  text-xs font-medium text-muted-foreground">Optimal %</th>
                    <th className="px-4 py-2.5 text-right  text-xs font-medium text-muted-foreground">No-outcome %</th>
                    <th className="px-4 py-2.5 text-right  text-xs font-medium text-muted-foreground">Avg to Optimal</th>
                    <th className="px-4 py-2.5 text-right  text-xs font-medium text-muted-foreground">Avg R</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {cohortProblems
                    .filter((p) => p.enrolledStudentsAttempted >= 2)
                    .map((p) => (
                      <tr key={p.problemId} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{p.title}</p>
                          <p className={`text-xs ${DIFF_COLOR[p.difficulty]}`}>{p.difficulty}</p>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{p.category}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {p.enrolledStudentsAttempted}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-green-400">
                          {pct(p.pctAchievedOptimal)}
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${
                          p.noOutcomeRate > 0.3 ? "text-red-400" : p.noOutcomeRate > 0.15 ? "text-amber-400" : "text-muted-foreground"
                        }`}>
                          {pct(p.noOutcomeRate)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {p.avgAttemptsToOptimal != null ? p.avgAttemptsToOptimal.toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {pct(p.avgR)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Categories tab */}
      {activeTab === "categories" && (
        <section>
          <p className="mb-3 text-xs text-muted-foreground">
            All users merged. Sorted by retention — weakest categories first.
          </p>
          {categoryStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attempt data yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/30">
                  <tr>
                    <th className="px-4 py-2.5 text-left  text-xs font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Problems</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Avg Retention</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Stuck</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Complexity Acc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {categoryStats.map((c) => (
                    <tr key={c.category} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium text-foreground">{c.category}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{c.attemptedProblems}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className={
                          c.avgR >= 0.75 ? "text-green-400"
                          : c.avgR >= 0.55 ? "text-amber-400"
                          : "text-red-400"
                        }>
                          {pct(c.avgR)}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${c.stuckCount > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                        {c.stuckCount}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {pct(c.complexityAccuracyRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
