"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { LogAttemptModal } from "@/components/log-attempt-modal";

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
  bestQuality: string | null;
};

const ALL = "All";
const MIN_PAGE_SIZE = 5;
const DEFAULT_PAGE_SIZE = 15;
// Average rendered row height in px (cell py-3 + text + border). Measured, not assumed —
// if row density changes the constant needs updating.
const ROW_HEIGHT_PX = 49;
const TABLE_HEADER_PX = 41;
// Space reserved below the table for pagination controls + page bottom padding.
const BOTTOM_RESERVE_PX = 140;

function statusLabel(r: number, bestQuality?: string | null): { label: string; className: string } {
  if (bestQuality === "NONE") return { label: "Unsolved", className: "text-red-500" };
  if (r >= 0.8) return { label: "Strong", className: "text-green-500" };
  if (r >= 0.6) return { label: "Good", className: "text-emerald-400" };
  if (r >= 0.4) return { label: "Fading", className: "text-amber-500" };
  if (r >= 0.2) return { label: "Weak", className: "text-orange-500" };
  return { label: "Critical", className: "text-red-500" };
}

export function ProblemsTable({
  problems,
  problemStates,
  initialCategory,
  initialDifficulty,
  initialStatus,
}: {
  problems: Problem[];
  problemStates: Record<number, ProblemState>;
  initialCategory?: string;
  initialDifficulty?: string;
  initialStatus?: string;
}) {
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>(initialDifficulty ?? ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory ?? ALL);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus ?? ALL);
  const [blind75Only, setBlind75Only] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [logModalProblem, setLogModalProblem] = useState<Problem | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  // Default Blind-75 filter based on the user's chosen goal (set during onboarding).
  // Runs once on mount to avoid SSR/client hydration mismatch.
  useEffect(() => {
    const goal = typeof window !== "undefined" ? localStorage.getItem("srs_goal_type") : null;
    if (goal === "blind75") setBlind75Only(true);
  }, []);

  // Size the page so the whole table fits in the viewport without scrolling.
  // Measures the table wrapper's top (relative to viewport) and the remaining
  // vertical space, then divides by row height.
  useEffect(() => {
    function recompute() {
      const el = tableWrapperRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const available = window.innerHeight - top - BOTTOM_RESERVE_PX - TABLE_HEADER_PX;
      const rows = Math.floor(available / ROW_HEIGHT_PX);
      setPageSize(Math.max(MIN_PAGE_SIZE, rows));
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visible = filtered.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, difficultyFilter, categoryFilter, statusFilter, blind75Only, pageSize]);

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
          {filtered.length === problems.length
            ? `${problems.length} problems`
            : `${filtered.length} of ${problems.length} problems`}
        </span>
      </div>

      {/* Table */}
      <div ref={tableWrapperRef} className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Difficulty</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span className="flex items-center gap-1">
                  Status
                  <StatusInfoTooltip />
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Last</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const state = problemStates[p.id];
              const status = state ? statusLabel(state.retention, state.bestQuality) : null;
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
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setLogModalProblem(p)}
                      className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      Log
                    </button>
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

      {/* Log Attempt Modal */}
      {logModalProblem && (
        <LogAttemptModal
          problem={{
            problemId: logModalProblem.id,
            title: logModalProblem.title,
            leetcodeNumber: logModalProblem.leetcodeNumber,
            difficulty: logModalProblem.difficulty,
            isReview: false,
          }}
          onClose={() => setLogModalProblem(null)}
          onLogged={() => setLogModalProblem(null)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageStart={pageStart}
          pageEnd={Math.min(pageStart + pageSize, filtered.length)}
          total={filtered.length}
          onChange={setPage}
        />
      )}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  pageStart,
  pageEnd,
  total,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pageButtons = buildPageList(currentPage, totalPages);
  const btnBase = "inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-xs transition-colors";

  return (
    <nav
      aria-label="Problems pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
    >
      <p className="text-xs text-muted-foreground">
        Showing <span className="text-foreground font-medium">{pageStart + 1}</span>–
        <span className="text-foreground font-medium">{pageEnd}</span> of{" "}
        <span className="text-foreground font-medium">{total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`${btnBase} border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
        >
          Prev
        </button>
        {pageButtons.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className={`${btnBase} text-muted-foreground/60`} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={`${btnBase} ${
                p === currentPage
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`${btnBase} border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

/** Build a compact page list with ellipses: e.g. [1, "…", 4, 5, 6, "…", 12]. */
function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusInfoTooltip() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const updatePos = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    }
  }, []);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => { updatePos(); setOpen(true); }}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-muted-foreground/40 text-[9px] text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors cursor-help"
        aria-label="Status info"
      >
        i
      </span>
      {open && pos && createPortal(
        <div
          className="fixed z-[9999] w-56 rounded-lg border border-border bg-muted p-3 text-xs text-foreground shadow-lg"
          style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
        >
          <p className="font-medium mb-1.5">Retention Status</p>
          <p className="text-muted-foreground mb-2">How likely you are to solve this problem right now, based on time since last review.</p>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between"><span className="text-green-500">Strong</span><span className="text-muted-foreground">R &ge; 80%</span></div>
            <div className="flex justify-between"><span className="text-emerald-400">Good</span><span className="text-muted-foreground">R &ge; 60%</span></div>
            <div className="flex justify-between"><span className="text-amber-500">Fading</span><span className="text-muted-foreground">R &ge; 40%</span></div>
            <div className="flex justify-between"><span className="text-orange-500">Weak</span><span className="text-muted-foreground">R &ge; 20%</span></div>
            <div className="flex justify-between"><span className="text-red-500">Critical</span><span className="text-muted-foreground">R &lt; 20%</span></div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Number in parentheses = total attempts</p>
        </div>,
        document.body,
      )}
    </span>
  );
}
