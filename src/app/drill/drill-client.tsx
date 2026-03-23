"use client";

import { useState } from "react";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ExternalLink } from "lucide-react";

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

export function DrillClient({ categories }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const activeCategory = selected ? categories.find((c) => c.name === selected) : null;

  return (
    <div className="space-y-6">
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
                  <Link
                    href={`/problems/${p.id}/attempt`}
                    className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-xs text-accent-foreground transition-colors duration-150 hover:opacity-90"
                  >
                    Log Attempt
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
