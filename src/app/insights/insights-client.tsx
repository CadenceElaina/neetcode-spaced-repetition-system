"use client";

import Link from "next/link";
import type { InsightsData } from "./demo-data";
import type { CalibrationBucket } from "@/lib/analytics";

const TREND_LABEL: Record<string, string> = {
  improving:        "Improving",
  stable:           "Stable",
  declining:        "Declining",
  insufficient_data: "Not enough data",
};

const TREND_COLOR: Record<string, string> = {
  improving:        "text-green-400",
  stable:           "text-muted-foreground",
  declining:        "text-amber-400",
  insufficient_data: "text-muted-foreground",
};

const QUALITY_LABEL: Record<string, string> = {
  OPTIMAL:     "Optimal",
  SUBOPTIMAL:  "Suboptimal",
  BRUTE_FORCE: "Brute Force",
  NONE:        "No solution",
};

const DIFF_COLOR: Record<string, string> = {
  Easy:   "text-green-400",
  Medium: "text-amber-400",
  Hard:   "text-red-400",
};

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

function StatCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  subColor?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className={`mt-1 text-xs ${subColor ?? "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}

export function InsightsClient({ data, isDemo }: { data: InsightsData; isDemo: boolean }) {
  const { velocity, compliance, metacognition, stuckProblems, categoryStats, totalAttempts, totalProblems, calibration } = data;

  const hasData = totalAttempts > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasData
              ? `Based on ${totalAttempts.toLocaleString()} attempts across ${totalProblems} problems`
              : "Start logging attempts to see your analytics"}
          </p>
        </div>
        {isDemo && (
          <span className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            DEMO
          </span>
        )}
      </div>

      {!hasData && !isDemo ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-8 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No attempts logged yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Head to the{" "}
            <Link href="/dashboard" className="text-accent hover:underline">
              Dashboard
            </Link>{" "}
            to log your first problem.
          </p>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Velocity */}
            <StatCard
              label="Learning Velocity"
              value={
                velocity.newProblemsPerDay > 0
                  ? `${velocity.newProblemsPerDay.toFixed(1)}/day`
                  : "0/day"
              }
              sub={TREND_LABEL[velocity.trend]}
              subColor={TREND_COLOR[velocity.trend]}
            />

            {/* Review compliance */}
            <StatCard
              label="Review Compliance"
              value={pct(compliance.complianceRate)}
              sub={
                compliance.currentlyOverdue > 0
                  ? `${compliance.currentlyOverdue} overdue`
                  : "All reviews on track"
              }
              subColor={compliance.currentlyOverdue > 0 ? "text-amber-400" : "text-green-400"}
            />

            {/* Metacognition */}
            <StatCard
              label="Overconfidence Rate"
              value={pct(metacognition.overconfidenceRate)}
              sub={
                metacognition.underconfidenceRate > 0
                  ? `${pct(metacognition.underconfidenceRate)} underconfident`
                  : undefined
              }
            />

            {/* Stuck problems */}
            <StatCard
              label="Stuck Problems"
              value={stuckProblems.length}
              sub={
                stuckProblems.length > 0
                  ? "4+ attempts, no real progress"
                  : "None — looking good"
              }
              subColor={stuckProblems.length > 0 ? "text-amber-400" : "text-green-400"}
            />
          </div>

          {/* Model calibration */}
          <section>
            <h2 className="mb-1 text-sm font-semibold text-foreground">Model Calibration</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Predicted retrievability (R) vs. actual solve rate per bucket. The dashed line is perfect
              calibration — bars that match it mean the model&apos;s predictions align with your outcomes.
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-5 py-4">
              {calibration.n === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reviews logged yet — predictions are recorded from your first review onward.
                </p>
              ) : calibration.buckets.every((b) => b.count === 0) ? (
                <p className="text-sm text-muted-foreground">
                  {calibration.n} review{calibration.n === 1 ? "" : "s"} logged — need 20+ across buckets for the chart.
                </p>
              ) : (
                <>
                  <CalibrationChart buckets={calibration.buckets} />
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{calibration.n} review predictions</span>
                    {calibration.mae !== null && (
                      <span>
                        MAE{" "}
                        <span className={`font-semibold tabular-nums ${
                          calibration.mae < 0.1 ? "text-green-400"
                          : calibration.mae < 0.2 ? "text-amber-400"
                          : "text-orange-400"
                        }`}>
                          {calibration.mae.toFixed(3)}
                        </span>
                        {" "}—{" "}
                        {calibration.mae < 0.1 ? "excellent" : calibration.mae < 0.2 ? "good" : "fair"}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Stuck problems detail */}
          {stuckProblems.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Stuck Problems</h2>
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-muted/30">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Problem</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Difficulty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Attempts</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Best Result</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Days Stuck</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {stuckProblems.map((p) => (
                      <tr key={p.problemId} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium text-foreground">{p.title}</td>
                        <td className={`px-4 py-2.5 ${DIFF_COLOR[p.difficulty]}`}>{p.difficulty}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.totalAttempts}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {QUALITY_LABEL[p.bestQuality ?? "NONE"]}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {p.daysSinceFirstAttempt}d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                More SRS repetition won&apos;t fix these — try a different explanation, solution walkthrough, or ask for help.
              </p>
            </section>
          )}

          {/* Category breakdown */}
          {categoryStats.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Category Breakdown</h2>
              <p className="mb-3 text-xs text-muted-foreground">Sorted by retention — weakest categories first.</p>
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-muted/30">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Problems</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Avg Retention</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Stuck</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Complexity Acc.</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Avg to Optimal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {categoryStats.map((c) => (
                      <tr key={c.category} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium text-foreground">{c.category}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {c.attemptedProblems}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <RetentionBadge r={c.avgR} />
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${c.stuckCount > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {c.stuckCount}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {pct(c.complexityAccuracyRate)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {c.avgAttemptsToOptimal != null
                            ? c.avgAttemptsToOptimal.toFixed(1)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Metacognition detail */}
          {metacognition.totalAttempts >= 10 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Metacognition</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Overconfidence</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {pct(metacognition.overconfidenceRate)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metacognition.overconfidentAttempts} attempts: rated confidence ≥4 but performed poorly
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Underconfidence</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {pct(metacognition.underconfidenceRate)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metacognition.underconfidentAttempts} attempts: rated confidence ≤2 but performed well
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RetentionBadge({ r }: { r: number }) {
  const color =
    r >= 0.75 ? "text-green-400"
    : r >= 0.55 ? "text-amber-400"
    : "text-red-400";
  return <span className={color}>{pct(r)}</span>;
}

function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  // SVG layout constants
  const W = 400, H = 240;
  const pl = 44, pr = 16, pt = 16, pb = 44;
  const pw = W - pl - pr; // 340 — plot width
  const ph = H - pt - pb; // 180 — plot height

  const xMin = 0.3, xMax = 1.0;
  const toX = (r: number) => pl + ((r - xMin) / (xMax - xMin)) * pw;
  const toY = (rate: number) => pt + (1 - rate) * ph;

  // Perfect calibration diagonal: where y = x within the visible x range
  const diagX1 = toX(xMin), diagY1 = toY(xMin);
  const diagX2 = toX(xMax), diagY2 = toY(xMax);

  // Y-axis gridlines at 0, 25, 50, 75, 100%
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];

  const barWidth = 32;

  return (
    <div className="flex items-stretch gap-2">
    <div className="flex items-center justify-center w-4 shrink-0">
      <span
        className="text-[9px] text-muted-foreground/40 select-none whitespace-nowrap"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        Actual solve rate
      </span>
    </div>
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="flex-1 min-w-0 text-muted-foreground"
      aria-label="Calibration curve: predicted R vs actual solve rate"
    >
      {/* Y-axis gridlines + labels */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={pl} x2={pl + pw}
            y1={toY(v)} y2={toY(v)}
            stroke="currentColor" strokeOpacity={0.1} strokeWidth={1}
          />
          <text
            x={pl - 6} y={toY(v) + 4}
            fontSize={9} textAnchor="end"
            fill="currentColor" fillOpacity={0.45}
          >
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* Axes */}
      <line x1={pl} y1={pt} x2={pl} y2={pt + ph} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
      <line x1={pl} y1={pt + ph} x2={pl + pw} y2={pt + ph} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />

      {/* Perfect-calibration diagonal */}
      <line
        x1={diagX1} y1={diagY1} x2={diagX2} y2={diagY2}
        stroke="currentColor" strokeOpacity={0.3}
        strokeDasharray="5 4" strokeWidth={1.5}
      />

      {/* Bucket bars */}
      {buckets.map((b) => {
        if (b.count === 0) return null;
        const cx = toX(b.predictedMidpoint);
        const barH = b.actualSuccessRate * ph;
        const x = cx - barWidth / 2;
        const y = pt + ph - barH;
        const dev = Math.abs(b.predictedMidpoint - b.actualSuccessRate);
        const fill =
          dev < 0.08 ? "#4ade80"  // green-400
          : dev < 0.18 ? "#fbbf24" // amber-400
          : "#f87171";             // red-400
        return (
          <g key={b.predictedMidpoint}>
            <rect x={x} y={y} width={barWidth} height={Math.max(barH, 2)} fill={fill} fillOpacity={0.75} rx={2} />
            {/* count label above bar */}
            <text
              x={cx} y={y - 4}
              fontSize={8} textAnchor="middle"
              fill="currentColor" fillOpacity={0.5}
            >
              n={b.count}
            </text>
            {/* x-axis label */}
            <text
              x={cx} y={pt + ph + 14}
              fontSize={9} textAnchor="middle"
              fill="currentColor" fillOpacity={0.45}
            >
              {(b.predictedMidpoint * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* X-axis title */}
      <text
        x={pl + pw / 2} y={H - 2}
        fontSize={9} textAnchor="middle"
        fill="currentColor" fillOpacity={0.4}
      >
        Predicted R at review time
      </text>
    </svg>
    </div>
  );
}
