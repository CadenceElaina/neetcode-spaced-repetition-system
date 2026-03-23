"use client";

type CategoryStat = {
  category: string;
  total: number;
  attempted: number;
  avgRetention: number;
};

type DifficultyBreakdown = {
  difficulty: string;
  count: number;
  attempted: number;
};

type AttemptHistory = {
  date: string;
  count: number;
};

type QualityDistribution = {
  quality: string;
  count: number;
};

type RetentionBucket = {
  label: string;
  count: number;
  color: string;
};

type Props = {
  categoryStats: CategoryStat[];
  difficultyBreakdown: DifficultyBreakdown[];
  attemptHistory: AttemptHistory[];
  qualityDistribution: QualityDistribution[];
  retentionBuckets: RetentionBucket[];
  totalSolveMinutes: number;
  totalStudyMinutes: number;
  avgSolveMinutes: number;
  avgConfidence: number;
};

function retentionColor(r: number): string {
  if (r >= 0.8) return "bg-green-500";
  if (r >= 0.6) return "bg-emerald-400";
  if (r >= 0.4) return "bg-amber-500";
  if (r >= 0.2) return "bg-orange-500";
  return "bg-red-500";
}

function retentionLabel(r: number): string {
  if (r >= 0.8) return "Strong";
  if (r >= 0.6) return "Good";
  if (r >= 0.4) return "Fading";
  if (r >= 0.2) return "Weak";
  return "Critical";
}

const QUALITY_COLORS: Record<string, string> = {
  OPTIMAL: "bg-green-500",
  SUBOPTIMAL: "bg-amber-500",
  BRUTE_FORCE: "bg-orange-500",
  NONE: "bg-red-500",
};

const QUALITY_LABELS: Record<string, string> = {
  OPTIMAL: "Optimal",
  SUBOPTIMAL: "Suboptimal",
  BRUTE_FORCE: "Brute Force",
  NONE: "No Solution",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-green-500",
  Medium: "bg-amber-500",
  Hard: "bg-red-500",
};

export function StatsCharts({
  categoryStats,
  difficultyBreakdown,
  attemptHistory,
  qualityDistribution,
  retentionBuckets,
  totalSolveMinutes,
  totalStudyMinutes,
  avgSolveMinutes,
  avgConfidence,
}: Props) {
  const maxAttempts = Math.max(...attemptHistory.map((d) => d.count), 1);
  const maxCategoryTotal = Math.max(...categoryStats.map((c) => c.total), 1);
  const totalQuality = qualityDistribution.reduce((s, q) => s + q.count, 0) || 1;
  const totalRetention = retentionBuckets.reduce((s, b) => s + b.count, 0) || 1;

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="text-xs text-muted-foreground">Total Solve Time</p>
          <p className="mt-1 text-2xl font-semibold">{formatMinutes(totalSolveMinutes)}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="text-xs text-muted-foreground">Total Study Time</p>
          <p className="mt-1 text-2xl font-semibold">{formatMinutes(totalStudyMinutes)}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="text-xs text-muted-foreground">Avg Solve Time</p>
          <p className="mt-1 text-2xl font-semibold">{avgSolveMinutes > 0 ? `${Math.round(avgSolveMinutes)}m` : "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="text-xs text-muted-foreground">Avg Confidence</p>
          <p className="mt-1 text-2xl font-semibold">{avgConfidence > 0 ? avgConfidence.toFixed(1) : "—"}<span className="text-sm text-muted-foreground"> / 5</span></p>
        </div>
      </div>

      {/* Category retention heatmap */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Category Breakdown</h2>
        <div className="space-y-2">
          {categoryStats.map((cat) => (
            <div key={cat.category} className="flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-sm text-foreground">{cat.category}</span>
              <div className="flex h-6 flex-1 overflow-hidden rounded-md border border-border bg-background">
                {/* Attempted portion */}
                <div
                  className={`${retentionColor(cat.avgRetention)} transition-all duration-150`}
                  style={{ width: `${(cat.attempted / maxCategoryTotal) * 100}%` }}
                  title={`${cat.attempted}/${cat.total} attempted — R: ${(cat.avgRetention * 100).toFixed(0)}%`}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                {cat.attempted}/{cat.total} · {retentionLabel(cat.avgRetention)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Difficulty breakdown */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Difficulty Progress</h2>
        <div className="grid grid-cols-3 gap-4">
          {difficultyBreakdown.map((d) => {
            const pct = d.count > 0 ? Math.round((d.attempted / d.count) * 100) : 0;
            return (
              <div key={d.difficulty} className="rounded-lg border border-border bg-muted p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{d.difficulty}</span>
                  <span className="text-xs text-muted-foreground">{d.attempted}/{d.count}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className={`h-full rounded-full ${DIFFICULTY_COLORS[d.difficulty]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{pct}% complete</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Retention distribution */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Retention Distribution</h2>
        {totalRetention === 1 && retentionBuckets.every(b => b.count === 0) ? (
          <p className="text-sm text-muted-foreground">No attempted problems yet.</p>
        ) : (
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {retentionBuckets.map((b) => {
              const pct = (b.count / totalRetention) * 100;
              return (
                <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">{b.count}</span>
                  <div
                    className={`w-full rounded-t-md ${b.color}`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{b.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Solution quality distribution */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Solution Quality</h2>
        <div className="flex h-8 overflow-hidden rounded-lg border border-border">
          {qualityDistribution.map((q) => {
            const pct = (q.count / totalQuality) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={q.quality}
                className={`${QUALITY_COLORS[q.quality]} flex items-center justify-center`}
                style={{ width: `${pct}%` }}
                title={`${QUALITY_LABELS[q.quality]}: ${q.count} (${Math.round(pct)}%)`}
              >
                {pct >= 10 && (
                  <span className="text-xs font-medium text-white">{QUALITY_LABELS[q.quality]}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-4">
          {qualityDistribution.map((q) => (
            <div key={q.quality} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={`h-2.5 w-2.5 rounded-full ${QUALITY_COLORS[q.quality]}`} />
              {QUALITY_LABELS[q.quality]}: {q.count}
            </div>
          ))}
        </div>
      </section>

      {/* Attempt history (last 30 days) */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Attempt History (Last 30 Days)</h2>
        {attemptHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attempts in the last 30 days.</p>
        ) : (
          <div className="flex items-end gap-1" style={{ height: 100 }}>
            {attemptHistory.map((day) => {
              const pct = (day.count / maxAttempts) * 100;
              const dateObj = new Date(day.date);
              const label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  {day.count > 0 && (
                    <span className="text-xs text-muted-foreground">{day.count}</span>
                  )}
                  <div
                    className={`w-full rounded-t-sm ${day.count > 0 ? "bg-accent" : "bg-border"}`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                    title={`${label}: ${day.count} attempt${day.count !== 1 ? "s" : ""}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function formatMinutes(mins: number): string {
  if (mins === 0) return "0m";
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hours === 0) return `${remaining}m`;
  return `${hours}h ${remaining}m`;
}
