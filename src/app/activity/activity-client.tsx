"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";

type ActivityItem = {
  attemptId: string;
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  solvedIndependently: string;
  solutionQuality: string;
  confidence: number;
  solveTimeMinutes: number | null;
  studyTimeMinutes: number | null;
  timeCorrect: boolean | null;
  spaceCorrect: boolean | null;
  createdAt: string;
  isNew: boolean;
};

type Summary = {
  total: number;
  newCount: number;
  reviewCount: number;
  solvedCount: number;
  totalTime: number;
  avgConfidence: number;
};

type Props = {
  items: ActivityItem[];
  date: string;
  range: "day" | "week";
  summary: Summary;
};

const QUALITY_LABELS: Record<string, { label: string; className: string }> = {
  OPTIMAL: { label: "Optimal", className: "text-green-500" },
  SUBOPTIMAL: { label: "Suboptimal", className: "text-amber-500" },
  BRUTE_FORCE: { label: "Brute Force", className: "text-orange-500" },
  NONE: { label: "No Solution", className: "text-red-500" },
};

const SOLVED_LABELS: Record<string, { label: string; className: string }> = {
  YES: { label: "Solved", className: "text-green-500" },
  PARTIAL: { label: "Partial", className: "text-amber-500" },
  NO: { label: "Not Solved", className: "text-red-500" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatWeekRange(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setUTCDate(monday.getUTCDate() - diff);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getUTCFullYear()}`;
}

function formatTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function navigateDate(dateStr: string, range: "day" | "week", direction: -1 | 1): string {
  const d = new Date(dateStr + "T12:00:00Z");
  if (range === "week") {
    d.setUTCDate(d.getUTCDate() + direction * 7);
  } else {
    d.setUTCDate(d.getUTCDate() + direction);
  }
  return d.toISOString().slice(0, 10);
}

export function ActivityClient({ items, date, range, summary }: Props) {
  const router = useRouter();

  function go(newDate: string, newRange: "day" | "week") {
    router.push(`/activity?date=${newDate}&range=${newRange}`);
  }

  const prevDate = navigateDate(date, range, -1);
  const nextDate = navigateDate(date, range, 1);
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = range === "day" && date === todayStr;

  const heading = range === "week" ? formatWeekRange(date) : formatDate(date);

  // Group items by date when in week view
  const grouped = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const d = item.createdAt.slice(0, 10);
    if (!grouped.has(d)) grouped.set(d, []);
    grouped.get(d)!.push(item);
  }
  const sortedDays = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));

  const btnBase =
    "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm transition-colors duration-150 border";
  const btnActive = "border-accent bg-accent/10 text-accent font-medium";
  const btnInactive =
    "border-border text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">{heading}</p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Range toggle */}
        <div className="flex gap-1">
          <button
            className={`${btnBase} ${range === "day" ? btnActive : btnInactive}`}
            onClick={() => go(date, "day")}
          >
            Day
          </button>
          <button
            className={`${btnBase} ${range === "week" ? btnActive : btnInactive}`}
            onClick={() => go(date, "week")}
          >
            Week
          </button>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button
            className={`${btnBase} ${btnInactive} px-2`}
            onClick={() => go(prevDate, range)}
            aria-label="Previous"
          >
            ‹
          </button>
          {!isToday && (
            <button
              className={`${btnBase} ${btnInactive}`}
              onClick={() => go(todayStr, range)}
            >
              Today
            </button>
          )}
          <button
            className={`${btnBase} ${btnInactive} px-2`}
            onClick={() => go(nextDate, range)}
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total" value={summary.total} />
        <StatCard label="New" value={summary.newCount} accent />
        <StatCard label="Reviews" value={summary.reviewCount} />
        <StatCard label="Solved" value={summary.solvedCount} />
        <StatCard label="Time" value={formatMinutes(summary.totalTime)} />
        <StatCard
          label="Avg Confidence"
          value={summary.avgConfidence > 0 ? summary.avgConfidence.toFixed(1) : "—"}
        />
      </div>

      {/* Attempt list */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-muted-foreground">No activity for this {range}.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : range === "week" && sortedDays.length > 1 ? (
        <div className="space-y-6">
          {sortedDays.map(([dayStr, dayItems]) => (
            <div key={dayStr}>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {formatDate(dayStr)}
                <span className="ml-2 normal-case tracking-normal font-normal">
                  {dayItems.length} attempt{dayItems.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <AttemptList items={dayItems} />
            </div>
          ))}
        </div>
      ) : (
        <AttemptList items={items} />
      )}
    </div>
  );
}

function AttemptList({ items }: { items: ActivityItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const solved = SOLVED_LABELS[item.solvedIndependently] ?? {
          label: item.solvedIndependently,
          className: "text-muted-foreground",
        };
        const quality = QUALITY_LABELS[item.solutionQuality] ?? {
          label: item.solutionQuality,
          className: "text-muted-foreground",
        };
        const totalMins =
          (item.solveTimeMinutes ?? 0) + (item.studyTimeMinutes ?? 0);

        return (
          <Link
            key={item.attemptId}
            href={`/problems/${item.problemId}`}
            className="flex items-center gap-4 rounded-lg border border-border bg-muted p-3 transition-colors hover:bg-muted/80 group"
          >
            {/* Problem info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    item.isNew
                      ? "bg-accent/15 text-accent"
                      : "bg-muted-foreground/15 text-muted-foreground"
                  }`}
                >
                  {item.isNew ? "New" : "Review"}
                </span>
                <DifficultyBadge difficulty={item.difficulty} />
                <span className="text-sm font-medium text-foreground truncate">
                  {item.leetcodeNumber != null && (
                    <span className="text-muted-foreground mr-1">
                      {item.leetcodeNumber}.
                    </span>
                  )}
                  {item.title}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{item.category}</span>
                <span className={solved.className}>{solved.label}</span>
                {item.solutionQuality !== "NONE" && (
                  <span className={quality.className}>{quality.label}</span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
              {totalMins > 0 && <span>{totalMins}m</span>}
              <span className="tabular-nums">
                {item.confidence}/5
              </span>
              {item.timeCorrect !== null && (
                <span title="Time complexity">
                  T{item.timeCorrect ? "✓" : "✗"}
                </span>
              )}
              {item.spaceCorrect !== null && (
                <span title="Space complexity">
                  S{item.spaceCorrect ? "✓" : "✗"}
                </span>
              )}
              <span className="text-[10px] hidden sm:inline">
                {formatTime(item.createdAt)}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-lg font-semibold tabular-nums ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </p>
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
