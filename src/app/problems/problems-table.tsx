"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";

type Problem = {
  id: number;
  leetcodeNumber: number | null;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  leetcodeUrl: string;
  neetcodeUrl: string | null;
  videoId: string | null;
  listSource: "NEETCODE_150" | "NEETCODE_250" | "CUSTOM";
  blind75: boolean;
  optimalTimeComplexity: string | null;
  optimalSpaceComplexity: string | null;
};

type ProblemState = {
  retention: number;
  totalAttempts: number;
  lastReviewed: string | null;
};

const ALL = "All";

function statusLabel(r: number): { label: string; className: string } {
  if (r >= 0.8) return { label: "Strong", className: "text-green-500" };
  if (r >= 0.6) return { label: "Good", className: "text-emerald-400" };
  if (r >= 0.4) return { label: "Fading", className: "text-amber-500" };
  if (r >= 0.2) return { label: "Weak", className: "text-orange-500" };
  return { label: "Critical", className: "text-red-500" };
}

export function ProblemsTable({
  problems,
  problemStates,
}: {
  problems: Problem[];
  problemStates: Record<number, ProblemState>;
}) {
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [blind75Only, setBlind75Only] = useState(false);

  const categories = useMemo(
    () => [...new Set(problems.map((p) => p.category))],
    [problems],
  );

  const filtered = useMemo(() => {
    return problems.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !String(p.leetcodeNumber).includes(search)) return false;
      if (difficultyFilter !== ALL && p.difficulty !== difficultyFilter) return false;
      if (categoryFilter !== ALL && p.category !== categoryFilter) return false;
      if (blind75Only && !p.blind75) return false;

      const state = problemStates[p.id];
      if (statusFilter === "New" && state) return false;
      if (statusFilter === "Attempted" && !state) return false;
      if (statusFilter === "Strong" && (!state || state.retention < 0.8)) return false;
      if (statusFilter === "Fading" && (!state || state.retention >= 0.6 || state.retention < 0.2)) return false;
      if (statusFilter === "Weak" && (!state || state.retention >= 0.4)) return false;

      return true;
    });
  }, [problems, problemStates, search, difficultyFilter, categoryFilter, statusFilter, blind75Only]);

  const inputClass = "h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by title or number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-64 placeholder:text-muted-foreground ${inputClass}`}
        />
        <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className={inputClass}>
          <option value={ALL}>All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClass}>
          <option value={ALL}>All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value={ALL}>All Status</option>
          <option value="New">New</option>
          <option value="Attempted">Attempted</option>
          <option value="Strong">Strong (R ≥ 80%)</option>
          <option value="Fading">Fading (R 20–60%)</option>
          <option value="Weak">Weak (R &lt; 40%)</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={blind75Only}
            onChange={(e) => setBlind75Only(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Blind 75 only
        </label>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {problems.length} problems
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Difficulty</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Last</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const state = problemStates[p.id];
              const status = state ? statusLabel(state.retention) : null;
              return (
                <tr key={p.id} className="border-b border-border transition-colors duration-150 hover:bg-muted">
                  <td className="px-4 py-3 text-muted-foreground">{p.leetcodeNumber}</td>
                  <td className="px-4 py-3">
                    <Link href={`/problems/${p.id}`} className="text-accent hover:underline">
                      {p.title}
                    </Link>
                    {p.blind75 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-500">
                        75
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3"><DifficultyBadge difficulty={p.difficulty} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3">
                    {state ? (
                      <span className={`text-xs font-medium ${status!.className}`}>
                        {status!.label}
                        <span className="ml-1 text-muted-foreground font-normal">({state.totalAttempts})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">New</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {state?.lastReviewed ? formatDate(state.lastReviewed) : "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No problems match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
