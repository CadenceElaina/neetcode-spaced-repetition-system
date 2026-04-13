"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ImportClient } from "@/app/import/import-client";
import { LogAttemptModal, type LogModalProblem, type LogModalResult } from "@/components/log-attempt-modal";
import { DrillCard } from "@/components/drill-card";
import { SessionHeader } from "@/components/session-header";
import { SessionSummary } from "@/components/session-summary";
import { DrillTour, shouldShowTour } from "@/components/drill-tour";
import { SyntaxReferencePanel } from "@/components/syntax-reference-panel";
import { getMutedPref, setMutedPref, playSound } from "@/lib/sounds";
import { getPyodide, terminatePyodide } from "@/lib/pyodide";
import { DEMO_DRILLS, DEMO_FLUENCY_STATS, type DemoDrill, type DrillConfidence, type DemoFluencyCategory } from "@/app/dashboard/demo-data";

/* ── Types ── */

type ReviewItem = {
  stateId: string;
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  neetcodeUrl: string | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  totalAttempts: number;
  daysOverdue: number;
  retrievability: number;
  lastReviewedAt: string | null;
};

type CompletedItem = {
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  totalAttempts: number;
  retrievability: number;
  stability: number;
  lastReviewedAt: string | null;
  daysUntilReview: number | null;
  isDue: boolean;
  bestQuality: string | null;
};

type ListMode = "review" | "new" | "completed" | "import" | "drills";
type ReviewSort = "overdue" | "difficulty" | "category";
type NewSort = "curriculum" | "hardest";
type CompletedSort = "retention" | "review-date" | "category";

type NewProblem = {
  id: number;
  leetcodeNumber: number | null;
  title: string;
  neetcodeUrl: string | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  blind75: boolean;
  leetcodeUrl: string;
};

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

type AttemptDay = {
  date: string;
  count: number;
  newCount: number;
  reviewCount: number;
};

type ReadinessResult = {
  score: number;
  tier: "S" | "A" | "B" | "C" | "D";
};

type MasteryItem = {
  problemId: number;
  title: string;
  leetcodeNumber: number | null;
  stability: number;
  category: string;
};

type PendingItem = {
  id: string;
  problemId: number;
  problemTitle: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  isReview: boolean;
  detectedAt: string;
};

type DashboardData = {
  reviewQueue: ReviewItem[];
  newProblems: NewProblem[];
  totalProblems: number;
  attemptedCount: number;
  retainedCount: number;
  readiness: ReadinessResult;
  readinessBreakdown: { coverage: number; retention: number; categoryBalance: number; consistency: number };
  currentStreak: number;
  bestStreak: number;
  avgPerDay: number;
  avgNewPerDay: number;
  avgReviewPerDay: number;
  overallPerDay: number;
  overallNewPerDay: number;
  overallReviewPerDay: number;
  categoryStats: CategoryStat[];
  difficultyBreakdown: DifficultyBreakdown[];
  attemptHistory: AttemptDay[];
  fullAttemptHistory: AttemptDay[];
  totalSolveMinutes: number;
  totalStudyMinutes: number;
  avgSolveMinutes: number;
  avgConfidence: number;
  masteredCount: number;
  learningCount: number;
  masteryList: MasteryItem[];
  learningList: MasteryItem[];
  completedProblems: CompletedItem[];
  importProblems: {
    id: number;
    title: string;
    leetcodeNumber: number | null;
    difficulty: "Easy" | "Medium" | "Hard";
    category: string;
  }[];
  importAttemptedIds: number[];
  importTodayAttemptedIds: number[];
  pendingSubmissions: PendingItem[];
};

const TIER_COLORS: Record<string, string> = {
  S: "bg-violet-500 text-white",
  A: "bg-blue-500 text-white",
  B: "bg-emerald-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-zinc-400 text-white",
};

const DIFF_COLORS: Record<string, string> = {
  Easy: "bg-green-500",
  Medium: "bg-amber-500",
  Hard: "bg-red-500",
};

/* ── Subtle dashboard starfield ── */
function DashboardSkyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = 0, H = 0;

    function resize() {
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      canvas!.width = W * devicePixelRatio;
      canvas!.height = H * devicePixelRatio;
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    resize();

    type Star = { x: number; y: number; r: number; a: number; ts: number; to: number };
    let stars: Star[] = [];

    function makeStars() {
      stars = [];
      // ~1 star per 4500px² — sparse but visible in dark gaps + gutters
      const count = Math.floor((W * H) / 4500);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 0.9 + 0.25,
          a: Math.random() * 0.35 + 0.15, // max ~0.50
          ts: Math.random() * 0.008 + 0.003,
          to: Math.random() * Math.PI * 2,
        });
      }
    }
    makeStars();

    const resizeCb = () => { resize(); makeStars(); };
    window.addEventListener("resize", resizeCb);

    function hexAlpha(hex: string, a: number) {
      return hex + Math.floor(a * 255).toString(16).padStart(2, "0");
    }

    function frame(ts: number) {
      ctx!.clearRect(0, 0, W, H);
      for (const s of stars) {
        const a = s.a * (0.5 + 0.5 * Math.sin(ts * s.ts + s.to));
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = hexAlpha("#a78bfa", a);
        ctx!.fill();
      }
      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCb);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-screen h-screen pointer-events-none z-0" />;
}

function retentionColor(r: number): string {
  if (r >= 0.8) return "text-green-500";
  if (r >= 0.6) return "text-emerald-400";
  if (r >= 0.4) return "text-amber-500";
  if (r >= 0.2) return "text-orange-500";
  return "text-red-500";
}

function retentionBarColor(r: number): string {
  if (r >= 0.8) return "bg-green-500";
  if (r >= 0.6) return "bg-emerald-400";
  if (r >= 0.4) return "bg-amber-500";
  if (r >= 0.2) return "bg-orange-500";
  return "bg-red-500";
}

function retentionLabel(r: number, bestQuality?: string | null): string {
  if (bestQuality === "NONE") return "Unsolved";
  if (r >= 0.8) return "Strong";
  if (r >= 0.6) return "Good";
  if (r >= 0.4) return "Fading";
  if (r >= 0.2) return "Weak";
  return "Critical";
}

function formatMinutes(mins: number): string {
  if (mins === 0) return "0m";
  const hours = Math.floor(mins / 60);
  const remaining = Math.round(mins % 60);
  if (hours === 0) return `${remaining}m`;
  return `${hours}h ${remaining}m`;
}

function daysAgoLabel(date: string | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const localNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((localNow.getTime() - localDate.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function priorityLevel(item: ReviewItem): "critical" | "high" | "medium" | "due" {
  if (item.daysOverdue > 5 || item.retrievability < 0.25) return "critical";
  if (item.daysOverdue > 1 || item.retrievability < 0.45) return "high";
  if (item.daysOverdue > 0) return "medium";
  return "due";
}

const PRIORITY_BG: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-400 text-black",
  due: "bg-sky-500 text-white",
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  due: "bg-sky-400",
};

const DIFF_ORDER: Record<string, number> = { Hard: 0, Medium: 1, Easy: 2 };

/* ── Default target: September 1 of current year (or next year if past) ── */
function getDefaultTargetDate(): string {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-09-01`;
}

/* ── Main Component ── */

export function DashboardClient({ data, isDemo = false }: { data: DashboardData; isDemo?: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [srsBanner, setSrsBanner] = useState<{ oldS: number; newS: number; next: string; pct: number; attemptId: string; pName: string; pNum: string } | null>(null);
  const drillScrollRef = useRef<HTMLDivElement>(null);

  const [targetDate, setTargetDate] = useState(getDefaultTargetDate());
  const [targetCount, setTargetCount] = useState(150);
  const [showSettings, setShowSettings] = useState(false);
  const [categoryView, setCategoryView] = useState<"weak" | "all">("weak");
  const [listMode, setListMode] = useState<ListMode>("review");
  const [reviewSort, setReviewSort] = useState<ReviewSort>("overdue");
  const [newSort, setNewSort] = useState<NewSort>("curriculum");
  const [completedSort, setCompletedSort] = useState<CompletedSort>("retention");
  const [queueSearch, setQueueSearch] = useState("");
  const [showStatsDetail, setShowStatsDetail] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>(data.pendingSubmissions);
  const [logModalProblem, setLogModalProblem] = useState<LogModalProblem | null>(null);
  const [collapsedWidgets, setCollapsedWidgets] = useState<Record<string, boolean>>({});
  const [showOverallPace, setShowOverallPace] = useState(false);
  const [activityRange, setActivityRange] = useState<"14d" | "30d" | "90d" | "all">("14d");

  // Drill state
  const [drillSubTab, setDrillSubTab] = useState<"due" | "new" | "mastered">("due");
  const [drillSession, setDrillSession] = useState<{ active: boolean; drills: DemoDrill[]; current: number; results: DrillConfidence[]; categoryLabel?: string } | null>(null);
  const [realDrills, setRealDrills] = useState<DemoDrill[] | null>(null);
  const [realFluencyStats, setRealFluencyStats] = useState<{ overallTier: string; categories: DemoFluencyCategory[] } | null>(null);
  const [drillsLoading, setDrillsLoading] = useState(false);
  const [drillsError, setDrillsError] = useState<string | null>(null);
  const [categoryUnlocks, setCategoryUnlocks] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [singleDrill, setSingleDrill] = useState<DemoDrill | null>(null);
  // Phase 2 — session UX state
  const [drillMuted, setDrillMuted] = useState(() => {
    const pref = getMutedPref();
    // If muted was set but user never completed a drill, they likely toggled
    // it accidentally during the tour — reset to unmuted.
    if (pref) {
      try {
        const hasReviewed = localStorage.getItem("drills-has-reviewed");
        if (!hasReviewed) {
          setMutedPref(false);
          return false;
        }
      } catch { /* ok */ }
    }
    return pref;
  });
  const [drillAutoContinue, setDrillAutoContinue] = useState(false);
  const [drillCombo, setDrillCombo] = useState(0);
  const [showDrillTour, setShowDrillTour] = useState(false);
  const [syntaxRefEnabled, setSyntaxRefEnabled] = useState(true);
  const [excludedDrillCategories, setExcludedDrillCategories] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("aurora-excluded-drill-categories");
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [rightPanelView, setRightPanelView] = useState<"stats" | "syntax">(() => {
    try { return (localStorage.getItem("aurora-right-panel") as "stats" | "syntax") ?? "stats"; } catch { return "stats"; }
  });


  const activityData = useMemo(() => {
    if (activityRange === "14d") return data.attemptHistory;
    if (activityRange === "all") return data.fullAttemptHistory;
    const days = activityRange === "30d" ? 30 : 90;
    return data.fullAttemptHistory.slice(-days);
  }, [activityRange, data.attemptHistory, data.fullAttemptHistory]);

  // Fetch real drills + fluency stats for authenticated users
  const fetchDrills = useCallback(async () => {
    if (isDemo) return;
    setDrillsLoading(true);
    setDrillsError(null);
    try {
      const [drillsRes, statsRes] = await Promise.all([
        fetch("/api/drills?filter=all"),
        fetch("/api/drills/stats"),
      ]);
      if (!drillsRes.ok) {
        const body = await drillsRes.json().catch(() => ({}));
        setDrillsError(`Drills API ${drillsRes.status}: ${body?.error ?? drillsRes.statusText}`);
      } else {
        const data = await drillsRes.json();
        const { drills, _meta } = data;
        if (_meta) {
          if (process.env.NODE_ENV !== "production") console.debug("[drills] meta:", _meta);
          if (_meta.categoryUnlocks) setCategoryUnlocks(_meta.categoryUnlocks);
        }
        const now = new Date();
        const mapped: DemoDrill[] = drills.map((d: { id: number; title: string; category: string; level: number; prompt: string; expectedCode: string; alternatives?: string[]; explanation: string; testCases?: Array<{ input: string; expected: string }>; distractors?: string[]; state: { stability: number; lastReviewedAt: string | null; nextReviewAt: string | null; totalAttempts: number; bestConfidence: number | null } | null }) => {
          let dueStatus: "due" | "new" | "mastered" = "new";
          if (d.state) {
            if (d.state.stability > 21) dueStatus = "mastered";
            else if (!d.state.nextReviewAt || new Date(d.state.nextReviewAt) <= now) dueStatus = "due";
            else dueStatus = "mastered"; // reviewed but not yet due — treat as learning/mastered
          }
          return {
            id: d.id,
            title: d.title,
            category: d.category,
            level: d.level as DemoDrill["level"],
            prompt: d.prompt,
            expectedCode: d.expectedCode,
            alternatives: d.alternatives,
            explanation: d.explanation,
            dueStatus,
            totalAttempts: d.state?.totalAttempts ?? 0,
            stability: d.state?.stability ?? 0,
            testCases: d.testCases,
            distractors: d.distractors,
          };
        });
        setRealDrills(mapped);
      }
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setRealFluencyStats({
          overallTier: stats.overallTier,
          categories: stats.categories.map((c: { name: string; fluency: number; drillsDue: number; totalDrills: number; mastered: number }) => ({
            name: c.name,
            fluency: c.fluency,
            drillsDue: c.drillsDue,
            totalDrills: c.totalDrills,
            mastered: c.mastered,
          })),
        });
      }
    } catch (err) {
      setDrillsError(err instanceof Error ? err.message : "Failed to load drills");
    } finally {
      setDrillsLoading(false);
    }
  }, [isDemo]);

  useEffect(() => { fetchDrills(); }, [fetchDrills]);

  // Pre-warm Pyodide + show tour when entering drill mode
  useEffect(() => {
    if (listMode === "drills") {
      getPyodide().init();
      if (shouldShowTour()) {
        setShowDrillTour(true);
      }
    }
  }, [listMode]);

  function toggleWidget(key: string) {
    setCollapsedWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Load saved settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("srs_target");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date) setTargetDate(parsed.date);
        if (parsed.count) setTargetCount(parsed.count);
      } catch { /* ignore */ }
    }
  }, []);

  // SRS feedback banner from attempt redirect
  useEffect(() => {
    const oldS = searchParams.get("oldS");
    const newS = searchParams.get("newS");
    const next = searchParams.get("next");
    const pct = searchParams.get("pct");
    const attemptId = searchParams.get("attemptId");
    const pName = searchParams.get("pName");
    const pNum = searchParams.get("pNum");
    if (oldS && newS && next && pct && attemptId) {
      setSrsBanner({ oldS: Number(oldS), newS: Number(newS), next, pct: Number(pct), attemptId, pName: pName ?? "", pNum: pNum ?? "" });
      // Clean URL without reload
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, router]);

  // Auto-dismiss SRS banner after 8s
  useEffect(() => {
    if (!srsBanner) return;
    const timer = setTimeout(() => setSrsBanner(null), 8000);
    return () => clearTimeout(timer);
  }, [srsBanner]);

  function saveSettings(date: string, count: number) {
    setTargetDate(date);
    setTargetCount(count);
    localStorage.setItem("srs_target", JSON.stringify({ date, count }));
    setShowSettings(false);
  }

  // Countdown computation
  const countdown = useMemo(() => {
    const now = new Date();
    const target = new Date(targetDate + "T00:00:00");
    const daysLeft = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const remaining = Math.max(0, targetCount - data.attemptedCount);

    // Capacity-adjusted projection: simulate day-by-day
    // Each day, review load from learning problems eats into daily capacity.
    // Remaining capacity goes to new problems. New problems enter learning pool.
    const dailyCapacity = data.avgPerDay;
    const MASTERY_THRESHOLD = 30;

    // Compute average stability of learning problems (used for review frequency estimate)
    const avgLearningStability = data.learningList.length > 0
      ? data.learningList.reduce((sum, p) => sum + p.stability, 0) / data.learningList.length
      : 3; // conservative default for new users

    let learning = data.learningCount;
    let mastered = data.masteredCount;
    let projectedNew = 0;

    // Track stability growth: on average, each review multiplies stability by ~2.5
    // (solved + optimal). A problem "graduates" to mastered when stability >= 30.
    // Avg reviews to mastery from current avg stability:
    let currentAvgStability = avgLearningStability;

    for (let day = 0; day < daysLeft; day++) {
      // Daily reviews needed: each learning problem needs a review every ~stability days
      // Mastered problems rarely need review (every 30+ days)
      const dailyReviews = (learning > 0 ? learning / Math.max(1, currentAvgStability) : 0)
        + (mastered > 0 ? mastered / MASTERY_THRESHOLD : 0);
      const availableForNew = Math.max(0, dailyCapacity - dailyReviews);
      const newToday = Math.min(availableForNew, remaining - projectedNew);

      if (newToday <= 0 && dailyReviews >= dailyCapacity) {
        // Capacity fully consumed by reviews — but stability grows over time
        // so review load will decrease. Keep simulating.
      }

      projectedNew += newToday;
      learning += newToday;

      // Stability grows with each review cycle — problems get easier over time
      // Conservative: avg stability grows ~15% per day of reviews across the pool
      if (learning > 0 && dailyReviews > 0) {
        const reviewedFraction = Math.min(1, dailyReviews / learning);
        // Each reviewed problem's stability grows by ~2.5x, averaged across pool
        currentAvgStability += reviewedFraction * (currentAvgStability * 0.15);
        currentAvgStability = Math.min(currentAvgStability, MASTERY_THRESHOLD * 2);

        // Graduate problems to mastered as avg stability grows
        if (currentAvgStability >= MASTERY_THRESHOLD && learning > 0) {
          // Estimate fraction that would graduate
          const graduateRate = Math.min(learning, Math.ceil(learning * 0.05));
          learning -= graduateRate;
          mastered += graduateRate;
        }
      }
    }

    const projectedRaw = data.attemptedCount + Math.round(projectedNew);
    const projected = Math.min(targetCount, projectedRaw);
    const onTrack = projectedRaw >= targetCount;
    // Effective needed rate: accounts for review load by computing
    // how many new/day you'd need to actually hit the target
    const shortfall = Math.max(0, remaining - Math.round(projectedNew));
    const neededPerDay = daysLeft > 0 ? (remaining + shortfall) / daysLeft : remaining;
    return { daysLeft, remaining, projected, projectedRaw, onTrack, neededPerDay };
  }, [targetDate, targetCount, data.attemptedCount, data.avgPerDay, data.learningCount, data.masteredCount, data.learningList]);

  const weakCategories = useMemo(() =>
    [...data.categoryStats]
      .filter(c => c.attempted > 0)
      .sort((a, b) => a.avgRetention - b.avgRetention)
      .slice(0, 6),
    [data.categoryStats],
  );

  const displayCategories = categoryView === "weak" ? weakCategories : data.categoryStats;

  const sortedReviewQueue = useMemo(() => {
    const q = [...data.reviewQueue];
    if (reviewSort === "overdue") {
      q.sort((a, b) => b.daysOverdue - a.daysOverdue || DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    } else if (reviewSort === "difficulty") {
      q.sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty] || b.daysOverdue - a.daysOverdue);
    } else {
      q.sort((a, b) => a.category.localeCompare(b.category) || b.daysOverdue - a.daysOverdue);
    }
    return q;
  }, [data.reviewQueue, reviewSort]);

  const sortedNewProblems = useMemo(() => {
    const q = [...data.newProblems];
    if (newSort === "hardest") {
      q.sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    }
    // "curriculum" = default order from server (already sorted by id)
    return q;
  }, [data.newProblems, newSort]);

  const filteredReviewQueue = useMemo(() => {
    if (!queueSearch.trim()) return sortedReviewQueue;
    const s = queueSearch.toLowerCase();
    return sortedReviewQueue.filter(
      (item) => item.title.toLowerCase().includes(s) || String(item.leetcodeNumber ?? "").includes(s),
    );
  }, [sortedReviewQueue, queueSearch]);

  const filteredNewProblems = useMemo(() => {
    if (!queueSearch.trim()) return sortedNewProblems;
    const s = queueSearch.toLowerCase();
    return sortedNewProblems.filter(
      (p) => p.title.toLowerCase().includes(s) || String(p.leetcodeNumber ?? "").includes(s),
    );
  }, [sortedNewProblems, queueSearch]);

  const sortedCompleted = useMemo(() => {
    const q = [...data.completedProblems];
    if (completedSort === "retention") {
      q.sort((a, b) => b.retrievability - a.retrievability);
    } else if (completedSort === "review-date") {
      q.sort((a, b) => (a.daysUntilReview ?? 999) - (b.daysUntilReview ?? 999));
    } else {
      q.sort((a, b) => a.category.localeCompare(b.category) || b.retrievability - a.retrievability);
    }
    return q;
  }, [data.completedProblems, completedSort]);

  const filteredCompleted = useMemo(() => {
    if (!queueSearch.trim()) return sortedCompleted;
    const s = queueSearch.toLowerCase();
    return sortedCompleted.filter(
      (p) => p.title.toLowerCase().includes(s) || String(p.leetcodeNumber ?? "").includes(s),
    );
  }, [sortedCompleted, queueSearch]);

  // Drill data — use real API data when authenticated, demo data as fallback
  const allDrills = isDemo ? DEMO_DRILLS : (realDrills ?? []);
  const dueDrills = useMemo(() => allDrills.filter(d => d.dueStatus === "due"), [allDrills]);
  const newDrills = useMemo(() => allDrills.filter(d => d.dueStatus === "new"), [allDrills]);
  const masteredDrills = useMemo(() => allDrills.filter(d => d.dueStatus === "mastered"), [allDrills]);
  const activeDrillList = drillSubTab === "due" ? dueDrills : drillSubTab === "new" ? newDrills : masteredDrills;
  const fluencyStats = isDemo ? DEMO_FLUENCY_STATS : (realFluencyStats ?? DEMO_FLUENCY_STATS);

  // Category summary for grid view
  const drillCategories = useMemo(() => {
    const catMap = new Map<string, { drills: DemoDrill[]; due: number; new_: number; mastered: number }>();
    for (const d of allDrills) {
      if (!catMap.has(d.category)) catMap.set(d.category, { drills: [], due: 0, new_: 0, mastered: 0 });
      const cat = catMap.get(d.category)!;
      cat.drills.push(d);
      if (d.dueStatus === "due") cat.due++;
      else if (d.dueStatus === "new") cat.new_++;
      else cat.mastered++;
    }
    return catMap;
  }, [allDrills]);

  // Drills for selected category grouped by level
  const selectedCategoryDrills = useMemo(() => {
    if (!selectedCategory) return null;
    const catDrills = allDrills.filter(d => d.category === selectedCategory);
    const levels = new Map<number, DemoDrill[]>();
    for (const d of catDrills) {
      if (!levels.has(d.level)) levels.set(d.level, []);
      levels.get(d.level)!.push(d);
    }
    return levels;
  }, [selectedCategory, allDrills]);

  function toggleDrillCategory(cat: string) {
    setExcludedDrillCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      try { localStorage.setItem("aurora-excluded-drill-categories", JSON.stringify([...next])); } catch { /* ok */ }
      return next;
    });
  }

  function startDrillSession(categoryFilter?: string) {
    const pool = categoryFilter
      ? allDrills.filter(d => d.category === categoryFilter)
      : allDrills.filter(d => !excludedDrillCategories.has(d.category));
    const sessionDrills = [...pool.filter(d => d.dueStatus === "due"), ...pool.filter(d => d.dueStatus === "new")].slice(0, 8);
    if (sessionDrills.length === 0) return;

    setDrillCombo(0);
    setDrillAutoContinue(false);
    // Hide syntax ref by default when all drills are L5 (capstone)
    setSyntaxRefEnabled(!sessionDrills.every(d => d.level === 5));
    
    setDrillSession({ active: true, drills: sessionDrills, current: 0, results: [], categoryLabel: categoryFilter });
    setSelectedCategory(null);
    setSingleDrill(null);
    setListMode("drills");
  }

  function handleSingleDrillRate(confidence: DrillConfidence, userCode: string) {
    if (!singleDrill) return;
    if (!isDemo) {
      fetch("/api/drills/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drillId: singleDrill.id,
          userCode,
          confidence,
          sessionPosition: 1,
          categoryStreak: 1,
        }),
      }).then(() => fetchDrills()).catch(() => {});
    }
    setSingleDrill(null);
  }

  function computeCategoryStreak(drills: DemoDrill[], currentIndex: number): number {
    if (currentIndex === 0) return 1;
    const currentCat = drills[currentIndex].category;
    let streak = 1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (drills[i].category === currentCat) streak++;
      else break;
    }
    return streak;
  }

  function handleDrillRate(confidence: DrillConfidence, userCode: string) {
    if (!drillSession) return;
    const currentDrill = drillSession.drills[drillSession.current];
    const newResults = [...drillSession.results, confidence];

    // Mark that user has reviewed at least one drill (used for sound pref reset logic)
    try { localStorage.setItem("drills-has-reviewed", "1"); } catch { /* ok */ }

    // Update combo streak
    const newCombo = confidence >= 3 ? drillCombo + 1 : 0;
    setDrillCombo(newCombo);

    // Play milestone sound at streak thresholds (5, 10, 25)
    if ([5, 10, 25].includes(newCombo)) {
      playSound("milestone", drillMuted);
    }

    // POST attempt to API for authenticated users
    if (!isDemo && currentDrill) {
      const sessionPosition = drillSession.current + 1; // 1-indexed
      const categoryStreak = computeCategoryStreak(drillSession.drills, drillSession.current);
      fetch("/api/drills/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drillId: currentDrill.id,
          userCode,
          confidence,
          sessionPosition,
          categoryStreak,
        }),
      }).then(() => fetchDrills()).catch(() => {});
    }

    if (drillSession.current + 1 >= drillSession.drills.length) {
      // Session complete — show summary modal
      setDrillSession({ ...drillSession, results: newResults, active: false });
    } else {
      setDrillSession({ ...drillSession, current: drillSession.current + 1, results: newResults });
      if (drillScrollRef.current) drillScrollRef.current.scrollTop = 0;
    }
  }

  function handleDrillPrevious() {
    if (!drillSession || drillSession.current === 0) return;
    setDrillSession({ ...drillSession, current: drillSession.current - 1 });
    if (drillScrollRef.current) drillScrollRef.current.scrollTop = 0;
  }

  function handleLoggedFromModal(result: LogModalResult) {
    const problem = logModalProblem;
    setLogModalProblem(null);
    setSrsBanner({
      oldS: result.srs.oldStability,
      newS: result.srs.newStability,
      next: result.srs.nextReviewAt,
      pct: result.srs.masteryPct,
      attemptId: result.attemptId,
      pName: problem?.title ?? "",
      pNum: String(problem?.leetcodeNumber ?? ""),
    });
    // Remove from pending if applicable
    if (problem?.pendingId) {
      setPendingItems((prev) => prev.filter((p) => p.id !== problem.pendingId));
    }
    router.refresh();
  }

  // Demo sign-in prompt overlay
  const [showDemoSignIn, setShowDemoSignIn] = useState(false);

  function demoGuard(action: () => void) {
    if (isDemo) {
      setShowDemoSignIn(true);
      return;
    }
    action();
  }

  return (
    <div className="h-[calc(100dvh-120px)] relative">
    {/* Subtle ambient starfield — fixed, full-viewport, behind all content */}
    <DashboardSkyCanvas />
    {/* All interactive content above the starfield */}
    <div className="relative z-[1] flex flex-col h-full min-h-0">
    {/* Demo sign-in prompt */}
    {showDemoSignIn && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDemoSignIn(false)}>
        <div className="rounded-lg border border-border bg-muted p-6 text-center space-y-3 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground">This is a demo preview</p>
          <h3 className="text-lg font-semibold text-foreground">Sign in to track your progress</h3>
          <p className="text-xs text-muted-foreground">All your data will be synced with spaced repetition scheduling.</p>
          <div className="flex gap-2 justify-center pt-1">
            <Link href="/auth/signin" className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-all duration-150 hover:shadow-[0_0_12px_var(--glow)]">
              Sign in with GitHub
            </Link>
            <button onClick={() => setShowDemoSignIn(false)} className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Keep exploring
            </button>
          </div>
        </div>
      </div>
    )}
    {/* Log Attempt Modal */}
    {logModalProblem && !isDemo && (
      <LogAttemptModal
        problem={logModalProblem}
        onClose={() => setLogModalProblem(null)}
        onLogged={handleLoggedFromModal}
      />
    )}
    {/* SRS Feedback Banner */}
    {srsBanner && <SrsFeedbackBanner {...srsBanner} onDismiss={() => setSrsBanner(null)} onUndo={async () => {
      if (!srsBanner.attemptId) return;
      const res = await fetch(`/api/attempts?id=${srsBanner.attemptId}`, { method: "DELETE" });
      if (res.ok) {
        setSrsBanner(null);
        window.location.reload();
      }
    }} />}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 flex-1 min-h-0 lg:grid-rows-1">
      {/* ── Combined Problem Queue ── */}
      <div className="flex flex-col min-h-0 lg:col-span-6">
        {/* Pending GitHub submissions banner */}
        {pendingItems.length > 0 && (
          <PendingBanner
            items={pendingItems}
            onConfirm={(item) => {
              demoGuard(() => setLogModalProblem({
                problemId: item.problemId,
                title: item.problemTitle,
                leetcodeNumber: item.leetcodeNumber,
                difficulty: item.difficulty,
                isReview: item.isReview,
                attemptDate: item.detectedAt,
                pendingId: item.id,
                source: "github",
              }));
            }}
            onDismiss={async (item) => {
              if (isDemo) { setShowDemoSignIn(true); return; }
              await fetch("/api/pending", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: item.id, action: "dismiss" }),
              });
              setPendingItems((prev) => prev.filter((p) => p.id !== item.id));
            }}
          />
        )}
        <section className="flex flex-col flex-1 min-h-0">
          {/* Tab header — row 1: tabs + search/browse always visible */}
          <div className="flex flex-col gap-1.5 mb-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-0.5 rounded-md border border-border p-0.5">
                <button
                  onClick={() => setListMode("review")}
                  className={`text-sm px-2.5 py-1 rounded transition-colors ${listMode === "review" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Review
                  {data.reviewQueue.length > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${listMode === "review" ? "bg-accent-foreground/20" : "bg-muted"}`}>
                      {data.reviewQueue.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setListMode("new")}
                  className={`text-sm px-2.5 py-1 rounded transition-colors ${listMode === "new" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  New
                  {data.newProblems.length > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${listMode === "new" ? "bg-accent-foreground/20" : "bg-muted"}`}>
                      {data.newProblems.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setListMode("completed")}
                  className={`text-sm px-2.5 py-1 rounded transition-colors ${listMode === "completed" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Done
                  {data.completedProblems.length > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${listMode === "completed" ? "bg-accent-foreground/20" : "bg-muted"}`}>
                      {data.completedProblems.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setListMode("import")}
                  className={`text-sm px-2.5 py-1 rounded transition-colors ${listMode === "import" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Import
                </button>
                <button
                  onClick={() => setListMode("drills")}
                  className={`text-sm px-2.5 py-1 rounded transition-colors ${listMode === "drills" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  🧪 Drills
                  {dueDrills.length > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${listMode === "drills" ? "bg-accent-foreground/20" : "bg-muted"}`}>
                      {dueDrills.length}
                    </span>
                  )}
                </button>
              </div>
              {/* Search + Browse — always visible */}
              <div className="flex items-center gap-1.5 shrink-0">
                {listMode !== "import" && listMode !== "drills" && (
                  <input
                    type="text"
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    placeholder="Filter…"
                    className="h-7 w-24 rounded border border-border bg-background px-2 text-xs placeholder:text-muted-foreground focus:outline-none"
                  />
                )}
                {listMode === "new" && (
                  <Link href="/problems" className="text-xs text-accent hover:underline shrink-0">
                    Browse all →
                  </Link>
                )}
              </div>
            </div>
            {/* Row 2: sort pills — left-aligned, unobtrusive */}
            {listMode === "review" && (
              <div className="flex gap-1">
                {(["overdue", "difficulty", "category"] as ReviewSort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setReviewSort(s)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      reviewSort === s
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "overdue" ? "Oldest" : s === "difficulty" ? "Hardest" : "Category"}
                  </button>
                ))}
              </div>
            )}
            {listMode === "new" && (
              <div className="flex gap-1">
                {(["curriculum", "hardest"] as NewSort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setNewSort(s)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      newSort === s
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "curriculum" ? "Curriculum order" : "Hardest first"}
                  </button>
                ))}
              </div>
            )}
            {listMode === "completed" && (
              <div className="flex gap-1">
                {(["retention", "review-date", "category"] as CompletedSort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setCompletedSort(s)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      completedSort === s
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "retention" ? "Strongest" : s === "review-date" ? "Next review" : "Category"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Review list */}
          {listMode === "review" && (
            data.reviewQueue.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted p-6 text-center">
                <p className="text-sm text-muted-foreground">All caught up! No reviews due.</p>
                <button onClick={() => setListMode("new")} className="mt-2 text-xs text-accent hover:underline">
                  Start a new problem →
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 min-h-0">
                  {filteredReviewQueue.map((item) => {
                    const prio = priorityLevel(item);
                    const catStat = data.categoryStats.find(c => c.category === item.category);
                    const isWeakCategory = catStat && catStat.avgRetention < 0.6;
                    // Build concise "why" reason
                    const reasons: string[] = [];
                    if (item.retrievability < 0.3) reasons.push("Memory nearly gone");
                    else if (item.retrievability < 0.5) reasons.push("Retention dropping fast");
                    if (item.daysOverdue >= 7) reasons.push(`${item.daysOverdue}d past due`);
                    else if (item.daysOverdue >= 2) reasons.push(`${item.daysOverdue}d overdue`);
                    if (isWeakCategory) reasons.push(`${item.category} is weak (${Math.round((catStat?.avgRetention ?? 0) * 100)}%)`);
                    if (item.totalAttempts === 1) reasons.push("Only seen once");
                    if (reasons.length === 0) reasons.push("Scheduled review");
                    return (
                      <div
                        key={item.stateId}
                        className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted transition-colors duration-150"
                      >
                        <StatusDot
                          color={PRIORITY_DOT[prio]}
                          label={prio === "critical" ? "Critical" : prio === "high" ? "Overdue" : prio === "medium" ? "Soon" : "Due"}
                          retrievability={item.retrievability}
                          daysOverdue={item.daysOverdue}
                          priority={prio}
                          whyReasons={reasons}
                        />
                        <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{item.leetcodeNumber}</span>
                        <div className="min-w-0 flex-1">
                          {item.neetcodeUrl ? (
                            <a href={item.neetcodeUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-accent truncate block">
                              {item.title}
                            </a>
                          ) : (
                            <Link href={`/problems/${item.problemId}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                              {item.title}
                            </Link>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {item.category} · {item.totalAttempts} attempt{item.totalAttempts !== 1 ? "s" : ""} · Last: {daysAgoLabel(item.lastReviewedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/problems/${item.problemId}`}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="View problem activity"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                          </Link>
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${PRIORITY_BG[prio]}`}>
                            {item.daysOverdue > 0 ? `${item.daysOverdue}d overdue` : "Due today"}
                          </span>
                          <DifficultyBadge difficulty={item.difficulty} />
                          <button
                            onClick={() => demoGuard(() => setLogModalProblem({
                              problemId: item.problemId,
                              title: item.title,
                              leetcodeNumber: item.leetcodeNumber,
                              difficulty: item.difficulty,
                              isReview: true,
                            }))}
                            className="inline-flex h-7 items-center rounded-md bg-accent px-3 text-xs text-accent-foreground transition-colors hover:opacity-90"
                          >
                            Log
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* New problems list */}
          {listMode === "new" && (
            data.newProblems.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted p-6 text-center">
                <p className="text-sm text-muted-foreground">You&apos;ve attempted every problem!</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 min-h-0">
                  {filteredNewProblems.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted transition-colors duration-150"
                    >
                      <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{p.leetcodeNumber}</span>
                      <div className="min-w-0 flex-1">
                        {p.neetcodeUrl ? (
                          <a href={p.neetcodeUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-accent truncate block">
                            {p.title}
                          </a>
                        ) : (
                          <Link href={`/problems/${p.id}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                            {p.title}
                          </Link>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{p.category}</span>
                          {p.blind75 && <span className="text-xs font-medium text-violet-500">B75</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <DifficultyBadge difficulty={p.difficulty} />
                        <button
                          onClick={() => demoGuard(() => setLogModalProblem({
                            problemId: p.id,
                            title: p.title,
                            leetcodeNumber: p.leetcodeNumber,
                            difficulty: p.difficulty,
                            isReview: false,
                          }))}
                          className="inline-flex h-7 items-center rounded-md border border-border px-3 text-xs text-foreground transition-colors hover:bg-muted"
                        >
                          Log
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Completed problems list */}
          {listMode === "completed" && (
            data.completedProblems.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted p-6 text-center">
                <p className="text-sm text-muted-foreground">No completed problems yet. Start reviewing!</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 min-h-0">
                  {filteredCompleted.map((item) => (
                    <div
                      key={item.problemId}
                      className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted transition-colors duration-150"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${item.bestQuality === "NONE" ? "bg-red-500" : item.stability >= 30 ? "bg-green-500" : retentionBarColor(item.retrievability)}`} />
                      <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{item.leetcodeNumber}</span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/problems/${item.problemId}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                          {item.title}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {item.category} · {item.totalAttempts} attempt{item.totalAttempts !== 1 ? "s" : ""} · Last: {daysAgoLabel(item.lastReviewedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-medium tabular-nums ${retentionColor(item.bestQuality === "NONE" ? 0 : item.retrievability)}`}>
                          {retentionLabel(item.retrievability, item.bestQuality)}
                        </span>
                        <DifficultyBadge difficulty={item.difficulty} />
                        {item.isDue ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-500 font-medium">
                            Due
                          </span>
                        ) : item.daysUntilReview != null && item.daysUntilReview > 0 ? (
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {item.daysUntilReview}d
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Import tab */}
          {listMode === "import" && (
            <ImportClient
              embedded
              onDone={() => setListMode("review")}
              allProblems={data.importProblems}
              attemptedIds={data.importAttemptedIds}
              todayAttemptedIds={data.importTodayAttemptedIds}
            />
          )}

          {/* Drills tab */}
          {listMode === "drills" && (
            /* ── Single drill practice ── */
            singleDrill ? (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <button
                    onClick={() => setSingleDrill(null)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    ← Back
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0">
                  <DrillCard
                    key={singleDrill.id}
                    drill={singleDrill}
                    onRate={handleSingleDrillRate}
                    muted={drillMuted}
                  />
                </div>
              </div>
            ) : drillSession && drillSession.active ? (
              /* Active drill session */
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <SessionHeader
                  current={drillSession.current}
                  total={drillSession.drills.length}
                  combo={drillCombo}
                  results={drillSession.results}
                  autoContinue={drillAutoContinue}
                  muted={drillMuted}
                  syntaxRefEnabled={syntaxRefEnabled}
                  onToggleAutoContinue={() => setDrillAutoContinue(prev => !prev)}
                  onToggleMute={() => {
                    setDrillMuted(prev => {
                      setMutedPref(!prev);
                      return !prev;
                    });
                  }}
                  onToggleSyntaxRef={() => setSyntaxRefEnabled(prev => !prev)}
                  onExit={() => { terminatePyodide(); setDrillSession(null); }}
                  onPrevious={drillSession.current > 0 ? handleDrillPrevious : undefined}
                  categoryLabel={drillSession.categoryLabel}
                />
                {drillSession.current >= 12 && (
                  <p className="text-[10px] text-orange-500">Fatigue note: you&apos;ve done 12+ drills. Quality may decrease — consider stopping.</p>
                )}
                <div ref={drillScrollRef} className="overflow-y-auto flex-1 min-h-0">
                  <DrillCard
                    key={drillSession.drills[drillSession.current].id}
                    drill={drillSession.drills[drillSession.current]}
                    onRate={handleDrillRate}
                    onPrevious={drillSession.current > 0 ? handleDrillPrevious : undefined}
                    muted={drillMuted}
                    autoContinue={drillAutoContinue}
                    position={drillSession.current + 1}
                    total={drillSession.drills.length}
                  />
                </div>

              </div>
            ) : drillSession && !drillSession.active ? (
              /* Session complete — blank backing, modal covers it */
              <>
                <div className="flex-1" />
                <SessionSummary
                  results={drillSession.results}
                  categoryLabel={drillSession.categoryLabel}
                  onDone={() => {
                    
                    setDrillSession(null);
                  }}
                  onKeepGoing={() => {
                    
                    const pool = drillSession.categoryLabel
                      ? allDrills.filter(d => d.category === drillSession.categoryLabel)
                      : allDrills;
                    const moreDrills = [...pool.filter(d => d.dueStatus === "due"), ...pool.filter(d => d.dueStatus === "new")].slice(0, 8);
                    if (moreDrills.length > 0) {
                      setDrillCombo(0);
                      setDrillSession({
                        active: true,
                        drills: moreDrills,
                        current: 0,
                        results: [],
                        categoryLabel: drillSession.categoryLabel,
                      });
                    } else {
                      setDrillSession(null);
                    }
                  }}
                />
              </>
            ) : selectedCategory && selectedCategoryDrills ? (
              /* ── Category detail view ── */
              <div className="flex flex-col flex-1 min-h-0 space-y-2">
                <div className="flex items-center justify-between shrink-0">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    ← All Categories
                  </button>
                  <button
                    onClick={() => demoGuard(() => startDrillSession(selectedCategory))}
                    className="inline-flex h-7 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:opacity-90 gap-1"
                  >
                    Practice {selectedCategory.length > 20 ? selectedCategory.slice(0, 18) + "…" : selectedCategory}
                  </button>
                </div>
                {/* Level unlock chain */}
                <div className="flex items-center gap-1 shrink-0 px-1">
                  {[1, 2, 3, 4].map((level) => {
                    const maxLevel = categoryUnlocks[selectedCategory] ?? 1;
                    const unlocked = level <= maxLevel;
                    const hasLevelDrills = selectedCategoryDrills.has(level);
                    return (
                      <div key={level} className="flex items-center gap-1">
                        {level > 1 && <span className="text-[10px] text-muted-foreground/40">→</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          unlocked
                            ? "bg-accent/20 text-accent"
                            : "bg-muted text-muted-foreground/40"
                        }`}>
                          L{level} {unlocked ? (hasLevelDrills ? "✓" : "") : "🔒"}
                        </span>
                      </div>
                    );
                  })}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    Master L{Math.min((categoryUnlocks[selectedCategory] ?? 1), 3)} to unlock L{Math.min((categoryUnlocks[selectedCategory] ?? 1) + 1, 4)}
                  </span>
                </div>
                {/* Drills grouped by level */}
                <div className="overflow-y-auto flex-1 min-h-0 space-y-3">
                  {[1, 2, 3, 4].map((level) => {
                    const levelDrills = selectedCategoryDrills.get(level);
                    if (!levelDrills) return null;
                    const LEVEL_LABELS: Record<number, string> = { 1: "Syntax", 2: "Variations", 3: "When & Why", 4: "Combine" };
                    return (
                      <div key={level}>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 px-1">
                          L{level}: {LEVEL_LABELS[level] ?? ""}
                        </p>
                        <div className="rounded-lg border border-border overflow-hidden">
                          {levelDrills.map((drill) => (
                            <button
                              key={drill.id}
                              onClick={() => demoGuard(() => setSingleDrill(drill))}
                              className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/80 transition-colors duration-150 text-left"
                            >
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                drill.level === 1 ? "bg-muted text-muted-foreground" :
                                drill.level === 2 ? "bg-accent/30 text-accent" :
                                drill.level === 3 ? "bg-accent/60 text-white" :
                                "bg-accent text-accent-foreground"
                              }`}>
                                L{drill.level}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-foreground truncate block">{drill.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {drill.totalAttempts > 0 ? `${drill.totalAttempts} attempt${drill.totalAttempts !== 1 ? "s" : ""}` : "Not started"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {drill.dueStatus === "due" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-500 font-medium">Due</span>
                                )}
                                {drill.dueStatus === "new" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">New</span>
                                )}
                                {drill.dueStatus === "mastered" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-500 font-medium">✓</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ── Category grid browse ── */
              <div className="flex flex-col flex-1 min-h-0 space-y-2">
                {/* Header: Daily Drill + filter tabs */}
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex gap-0.5 rounded-md border border-border p-0.5">
                    <button
                      onClick={() => setDrillSubTab("due")}
                      className={`text-xs px-2 py-0.5 rounded transition-colors ${drillSubTab === "due" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Due {dueDrills.length > 0 && <span className="ml-0.5 text-[10px]">({dueDrills.length})</span>}
                    </button>
                    <button
                      onClick={() => setDrillSubTab("new")}
                      className={`text-xs px-2 py-0.5 rounded transition-colors ${drillSubTab === "new" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      New {newDrills.length > 0 && <span className="ml-0.5 text-[10px]">({newDrills.length})</span>}
                    </button>
                    <button
                      onClick={() => setDrillSubTab("mastered")}
                      className={`text-xs px-2 py-0.5 rounded transition-colors ${drillSubTab === "mastered" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Mastered
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowCategoryFilter(prev => !prev)}
                      className={`inline-flex h-7 items-center rounded-md border px-2 text-xs transition-colors ${
                        excludedDrillCategories.size > 0
                          ? "border-accent/40 text-accent bg-accent/10"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-accent/40"
                      }`}
                      title="Filter categories"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                      {excludedDrillCategories.size > 0 && (
                        <span className="ml-1 text-[10px]">{excludedDrillCategories.size}</span>
                      )}
                    </button>
                    <button
                      onClick={() => demoGuard(() => startDrillSession())}
                      className="inline-flex h-7 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:opacity-90 gap-1"
                    >
                      <span>⚡</span> Daily Drill
                      <span className="text-[10px] opacity-70">(~10 min)</span>
                    </button>
                  </div>
                </div>

                {/* Category filter panel */}
                {showCategoryFilter && (
                  <div className="rounded-lg border border-border bg-muted p-3 space-y-2 shrink-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-muted-foreground">Include in Daily Drill</p>
                      <button
                        onClick={() => {
                          if (excludedDrillCategories.size > 0) {
                            setExcludedDrillCategories(new Set());
                            try { localStorage.removeItem("aurora-excluded-drill-categories"); } catch { /* ok */ }
                          } else {
                            const allCats = new Set([...drillCategories.keys()]);
                            setExcludedDrillCategories(allCats);
                            try { localStorage.setItem("aurora-excluded-drill-categories", JSON.stringify([...allCats])); } catch { /* ok */ }
                          }
                        }}
                        className="text-[10px] text-accent hover:underline"
                      >
                        {excludedDrillCategories.size > 0 ? "Select all" : "Deselect all"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[...drillCategories.keys()].map(cat => {
                        const isExcluded = excludedDrillCategories.has(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleDrillCategory(cat)}
                            className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                              isExcluded
                                ? "border-border bg-background text-muted-foreground/50 line-through"
                                : "border-accent/30 bg-accent/10 text-foreground"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Error / Loading states */}
                {drillsError ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-1 shrink-0">
                    <p className="text-sm font-medium text-red-500">Could not load drills</p>
                    <p className="text-xs text-muted-foreground font-mono">{drillsError}</p>
                    <button onClick={fetchDrills} className="text-xs text-accent hover:underline mt-1">Retry</button>
                  </div>
                ) : drillsLoading && !realDrills ? (
                  <div className="rounded-lg border border-border bg-muted p-6 text-center shrink-0">
                    <p className="text-sm text-muted-foreground">Loading drills…</p>
                  </div>
                ) : allDrills.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted p-6 text-center shrink-0">
                    <p className="text-sm text-muted-foreground">No drills available.</p>
                  </div>
                ) : (
                  /* Category grid */
                  <div className="overflow-y-auto flex-1 min-h-0">
                    <div className="grid grid-cols-2 gap-2">
                      {[...drillCategories.entries()].map(([catName, cat]) => {
                        const maxLevel = categoryUnlocks[catName] ?? 1;
                        const total = cat.drills.length;
                        const reviewed = cat.drills.filter(d => d.totalAttempts > 0).length;
                        const fluencyCat = fluencyStats.categories.find(c => c.name === catName);
                        const fluency = fluencyCat?.fluency ?? 0;
                        const hasDue = cat.due > 0;
                        // Filter by sub-tab
                        const relevantCount = drillSubTab === "due" ? cat.due : drillSubTab === "new" ? cat.new_ : cat.mastered;

                        return (
                          <button
                            key={catName}
                            onClick={() => setSelectedCategory(catName)}
                            className={`rounded-lg border p-3 text-left transition-all duration-150 hover:border-accent/40 hover:bg-muted/80 ${
                              hasDue && drillSubTab === "due" ? "border-orange-500/20 bg-orange-500/5" : "border-border bg-muted"
                            } ${relevantCount === 0 && drillSubTab !== "due" ? "opacity-50" : ""}`}
                          >
                            <div className="flex items-start justify-between mb-1.5">
                              <span className="text-xs font-medium text-foreground leading-tight">{catName}</span>
                              <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                                fluency >= 0.75 ? "bg-green-500/15 text-green-500" :
                                fluency >= 0.5 ? "bg-emerald-500/15 text-emerald-400" :
                                fluency >= 0.25 ? "bg-amber-500/15 text-amber-500" :
                                "bg-zinc-500/15 text-muted-foreground"
                              }`}>
                                {Math.round(fluency * 100)}%
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="h-1 overflow-hidden rounded-full bg-background mb-1.5">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${fluencyBarColor(fluency)}`}
                                style={{ width: `${Math.max(Math.round(fluency * 100), 2)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">
                                {reviewed}/{total} reviewed
                              </span>
                              <div className="flex items-center gap-1">
                                {/* Level dots */}
                                {[1, 2, 3, 4].map((lvl) => (
                                  <span key={lvl} className={`h-1.5 w-1.5 rounded-full ${
                                    lvl <= maxLevel ? "bg-accent" : "bg-muted-foreground/20"
                                  }`} title={`L${lvl} ${lvl <= maxLevel ? "unlocked" : "locked"}`} />
                                ))}
                              </div>
                            </div>
                            {hasDue && (
                              <span className="text-[10px] text-orange-500 font-medium mt-1 block">{cat.due} due</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Tour overlay — rendered at drills tab level so it shows on tab entry */}
          {listMode === "drills" && showDrillTour && (
            <DrillTour
              muted={drillMuted}
              onToggleMute={() => {
                setDrillMuted(prev => {
                  setMutedPref(!prev);
                  return !prev;
                });
              }}
              onDismiss={() => setShowDrillTour(false)}
              onClose={() => setShowDrillTour(false)}
            />
          )}
        </section>
      </div>

      {/* ── Right Column ── */}
      <div className="flex flex-col lg:col-span-6 min-h-0">
        {listMode === "drills" ? (
          /* ── Right panel when Drills tab active: toggle between Fluency stats and Syntax reference ── */
          <div className="flex flex-col flex-1 min-h-0 gap-0">
            {/* Panel header with flip icon — matches fall recruiting countdown pattern */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <p className="text-xs font-medium text-muted-foreground">
                {rightPanelView === "stats" ? "Fluency Stats" : "Syntax Reference"}
              </p>
              <button
                onClick={() => {
                  const next = rightPanelView === "stats" ? "syntax" : "stats";
                  setRightPanelView(next);
                  try { localStorage.setItem("aurora-right-panel", next); } catch { /* ok */ }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={rightPanelView === "stats" ? "Switch to Syntax Reference" : "Switch to Fluency Stats"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              </button>
            </div>
            {rightPanelView === "syntax" ? (
              !syntaxRefEnabled && drillSession?.active ? (
                <div className="rounded-lg border border-border bg-muted p-4 text-center">
                  <p className="text-xs text-muted-foreground">Syntax reference is hidden for L5 capstone drills.</p>
                  <button
                    onClick={() => setSyntaxRefEnabled(true)}
                    className="mt-2 text-xs text-accent hover:underline"
                  >
                    Show anyway
                  </button>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <SyntaxReferencePanel />
                </div>
              )
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <FluencyPanel stats={fluencyStats} allDrills={allDrills} categoryUnlocks={categoryUnlocks} onSelectCategory={(cat) => { setSelectedCategory(cat); }} />
              </div>
            )}
          </div>
        ) : showStatsDetail ? (
          /* ── Stats Detail (back side) ── */
          <section className="rounded-lg border border-border bg-muted p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">All Stats</p>
              <button
                onClick={() => setShowStatsDetail(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Back to dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              </button>
            </div>

            {/* Pace */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Pace (14 day)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-lg font-bold tabular-nums">{data.avgNewPerDay.toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">new/day</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{data.avgReviewPerDay.toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">reviews/day</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{data.avgPerDay.toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">total/day</p>
                </div>
              </div>
            </div>

            {/* Overall Pace */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Pace (Overall)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-lg font-bold tabular-nums">{data.overallNewPerDay.toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">new/day</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{data.overallReviewPerDay.toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">reviews/day</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{data.overallPerDay.toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">total/day</p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Progress</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-lg font-bold tabular-nums">{data.attemptedCount}/{data.totalProblems}</p>
                  <p className="text-[11px] text-muted-foreground">problems attempted</p>
                </div>
                <div>
                  <p className={`text-lg font-bold tabular-nums ${countdown.onTrack ? "text-green-500" : "text-orange-500"}`}>{countdown.projectedRaw}/{targetCount}</p>
                  <p className="text-[11px] text-muted-foreground">projected by target</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{countdown.neededPerDay.toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">new/day needed</p>
                </div>
              </div>
            </div>

            {/* Retention */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Retention</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-lg font-bold tabular-nums">{data.retainedCount}/{data.attemptedCount}</p>
                  <p className="text-[11px] text-muted-foreground">retained (R &gt; 70%)</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums text-green-500">{data.masteredCount}</p>
                  <p className="text-[11px] text-muted-foreground">mastered (S ≥ 30d)</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums text-accent">{data.learningCount}</p>
                  <p className="text-[11px] text-muted-foreground">learning</p>
                </div>
              </div>
            </div>

            {/* Time */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Time</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-lg font-bold">{formatMinutes(data.totalSolveMinutes)}</p>
                  <p className="text-[11px] text-muted-foreground">total solve time</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{formatMinutes(data.totalStudyMinutes)}</p>
                  <p className="text-[11px] text-muted-foreground">total study time</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{data.avgSolveMinutes > 0 ? `${Math.round(data.avgSolveMinutes)}m` : "—"}</p>
                  <p className="text-[11px] text-muted-foreground">avg solve time</p>
                </div>
              </div>
            </div>

            {/* Streaks & Confidence */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Consistency</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-lg font-bold tabular-nums">🔥 {data.currentStreak}</p>
                  <p className="text-[11px] text-muted-foreground">current streak</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{data.bestStreak}</p>
                  <p className="text-[11px] text-muted-foreground">best streak</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{data.avgConfidence > 0 ? `${data.avgConfidence.toFixed(1)}/5` : "—"}</p>
                  <p className="text-[11px] text-muted-foreground">avg confidence</p>
                </div>
              </div>
            </div>

            {/* Readiness Breakdown */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Readiness ({data.readiness.score}/100 — {data.readiness.tier})</p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <p className="text-lg font-bold tabular-nums">{Math.round(data.readinessBreakdown.coverage * 100)}%</p>
                  <p className="text-[11px] text-muted-foreground">coverage</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{Math.round(data.readinessBreakdown.retention * 100)}%</p>
                  <p className="text-[11px] text-muted-foreground">retention</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{Math.round(data.readinessBreakdown.categoryBalance * 100)}%</p>
                  <p className="text-[11px] text-muted-foreground">category balance</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{Math.round(data.readinessBreakdown.consistency * 100)}%</p>
                  <p className="text-[11px] text-muted-foreground">consistency</p>
                </div>
              </div>
            </div>
          </section>
        ) : (
        <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
        {/* Countdown */}
        <section className="rounded-lg border border-border bg-muted p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">Fall Recruiting Countdown</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs text-muted-foreground hover:text-foreground"
                title="Edit target"
              >
                ⚙
              </button>
              <button
                onClick={() => setShowStatsDetail(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="View all stats"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              </button>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold tabular-nums">{countdown.daysLeft}</span>
            <span className="text-sm text-muted-foreground">days left</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Target: {targetCount} problems by {new Date(targetDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>

          {/* Progress bar */}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
            <div
              className={`h-full rounded-full transition-all duration-300 ${countdown.onTrack ? "bg-green-500" : "bg-orange-500"}`}
              style={{ width: `${Math.min(100, (data.attemptedCount / targetCount) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">{data.attemptedCount} solved</span>
            <span className="text-xs text-muted-foreground">{countdown.remaining} to go</span>
          </div>

          {/* Projection */}
          <div className={`mt-3 rounded-md p-2 text-xs ${countdown.onTrack ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"}`}>
            {countdown.onTrack ? (
              <span>On track — projected {countdown.projectedRaw}/{targetCount} by target date</span>
            ) : (
              <span>Behind — projected {countdown.projectedRaw}/{targetCount} · need {countdown.neededPerDay.toFixed(1)} new problems/day</span>
            )}
          </div>

          {/* Compact stats strip */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${TIER_COLORS[data.readiness.tier]}`}>
                {data.readiness.tier}
              </span>
              <span className="text-xs text-muted-foreground">Readiness</span>
              <InfoTooltip
                content={
                  <div className="space-y-1.5">
                    <p className="font-medium">Readiness Score ({data.readiness.score}/100)</p>
                    <p>Measures how prepared you are overall, based on:</p>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between"><span>Coverage (30%)</span><span>{Math.round(data.readinessBreakdown.coverage * 100)}%</span></div>
                      <div className="flex justify-between"><span>Retention (40%)</span><span>{Math.round(data.readinessBreakdown.retention * 100)}%</span></div>
                      <div className="flex justify-between"><span>Category Balance (20%)</span><span>{Math.round(data.readinessBreakdown.categoryBalance * 100)}%</span></div>
                      <div className="flex justify-between"><span>Consistency (10%)</span><span>{Math.round(data.readinessBreakdown.consistency * 100)}%</span></div>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1">S ≥ 90 · A ≥ 75 · B ≥ 55 · C ≥ 35 · D &lt; 35</p>
                  </div>
                }
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs leading-none">🔥</span>
              <span className="text-xs font-semibold tabular-nums">{data.currentStreak}</span>
              <span className="text-xs text-muted-foreground">streak</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold tabular-nums">{(showOverallPace ? data.overallReviewPerDay : data.avgReviewPerDay).toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">reviews/day</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold tabular-nums">{(showOverallPace ? data.overallNewPerDay : data.avgNewPerDay).toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">new/day</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold tabular-nums">{(showOverallPace ? data.overallPerDay : data.avgPerDay).toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">total/day</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-semibold tabular-nums ${countdown.onTrack ? "text-green-500" : "text-orange-500"}`}>{countdown.projectedRaw}/{targetCount}</span>
              <span className="text-xs text-muted-foreground">projected</span>
            </div>
            <button
              onClick={() => setShowOverallPace(!showOverallPace)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0"
              title={showOverallPace ? "Showing overall averages — click for 14-day" : "Showing 14-day averages — click for overall"}
            >
              <span className="text-[9px] uppercase tracking-wider w-[3.5ch] text-right">{showOverallPace ? "all" : "14d"}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </button>
          </div>

          {/* Settings */}
          {showSettings && (
            <SettingsPanel
              date={targetDate}
              count={targetCount}
              onSave={saveSettings}
              onCancel={() => setShowSettings(false)}
            />
          )}
        </section>



        {/* Activity Chart */}
        <section className="rounded-lg border border-border bg-muted p-3 shrink-0">
          <button
            onClick={() => toggleWidget("activity")}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">Activity</p>
              <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                {(["14d", "30d", "90d", "all"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setActivityRange(r)}
                    className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                      activityRange === r
                        ? "bg-background text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === "all" ? "All" : r}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">{collapsedWidgets.activity ? "▼" : "▲"}</span>
          </button>
          {!collapsedWidgets.activity && (
            <div className="mt-2">
              <ActivityChart history={activityData} />
            </div>
          )}
        </section>

        {/* Mastery Progress */}
        <section className="rounded-lg border border-border bg-muted p-3">
          <button
            onClick={() => toggleWidget("mastery")}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Mastery Progress</p>
              <InfoTooltip
                content={
                  <div className="space-y-1.5">
                    <p className="font-medium">Problem Mastery</p>
                    <p>A problem is <span className="text-green-400 font-medium">mastered</span> when its stability reaches 30+ days — meaning the SRS won&apos;t schedule it again for at least a month.</p>
                    <p><span className="text-accent font-medium">Learning</span> problems have been attempted but haven&apos;t reached that threshold yet.</p>
                    <p className="text-[11px] text-muted-foreground pt-1">Mastered problems only need occasional confirmation to verify retention, especially before interviews.</p>
                  </div>
                }
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{collapsedWidgets.mastery ? "▼" : "▲"}</span>
          </button>
          {!collapsedWidgets.mastery && (
            <div className="mt-2">
              <MasteryProgress
                mastered={data.masteredCount}
                learning={data.learningCount}
                total={data.totalProblems}
                masteryList={data.masteryList}
                learningList={data.learningList}
              />
            </div>
          )}
        </section>

        {/* Category + Difficulty side by side */}
        <section className="rounded-lg border border-border bg-muted p-3">
          <button
            onClick={() => toggleWidget("breakdown")}
            className="flex items-center justify-between w-full"
          >
            <p className="text-xs font-medium text-muted-foreground">Categories &amp; Difficulty</p>
            <span className="text-[10px] text-muted-foreground">{collapsedWidgets.breakdown ? "▼" : "▲"}</span>
          </button>
          {!collapsedWidgets.breakdown && (
          <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Category Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-muted-foreground">Categories</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setCategoryView("weak")}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${categoryView === "weak" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Weakest
                </button>
                <button
                  onClick={() => setCategoryView("all")}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${categoryView === "all" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  All
                </button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {displayCategories.map((cat) => (
                <Link key={cat.category} href={`/problems?category=${encodeURIComponent(cat.category)}`} className="flex items-center gap-2 group/cat cursor-pointer">
                  <span className="text-[11px] w-24 shrink-0 truncate group-hover/cat:text-foreground transition-colors" title={cat.category}>{cat.category}</span>
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background group-hover/cat:h-2 transition-all duration-150">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${retentionBarColor(cat.avgRetention)}`}
                      style={{ width: `${cat.total > 0 ? Math.round((cat.attempted / cat.total) * 100) : 0}%` }}
                    />
                  </div>
                  <span className={`text-[11px] w-10 text-right shrink-0 tabular-nums transition-colors ${cat.attempted > 0 ? retentionColor(cat.avgRetention) : "text-muted-foreground"}`}>
                    <span className="group-hover/cat:hidden">{cat.attempted}/{cat.total}</span>
                    <span className="hidden group-hover/cat:inline">{cat.attempted > 0 ? `${Math.round(cat.avgRetention * 100)}%` : "—"}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Difficulty Progress */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-2">Difficulty</p>
            <div className="space-y-2.5">
              {data.difficultyBreakdown.map((d) => {
                const pct = d.count > 0 ? Math.round((d.attempted / d.count) * 100) : 0;
                return (
                  <Link key={d.difficulty} href={`/problems?difficulty=${d.difficulty}&status=Attempted`} className="flex items-center gap-2 group/diff cursor-pointer">
                    <span className="text-[11px] w-12 shrink-0 group-hover/diff:text-foreground transition-colors">{d.difficulty}</span>
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background group-hover/diff:h-2 transition-all duration-150">
                      <div className={`h-full rounded-full transition-all duration-300 ${DIFF_COLORS[d.difficulty]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground w-10 text-right tabular-nums">
                      <span className="group-hover/diff:hidden">{d.attempted}/{d.count}</span>
                      <span className="hidden group-hover/diff:inline">{pct}%</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          </div>
          )}
        </section>

        </div>
        )}
      </div>
    </div>
    </div>
    </div>
  );
}

/* ── Activity Chart ── */

function ActivityChart({ history }: { history: AttemptDay[] }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Aggregate into weekly buckets if >30 days
  const shouldAggregate = history.length > 30;
  type Bucket = { label: string; count: number; newCount: number; reviewCount: number; dateRange: string; linkDate: string };

  const buckets: Bucket[] = useMemo(() => {
    if (!shouldAggregate) {
      return history.map((day) => {
        const [, m, dd] = day.date.split("-");
        return {
          label: `${parseInt(m)}/${parseInt(dd)}`,
          count: day.count,
          newCount: day.newCount,
          reviewCount: day.reviewCount,
          dateRange: day.date,
          linkDate: day.date,
        };
      });
    }

    // Group into weeks (Mon-Sun)
    const weeks: Bucket[] = [];
    let currentWeek: AttemptDay[] = [];
    let weekStart = "";

    for (const day of history) {
      const d = new Date(day.date + "T12:00:00Z");
      const dow = d.getUTCDay();
      const isMonday = dow === 1;

      if (isMonday && currentWeek.length > 0) {
        const [, m1, d1] = weekStart.split("-");
        const lastDay = currentWeek[currentWeek.length - 1].date;
        const [, m2, d2] = lastDay.split("-");
        weeks.push({
          label: `${parseInt(m1)}/${parseInt(d1)}`,
          count: currentWeek.reduce((s, d) => s + d.count, 0),
          newCount: currentWeek.reduce((s, d) => s + d.newCount, 0),
          reviewCount: currentWeek.reduce((s, d) => s + d.reviewCount, 0),
          dateRange: `${parseInt(m1)}/${parseInt(d1)}–${parseInt(m2)}/${parseInt(d2)}`,
          linkDate: weekStart,
        });
        currentWeek = [];
      }

      if (currentWeek.length === 0) weekStart = day.date;
      currentWeek.push(day);
    }

    // Flush remaining
    if (currentWeek.length > 0) {
      const [, m1, d1] = weekStart.split("-");
      const lastDay = currentWeek[currentWeek.length - 1].date;
      const [, m2, d2] = lastDay.split("-");
      weeks.push({
        label: `${parseInt(m1)}/${parseInt(d1)}`,
        count: currentWeek.reduce((s, d) => s + d.count, 0),
        newCount: currentWeek.reduce((s, d) => s + d.newCount, 0),
        reviewCount: currentWeek.reduce((s, d) => s + d.reviewCount, 0),
        dateRange: `${parseInt(m1)}/${parseInt(d1)}–${parseInt(m2)}/${parseInt(d2)}`,
        linkDate: weekStart,
      });
    }

    return weeks;
  }, [history, shouldAggregate]);

  const max = Math.max(...buckets.map((d) => d.count), 1);
  const MAX_BAR_PX = 44;
  const showCounts = buckets.length <= 21;

  return (
    <div>
      <div className="flex items-end gap-0.5" style={{ minHeight: MAX_BAR_PX + 28 }}>
        {buckets.map((bucket, idx) => {
          const barPx = bucket.count > 0
            ? Math.max(Math.round((bucket.count / max) * MAX_BAR_PX), 4)
            : 3;
          const reviewPx = bucket.count > 0
            ? Math.round((bucket.reviewCount / bucket.count) * barPx)
            : 0;
          const isCurrentWeek = !shouldAggregate && bucket.linkDate === todayStr;
          // Show every label for ≤30 buckets, otherwise evenly spaced
          const showThisLabel = buckets.length <= 30 || (idx % Math.ceil(buckets.length / 12) === 0) || idx === buckets.length - 1;
          return (
            <Link
              key={bucket.linkDate}
              href={`/activity?date=${bucket.linkDate}${shouldAggregate ? "&range=week" : ""}`}
              className="flex flex-1 flex-col items-center justify-end gap-0.5 cursor-pointer group"
              title={`${bucket.dateRange}: ${bucket.count > 0 ? `${bucket.newCount} new · ${bucket.reviewCount} review` : "no activity"}`}
            >
              {showCounts && bucket.count > 0 && (
                <span className="text-[10px] text-muted-foreground leading-none tabular-nums group-hover:text-foreground transition-colors">{bucket.count}</span>
              )}
              {bucket.count > 0 ? (
                <div className="w-full flex flex-col transition-all duration-150 group-hover:scale-x-110">
                  {bucket.newCount > 0 && (
                    <div
                      className="w-full rounded-t-sm bg-green-500 group-hover:brightness-125"
                      style={{ height: `${barPx - reviewPx}px` }}
                    />
                  )}
                  {bucket.reviewCount > 0 && (
                    <div
                      className={`w-full bg-accent group-hover:brightness-125 ${bucket.newCount === 0 ? "rounded-t-sm" : ""}`}
                      style={{ height: `${reviewPx}px` }}
                    />
                  )}
                </div>
              ) : (
                <div
                  className="w-full rounded-t-sm bg-border/40 group-hover:bg-border/60 transition-all duration-150"
                  style={{ height: `${barPx}px` }}
                />
              )}
              {showThisLabel && (
                <span className={`text-[9px] leading-none tabular-nums transition-colors ${isCurrentWeek ? "text-accent font-semibold" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {bucket.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-1.5 justify-end">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-sm bg-green-500" /> New
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-sm bg-accent" /> Review
        </span>
        {shouldAggregate && (
          <span className="text-[10px] text-muted-foreground ml-1">(weekly)</span>
        )}
      </div>
    </div>
  );
}

/* ── Review Urgency Bar ── */

function ReviewUrgencyBar({ queue }: { queue: ReviewItem[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const counts = { critical: 0, high: 0, medium: 0, due: 0 };
  queue.forEach(item => { counts[priorityLevel(item)]++; });
  const total = queue.length;

  const segments = [
    { key: "critical", label: "Critical", desc: "5+ days overdue or <25% retention", color: "bg-red-500", count: counts.critical },
    { key: "high", label: "Overdue", desc: "1-5 days overdue or <45% retention", color: "bg-orange-500", count: counts.high },
    { key: "medium", label: "Soon", desc: "Due within a day", color: "bg-amber-400", count: counts.medium },
    { key: "due", label: "Due", desc: "Due today", color: "bg-sky-400", count: counts.due },
  ].filter(s => s.count > 0);

  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-background">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`${s.color} transition-all duration-300 cursor-pointer ${hovered && hovered !== s.key ? "opacity-40" : ""}`}
            style={{ width: `${(s.count / total) * 100}%` }}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
      <div className="flex gap-3 mt-1.5">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`flex items-center gap-1 transition-opacity duration-150 ${hovered && hovered !== s.key ? "opacity-40" : ""}`}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
            <span className="text-[10px] text-muted-foreground">
              {s.count} {s.label}
              {hovered === s.key && <span className="text-foreground/60"> — {s.desc}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Status Dot (hover tooltip) ── */

function StatusDot({
  color,
  label,
  retrievability,
  daysOverdue,
  priority,
  whyReasons,
}: {
  color: string;
  label: string;
  retrievability: number;
  daysOverdue: number;
  priority: "critical" | "high" | "medium" | "due";
  whyReasons: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    }
  }, []);

  const sizeClass = priority === "critical" ? "w-2.5 h-2.5" : "w-2 h-2";
  const pulseClass = priority === "critical" ? "dot-critical" : "";
  const ringClass = priority === "high" ? "ring-1 ring-orange-500/50" : "";

  return (
    <div
      ref={ref}
      className={`${sizeClass} rounded-full shrink-0 cursor-help ${color} ${pulseClass} ${ringClass}`}
      onMouseEnter={() => { updatePos(); setOpen(true); }}
      onMouseLeave={() => setOpen(false)}
    >
      {open && pos && createPortal(
        <div
          className="fixed z-[9999] w-44 rounded-lg border border-border bg-muted p-2.5 text-xs text-foreground shadow-lg"
          style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
        >
          <p className="font-medium mb-1">{label}</p>
          <div className="space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Retention</span>
              <span className={retentionColor(retrievability)}>{Math.round(retrievability * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overdue</span>
              <span>{daysOverdue > 0 ? `${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}` : "Due today"}</span>
            </div>
          </div>
          {whyReasons.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground mb-0.5">Why now</p>
              {whyReasons.map((r, i) => (
                <p key={i} className="text-[11px] text-foreground/80">• {r}</p>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ── Settings Panel ── */

function SettingsPanel({
  date,
  count,
  onSave,
  onCancel,
}: {
  date: string;
  count: number;
  onSave: (date: string, count: number) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState(date);
  const [c, setC] = useState(count);

  return (
    <div className="mt-3 rounded-md border border-border bg-background p-3 space-y-2">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Target Date</label>
        <input
          type="date"
          value={d}
          onChange={(e) => setD(e.target.value)}
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Target Problems</label>
        <input
          type="number"
          min={1}
          max={500}
          value={c}
          onChange={(e) => setC(Number(e.target.value))}
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(d, c)}
          className="inline-flex h-7 items-center rounded-md bg-accent px-3 text-xs text-accent-foreground hover:opacity-90"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="inline-flex h-7 items-center rounded-md border border-border px-3 text-xs text-foreground hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Info Tooltip ── */

function InfoTooltip({ content }: { content: React.ReactNode }) {
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
        aria-label="More info"
      >
        i
      </span>
      {open && pos && createPortal(
        <div
          className="fixed z-[9999] w-64 rounded-lg border border-border bg-muted p-3 text-xs text-foreground shadow-lg"
          style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
        >
          {content}
        </div>,
        document.body,
      )}
    </span>
  );
}

/* ── Mastery Progress ── */

const MASTERY_THRESHOLD = 30; // stability in days

function MasteryProgress({
  mastered,
  learning,
  total,
  masteryList,
  learningList,
}: {
  mastered: number;
  learning: number;
  total: number;
  masteryList: MasteryItem[];
  learningList: MasteryItem[];
}) {
  const [showAll, setShowAll] = useState(false);
  const newCount = total - mastered - learning;
  const masteredPct = total > 0 ? (mastered / total) * 100 : 0;
  const learningPct = total > 0 ? (learning / total) * 100 : 0;
  const displayLearning = showAll ? learningList : learningList.slice(0, 5);

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-2.5 overflow-hidden rounded-full bg-background group/mastery cursor-default">
        {masteredPct > 0 && (
          <div className="bg-green-500 transition-all duration-300 group-hover/mastery:brightness-125" style={{ width: `${masteredPct}%` }} />
        )}
        {learningPct > 0 && (
          <div className="bg-accent transition-all duration-300 group-hover/mastery:brightness-125" style={{ width: `${learningPct}%` }} />
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-1.5">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[11px] text-muted-foreground">{mastered} Mastered <span className="text-foreground/50">({masteredPct.toFixed(0)}%)</span></span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-[11px] text-muted-foreground">{learning} Learning</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-border" />
          <span className="text-[11px] text-muted-foreground">{newCount} New</span>
        </div>
      </div>

      {/* Recently mastered list */}
      {masteryList.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground mb-1">Recently mastered</p>
          <div className="space-y-0.5">
            {masteryList.slice(0, 5).map((item) => (
              <Link key={item.leetcodeNumber ?? item.title} href={`/problems/${item.problemId}`} className="flex items-center gap-1.5 text-xs hover:bg-background/50 rounded px-1 -mx-1 transition-colors">
                <span className="text-green-500">✓</span>
                <span className="text-muted-foreground tabular-nums w-6 shrink-0">{item.leetcodeNumber}</span>
                <span className="truncate">{item.title}</span>
                <span className="ml-auto text-muted-foreground text-[11px]">{Math.round(item.stability)}d</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Learning problems — stability progress toward 30d */}
      {learningList.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground mb-1">Learning — stability toward 30d</p>
          <div className="space-y-1">
            {displayLearning.map((item) => {
              const pct = Math.min(100, (item.stability / MASTERY_THRESHOLD) * 100);
              return (
                <Link key={item.leetcodeNumber ?? item.title} href={`/problems/${item.problemId}`} className="flex items-center gap-1.5 text-xs group/learn hover:bg-background/50 rounded px-1 -mx-1 transition-colors">
                  <span className="text-muted-foreground tabular-nums w-6 shrink-0">{item.leetcodeNumber}</span>
                  <span className="w-32 shrink-0 truncate group-hover/learn:text-foreground transition-colors" title={item.title}>{item.title}</span>
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background group-hover/learn:h-2 transition-all duration-150">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-[11px] tabular-nums w-10 text-right shrink-0">{item.stability.toFixed(1)}d</span>
                </Link>
              );
            })}
          </div>
          {learningList.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[11px] text-muted-foreground hover:text-foreground mt-1"
            >
              {showAll ? "Show less" : `Show all ${learningList.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── SRS Feedback Banner ── */

function SrsFeedbackBanner({
  oldS,
  newS,
  next,
  pct,
  attemptId,
  pName,
  pNum,
  onDismiss,
  onUndo,
}: {
  oldS: number;
  newS: number;
  next: string;
  pct: number;
  attemptId: string;
  pName: string;
  pNum: string;
  onDismiss: () => void;
  onUndo: () => void;
}) {
  const nextDate = new Date(next);
  const now = new Date();
  const diffDays = Math.round((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const nextLabel = diffDays <= 0 ? "now" : diffDays === 1 ? "tomorrow" : `in ${diffDays}d`;
  const grew = newS > oldS;
  const isFirst = oldS === 0;
  const problemLabel = pNum ? `${pNum}. ${pName}` : pName;

  return (
    <div className="mb-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 flex items-center gap-4 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <span className="text-foreground font-medium shrink-0">{problemLabel || "Saved"}</span>
      <span className="text-muted-foreground">
        Stability{" "}
        {isFirst ? (
          <span className="text-accent font-medium">{newS}d</span>
        ) : (
          <>
            {oldS}d → <span className={grew ? "text-green-500 font-medium" : "text-orange-500 font-medium"}>{newS}d</span>
          </>
        )}
      </span>
      <span className="text-muted-foreground">Next: {nextLabel}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-green-500" : "bg-accent"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">{pct}%</span>
      </div>
      <button onClick={onUndo} className="text-orange-500 hover:text-orange-400 text-xs font-medium shrink-0">Undo</button>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
    </div>
  );
}

/* ── Fluency Panel (right column when Drills tab is active) ── */

const FLUENCY_TIER_COLORS: Record<string, string> = {
  S: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  A: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  B: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  C: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  D: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
};

function fluencyBarColor(f: number): string {
  if (f >= 0.8) return "bg-green-500";
  if (f >= 0.6) return "bg-emerald-400";
  if (f >= 0.4) return "bg-amber-500";
  if (f >= 0.2) return "bg-orange-500";
  return "bg-red-500";
}

function FluencyPanel({ stats, allDrills, categoryUnlocks, onSelectCategory }: {
  stats: { overallTier: string; categories: DemoFluencyCategory[] };
  allDrills: DemoDrill[];
  categoryUnlocks: Record<string, number>;
  onSelectCategory: (cat: string) => void;
}) {
  const weakest = [...stats.categories].sort((a, b) => a.fluency - b.fluency)[0];
  const strongest = [...stats.categories].sort((a, b) => b.fluency - a.fluency)[0];
  const totalDue = stats.categories.reduce((sum, c) => sum + c.drillsDue, 0);
  const totalMastered = stats.categories.reduce((sum, c) => sum + c.mastered, 0);
  const totalDrills = stats.categories.reduce((sum, c) => sum + c.totalDrills, 0);

  // Compute actionable next steps
  const actions: { text: string; cat: string; priority: number }[] = [];
  for (const cat of stats.categories) {
    if (cat.drillsDue > 0) {
      actions.push({ text: `${cat.drillsDue} due in ${cat.name}`, cat: cat.name, priority: 3 });
    }
    const maxLevel = categoryUnlocks[cat.name] ?? 1;
    if (maxLevel < 4) {
      const catDrills = allDrills.filter(d => d.category === cat.name && d.level === maxLevel);
      const unreviewed = catDrills.filter(d => d.totalAttempts === 0).length;
      if (unreviewed > 0 && cat.fluency < 0.5) {
        actions.push({ text: `${cat.name}: ${unreviewed} L${maxLevel} drills to start`, cat: cat.name, priority: 2 });
      }
    }
  }
  actions.sort((a, b) => b.priority - a.priority);
  const topActions = actions.slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Overall Tier */}
      <section className="rounded-lg border border-border bg-muted p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Syntax Fluency</p>
        <div className="flex items-center gap-4">
          <div className={`h-16 w-16 rounded-xl border-2 flex items-center justify-center text-3xl font-bold ${FLUENCY_TIER_COLORS[stats.overallTier] || FLUENCY_TIER_COLORS.D}`}>
            {stats.overallTier}
          </div>
          <div className="space-y-1">
            <div className="flex gap-4 text-xs">
              <div>
                <span className="text-lg font-bold tabular-nums text-foreground">{totalDue}</span>
                <span className="text-muted-foreground ml-1">due</span>
              </div>
              <div>
                <span className="text-lg font-bold tabular-nums text-green-500">{totalMastered}</span>
                <span className="text-muted-foreground ml-1">mastered</span>
              </div>
              <div>
                <span className="text-lg font-bold tabular-nums text-foreground">{totalDrills}</span>
                <span className="text-muted-foreground ml-1">total</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              S ≥ 90% · A ≥ 75% · B ≥ 55% · C ≥ 35% · D &lt; 35%
            </p>
          </div>
        </div>
      </section>

      {/* Actionable next steps */}
      {topActions.length > 0 && (
        <section className="rounded-lg border border-accent/20 bg-accent/5 p-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Next Steps</p>
          <div className="space-y-1.5">
            {topActions.map((action, i) => (
              <button
                key={i}
                onClick={() => onSelectCategory(action.cat)}
                className="w-full text-left text-xs text-foreground hover:text-accent transition-colors flex items-center gap-2"
              >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${action.priority >= 3 ? "bg-orange-500" : "bg-accent"}`} />
                {action.text}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Per-category fluency bars */}
      <section className="rounded-lg border border-border bg-muted p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Category Fluency</p>
        <div className="space-y-2">
          {stats.categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-[11px] w-28 shrink-0 truncate text-left" title={cat.name}>{cat.name}</span>
              <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${fluencyBarColor(cat.fluency)}`}
                  style={{ width: `${Math.round(cat.fluency * 100)}%` }}
                />
              </div>
              <span className="text-[11px] w-8 text-right shrink-0 tabular-nums text-muted-foreground">{Math.round(cat.fluency * 100)}%</span>
            </button>
          ))}
        </div>
      </section>

      {/* Weakest / Strongest */}
      <section className="rounded-lg border border-border bg-muted p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Weakest</p>
            {weakest && (
              <button onClick={() => onSelectCategory(weakest.name)} className="text-left hover:opacity-80 transition-opacity">
                <p className="text-sm font-medium text-orange-500">{weakest.name}</p>
                <p className="text-xs text-muted-foreground">{Math.round(weakest.fluency * 100)}% · {weakest.drillsDue} due</p>
              </button>
            )}
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Strongest</p>
            {strongest && (
              <button onClick={() => onSelectCategory(strongest.name)} className="text-left hover:opacity-80 transition-opacity">
                <p className="text-sm font-medium text-green-500">{strongest.name}</p>
                <p className="text-xs text-muted-foreground">{Math.round(strongest.fluency * 100)}% · {strongest.mastered} mastered</p>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Pending Submissions Banner ── */

function PendingBanner({
  items,
  onConfirm,
  onDismiss,
}: {
  items: PendingItem[];
  onConfirm: (item: PendingItem) => void;
  onDismiss: (item: PendingItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-2 rounded-lg border border-violet-500/30 bg-violet-500/5 overflow-hidden shrink-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-violet-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white px-1.5">
            {items.length}
          </span>
          <span className="text-foreground font-medium">
            {items.length === 1 ? "New submission detected" : `${items.length} new submissions detected`}
          </span>
          <span className="text-xs text-muted-foreground">from GitHub</span>
        </div>
        <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-violet-500/20">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-b-0 transition-colors hover:bg-muted/50"
            >
              <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{item.leetcodeNumber}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/problems/${item.problemId}`} className="text-sm font-medium text-foreground hover:text-accent truncate block">
                  {item.problemTitle}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {item.category} · {item.isReview ? "Review" : "First attempt"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <DifficultyBadge difficulty={item.difficulty} />
                <button
                  onClick={() => onConfirm(item)}
                  className="inline-flex h-7 items-center rounded-md bg-accent px-2.5 text-xs text-accent-foreground transition-colors hover:opacity-90"
                >
                  Log
                </button>
                <button
                  onClick={() => onDismiss(item)}
                  className="inline-flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
