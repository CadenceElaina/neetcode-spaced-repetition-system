"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ExternalLink } from "lucide-react";
import { LogAttemptModal, type LogModalProblem } from "@/components/log-attempt-modal";

type DrillProblem = {
  id: number;
  leetcodeNumber: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  leetcodeUrl: string;
  attempted: boolean;
  retention: number | null;
  totalAttempts: number;
};

type Category = {
  name: string;
  total: number;
  attempted: number;
  avgRetention: number;
  problems: DrillProblem[];
};

type Props = {
  categories: Category[];
  isDemo?: boolean;
};

function retentionColor(r: number): string {
  if (r >= 0.8) return "text-green-500";
  if (r >= 0.6) return "text-emerald-400";
  if (r >= 0.4) return "text-amber-500";
  if (r >= 0.2) return "text-orange-500";
  return "text-red-500";
}

function retentionBgColor(r: number): string {
  if (r >= 0.8) return "bg-green-500";
  if (r >= 0.6) return "bg-emerald-400";
  if (r >= 0.4) return "bg-amber-500";
  if (r >= 0.2) return "bg-orange-500";
  return "bg-red-500";
}

const PATTERN_HINTS: Record<string, string> = {
  "Arrays & Hashing": "Use hash maps for O(1) lookups. Think: frequency counts, seen-sets, index maps.",
  "Two Pointers": "One pointer from each end, or slow/fast. Works on sorted arrays—move the pointer that improves the condition.",
  "Sliding Window": "Expand right to grow, shrink left when constraint breaks. Track window state in a hash map or counter.",
  "Stack": "Use a stack when you need to match/undo or track a monotonic sequence. Think: next-greater, valid brackets.",
  "Binary Search": "Sorted or monotonic? Binary search. Define the search space, decide which half to eliminate each step.",
  "Linked List": "Use slow/fast pointers for cycles and midpoints. Dummy head simplifies edge cases.",
  "Trees": "DFS (pre/in/post-order) or BFS. Recursive = implicit stack. Return values up, pass constraints down.",
  "Tries": "Prefix tree for string lookups. Each node has children[26]. Insert char-by-char, search by walking down.",
  "Heap / Priority Queue": "Use a heap when you need the min/max repeatedly. Think: top-K, merge-K, scheduling.",
  "Backtracking": "Build candidates incrementally, abandon (prune) when constraints fail. Classic: permutations, subsets, N-queens.",
  "Graphs": "Model relationships as adjacency list. BFS for shortest path, DFS for traversal/cycle detection. Track visited.",
  "Advanced Graphs": "Dijkstra for weighted shortest path, topological sort for DAGs, union-find for components.",
  "1-D Dynamic Programming": "Define dp[i] = optimal answer ending/starting at i. Base case, recurrence, iteration order.",
  "2-D Dynamic Programming": "dp[i][j] = answer for subproblem (i,j). Fill row-by-row or diagonal. Watch space optimization.",
  "Greedy": "Make the locally optimal choice at each step. Prove that local optimal leads to global optimal (exchange argument).",
  "Intervals": "Sort by start (or end). Merge overlapping, or sweep with a priority queue.",
  "Math & Geometry": "Look for modular arithmetic, number properties, or geometric invariants. Avoid brute force—find the math shortcut.",
  "Bit Manipulation": "XOR for cancel-pairs, AND/OR for masks. Know: n & (n-1) clears lowest set bit, n & -n isolates it.",
};

export function DrillClient({ categories, isDemo = false }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [logModalProblem, setLogModalProblem] = useState<LogModalProblem | null>(null);
  const [showDemoSignIn, setShowDemoSignIn] = useState(false);

  function demoGuard(action: () => void) {
    if (isDemo) { setShowDemoSignIn(true); return; }
    action();
  }

  const activeCategory = selected ? categories.find((c) => c.name === selected) : null;

  return (
    <div className="space-y-6">
      {/* Demo sign-in prompt */}
      {showDemoSignIn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDemoSignIn(false)}>
          <div className="rounded-lg border border-border bg-muted p-6 text-center space-y-3 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Sign in to log attempts</h3>
            <p className="text-xs text-muted-foreground">This is a demo — sign in to track your progress with spaced repetition.</p>
            <div className="flex gap-2 justify-center pt-1">
              <Link href="/auth/signin" className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-all duration-150 hover:shadow-[0_0_12px_var(--glow)]">Sign in with GitHub</Link>
              <button onClick={() => setShowDemoSignIn(false)} className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm text-muted-foreground hover:text-foreground transition-colors">Keep exploring</button>
            </div>
          </div>
        </div>
      )}
      {/* Demo banner */}
      {isDemo && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 flex items-center gap-2 text-sm">
          <span className="text-xs font-medium text-accent">DEMO</span>
          <span className="text-muted-foreground text-xs">Explore drill categories — sign in to practice and track retention</span>
        </div>
      )}
      {logModalProblem && !isDemo && (
        <LogAttemptModal
          problem={logModalProblem}
          onClose={() => setLogModalProblem(null)}
          onLogged={() => {
            setLogModalProblem(null);
            router.refresh();
          }}
        />
      )}
      <h1 className="text-2xl font-semibold">Pattern Drill</h1>
      <p className="text-sm text-muted-foreground">
        Pick a category to focus on. Problems are sorted by retention — weakest first.
      </p>

      {!activeCategory ? (
        /* Category picker */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const pct = cat.total > 0 ? Math.round((cat.attempted / cat.total) * 100) : 0;
            return (
              <button
                key={cat.name}
                onClick={() => setSelected(cat.name)}
                className="rounded-lg border border-border bg-muted p-4 text-left transition-colors duration-150 hover:border-accent/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">{cat.attempted}/{cat.total}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                  <div
                    className={`h-full rounded-full ${cat.avgRetention > 0 ? retentionBgColor(cat.avgRetention) : "bg-border"}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cat.attempted > 0
                    ? `Avg retention: ${Math.round(cat.avgRetention * 100)}%`
                    : "Not started"}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        /* Drill session */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                ← All Categories
              </button>
              <span className="text-lg font-semibold">{activeCategory.name}</span>
              <span className="text-xs text-muted-foreground">
                {activeCategory.attempted}/{activeCategory.total} attempted
              </span>
            </div>
          </div>

          {PATTERN_HINTS[activeCategory.name] && (
            <div className="rounded-md border border-border/50 bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground/80">Pattern: </span>
                {PATTERN_HINTS[activeCategory.name]}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {activeCategory.problems.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted p-3 transition-colors duration-150 hover:border-accent/50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-sm text-muted-foreground">{p.leetcodeNumber}</span>
                  <Link
                    href={`/problems/${p.id}`}
                    className="text-sm font-medium text-foreground hover:text-accent"
                  >
                    {p.title}
                  </Link>
                  <DifficultyBadge difficulty={p.difficulty} />
                  {p.retention !== null && (
                    <span className={`text-xs font-medium ${retentionColor(p.retention)}`}>
                      {Math.round(p.retention * 100)}%
                    </span>
                  )}
                  {!p.attempted && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                      New
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {p.attempted && (
                    <span className="text-xs text-muted-foreground">
                      {p.totalAttempts} attempt{p.totalAttempts !== 1 ? "s" : ""}
                    </span>
                  )}
                  <a
                    href={p.leetcodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs text-foreground transition-colors duration-150 hover:bg-background"
                  >
                    <ExternalLink size={12} />
                    LeetCode
                  </a>
                  <button
                    onClick={() => demoGuard(() => setLogModalProblem({
                      problemId: p.id,
                      title: p.title,
                      leetcodeNumber: p.leetcodeNumber,
                      difficulty: p.difficulty,
                      isReview: p.attempted,
                    }))}
                    className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-xs text-accent-foreground transition-colors duration-150 hover:opacity-90"
                  >
                    Log Attempt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
