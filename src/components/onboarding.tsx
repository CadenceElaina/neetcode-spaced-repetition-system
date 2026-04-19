"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

const ONBOARDING_KEY = "aurora_onboarding_complete";

/* ── Simulated mid-semester review queue data ── */
const MOCK_REVIEW_ITEMS = [
  { num: 1, title: "Two Sum", difficulty: "Easy" as const, category: "Arrays & Hashing", attempts: 3, lastSeen: "5d ago", daysOverdue: 3, retention: 52, prio: "high" as const },
  { num: 206, title: "Reverse Linked List", difficulty: "Easy" as const, category: "Linked List", attempts: 2, lastSeen: "8d ago", daysOverdue: 6, retention: 44, prio: "critical" as const },
  { num: 20, title: "Valid Parentheses", difficulty: "Easy" as const, category: "Stack", attempts: 4, lastSeen: "3d ago", daysOverdue: 1, retention: 61, prio: "medium" as const },
  { num: 15, title: "3Sum", difficulty: "Medium" as const, category: "Two Pointers", attempts: 1, lastSeen: "12d ago", daysOverdue: 9, retention: 38, prio: "critical" as const },
  { num: 102, title: "Binary Tree Level Order", difficulty: "Medium" as const, category: "Trees", attempts: 3, lastSeen: "4d ago", daysOverdue: 2, retention: 67, prio: "medium" as const },
  { num: 200, title: "Number of Islands", difficulty: "Medium" as const, category: "Graphs", attempts: 2, lastSeen: "7d ago", daysOverdue: 4, retention: 55, prio: "high" as const },
  { num: 155, title: "Min Stack", difficulty: "Medium" as const, category: "Stack", attempts: 2, lastSeen: "6d ago", daysOverdue: 3, retention: 48, prio: "high" as const },
];

const OVERDUE_BG: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-400 text-black",
};

const DOT_COLOR: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
};

const DIFF_BG: Record<string, string> = {
  Easy: "bg-green-500/15 text-green-400",
  Medium: "bg-yellow-500/15 text-yellow-400",
};

/* ── Animated log sequence ── */
const LOG_STEPS = [
  { section: "outcome", label: "How did it go?", options: ["Couldn\u2019t solve", "Partial / Hint", "Solved"], active: 2 },
  { section: "quality", label: "Solution quality?", options: ["Optimal", "Suboptimal", "Brute Force"], active: 0 },
  { section: "confidence", label: "Confidence", options: ["1", "2", "3", "4", "5"], active: 3 },
  { section: "time", label: "Time spent", options: ["<5m", "5-15m", "15-30m", "30m+"], active: 1 },
  { section: "saving", label: "Saving\u2026", options: [], active: -1 },
  { section: "done", label: "Logged!", options: [], active: -1 },
];

/* ── Activity data per tier frame (14 days: 4/3 – 4/16) ── */
const ACTIVITY_DATES = ["4/3", "4/4", "4/5", "4/6", "4/7", "4/8", "4/9", "4/10", "4/11", "4/12", "4/13", "4/14", "4/15", "4/16"];
const ACTIVITY_DATA: { n: number; r: number }[][] = [
  // Frame 0 (D, 4 solved): very sparse
  [{ n: 0, r: 0 }, { n: 1, r: 0 }, { n: 0, r: 0 }, { n: 0, r: 0 }, { n: 1, r: 0 }, { n: 0, r: 0 }, { n: 0, r: 0 }, { n: 1, r: 0 }, { n: 0, r: 0 }, { n: 0, r: 0 }, { n: 1, r: 0 }, { n: 0, r: 0 }, { n: 0, r: 0 }, { n: 0, r: 0 }],
  // Frame 1 (D, 8 solved): picking up
  [{ n: 0, r: 0 }, { n: 1, r: 0 }, { n: 0, r: 1 }, { n: 1, r: 0 }, { n: 0, r: 1 }, { n: 1, r: 0 }, { n: 0, r: 0 }, { n: 1, r: 1 }, { n: 0, r: 0 }, { n: 1, r: 0 }, { n: 0, r: 1 }, { n: 1, r: 0 }, { n: 0, r: 0 }, { n: 0, r: 1 }],
  // Frame 2 (C, 16 solved): regular
  [{ n: 1, r: 1 }, { n: 0, r: 1 }, { n: 1, r: 1 }, { n: 0, r: 2 }, { n: 1, r: 1 }, { n: 1, r: 2 }, { n: 0, r: 1 }, { n: 1, r: 1 }, { n: 1, r: 2 }, { n: 0, r: 1 }, { n: 1, r: 1 }, { n: 0, r: 2 }, { n: 1, r: 1 }, { n: 1, r: 1 }],
  // Frame 3 (B, 28 solved): consistent
  [{ n: 1, r: 2 }, { n: 1, r: 1 }, { n: 0, r: 3 }, { n: 1, r: 2 }, { n: 1, r: 2 }, { n: 2, r: 3 }, { n: 1, r: 2 }, { n: 0, r: 3 }, { n: 1, r: 2 }, { n: 1, r: 1 }, { n: 1, r: 3 }, { n: 1, r: 2 }, { n: 0, r: 2 }, { n: 1, r: 2 }],
  // Frame 4 (A, 38 solved): strong
  [{ n: 1, r: 3 }, { n: 0, r: 3 }, { n: 1, r: 2 }, { n: 1, r: 3 }, { n: 0, r: 4 }, { n: 1, r: 3 }, { n: 1, r: 4 }, { n: 0, r: 3 }, { n: 1, r: 3 }, { n: 1, r: 2 }, { n: 0, r: 4 }, { n: 1, r: 3 }, { n: 1, r: 3 }, { n: 0, r: 4 }],
  // Frame 5 (S, 48 solved): peak
  [{ n: 0, r: 4 }, { n: 1, r: 3 }, { n: 0, r: 5 }, { n: 0, r: 4 }, { n: 1, r: 4 }, { n: 0, r: 5 }, { n: 0, r: 4 }, { n: 1, r: 3 }, { n: 0, r: 5 }, { n: 0, r: 4 }, { n: 1, r: 4 }, { n: 0, r: 5 }, { n: 0, r: 4 }, { n: 0, r: 5 }],
];

/* ── Category data per tier frame ── */
const CATEGORIES = [
  { name: "Arrays & Hashing", total: 8 },
  { name: "Two Pointers", total: 5 },
  { name: "Stack", total: 5 },
  { name: "Binary Search", total: 5 },
  { name: "Trees", total: 5 },
  { name: "Linked List", total: 4 },
];
const CAT_ATTEMPTED = [
  [1, 0, 1, 1, 1, 0],   // frame 0 (4 total)
  [2, 1, 2, 1, 1, 1],   // frame 1 (8)
  [4, 3, 3, 2, 2, 2],   // frame 2 (16)
  [7, 4, 5, 4, 4, 4],   // frame 3 (28)
  [8, 5, 5, 5, 5, 4],   // frame 4 (32 of these cats)
  [8, 5, 5, 5, 5, 4],   // frame 5 (all in these cats)
];
/* Retention color for category bars */
function catBarColor(frame: number): string {
  if (frame >= 4) return "bg-green-500";
  if (frame >= 2) return "bg-emerald-500";
  return "bg-orange-500";
}

/* ── Difficulty data per tier frame ── */
const DIFF_ATTEMPTED = [
  { easy: 2, medium: 2, hard: 0 },
  { easy: 4, medium: 4, hard: 0 },
  { easy: 8, medium: 8, hard: 0 },
  { easy: 12, medium: 16, hard: 0 },
  { easy: 14, medium: 24, hard: 0 },
  { easy: 15, medium: 33, hard: 0 },
];
const DIFF_TOTALS = { easy: 45, medium: 105, hard: 0 };
const DIFF_BAR_COLORS: Record<string, string> = {
  Easy: "bg-green-500",
  Medium: "bg-yellow-500",
  Hard: "bg-red-500",
};

/* ── Animated tier progression for stats overlay ── */
const TIER_PROGRESSION = [
  { tier: "D", score: 18, solved: 4, mastered: 0, learning: 4, streak: 1, reviewDay: 0.8, newDay: 0.5, coverage: 8, retention: 30, balance: 15, consistency: 20, daysLeft: 100, weeksIn: 2 },
  { tier: "D", score: 28, solved: 8, mastered: 0, learning: 8, streak: 3, reviewDay: 1.2, newDay: 0.7, coverage: 16, retention: 38, balance: 25, consistency: 35, daysLeft: 82, weeksIn: 5 },
  { tier: "C", score: 42, solved: 16, mastered: 2, learning: 14, streak: 5, reviewDay: 2.1, newDay: 0.9, coverage: 32, retention: 52, balance: 40, consistency: 50, daysLeft: 62, weeksIn: 8 },
  { tier: "B", score: 62, solved: 28, mastered: 8, learning: 20, streak: 9, reviewDay: 3.2, newDay: 1.1, coverage: 56, retention: 68, balance: 62, consistency: 70, daysLeft: 42, weeksIn: 10 },
  { tier: "A", score: 78, solved: 38, mastered: 18, learning: 20, streak: 14, reviewDay: 3.8, newDay: 0.8, coverage: 76, retention: 82, balance: 75, consistency: 85, daysLeft: 22, weeksIn: 13 },
  { tier: "S", score: 93, solved: 48, mastered: 32, learning: 16, streak: 21, reviewDay: 4.2, newDay: 0.4, coverage: 96, retention: 95, balance: 90, consistency: 95, daysLeft: 5, weeksIn: 16 },
];

const TIER_BADGE_BG: Record<string, string> = {
  S: "bg-violet-500 text-white",
  A: "bg-blue-500 text-white",
  B: "bg-emerald-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-zinc-400 text-white",
};

const TIER_BAR_COLOR: Record<string, string> = {
  S: "bg-violet-500",
  A: "bg-blue-500",
  B: "bg-emerald-500",
  C: "bg-amber-500",
  D: "bg-zinc-400",
};

type Rect = { top: number; left: number; width: number; height: number };

/* ── Step definitions ── */
const STEPS = [
  {
    title: "Welcome to Aurora",
    body: "Aurora uses spaced repetition to help you retain DSA concepts. The algorithm schedules reviews based on how well you remember each problem — so you focus on what needs work.",
    target: null as string | null,
    side: "center" as const,
  },
  {
    title: "Your Review Queue",
    body: "",
    target: "queue",
    side: "right" as const,
  },
  {
    title: "Log Attempts in Seconds",
    body: "",
    target: "queue",
    side: "right" as const,
  },
  {
    title: "Track Your Progress",
    body: "",
    target: "stats",
    side: "left" as const,
  },
];

export function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [rects, setRects] = useState<{ queue: Rect | null; stats: Rect | null }>({ queue: null, stats: null });
  const [logFrame, setLogFrame] = useState(0);
  const [tierFrame, setTierFrame] = useState(0);
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tierIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const measure = useCallback(() => {
    const q = document.querySelector("[data-onboarding='queue']");
    const s = document.querySelector("[data-onboarding='stats']");
    setRects({
      queue: q ? q.getBoundingClientRect() : null,
      stats: s ? s.getBoundingClientRect() : null,
    });
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      const t = setTimeout(() => { setShow(true); measure(); }, 400);
      return () => clearTimeout(t);
    }
  }, [measure]);

  useEffect(() => {
    if (!show) return;
    const handler = () => measure();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [show, measure]);

  useEffect(() => { if (show) measure(); }, [step, show, measure]);

  // Log animation (step 2)
  useEffect(() => {
    if (step === 2 && show) {
      setLogFrame(0);
      logIntervalRef.current = setInterval(() => {
        setLogFrame((f) => (f + 1) % LOG_STEPS.length);
      }, 1400);
      return () => { if (logIntervalRef.current) clearInterval(logIntervalRef.current); };
    } else {
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    }
  }, [step, show]);

  // Tier animation (step 3)
  useEffect(() => {
    if (step === 3 && show) {
      setTierFrame(0);
      tierIntervalRef.current = setInterval(() => {
        setTierFrame((f) => (f + 1) % TIER_PROGRESSION.length);
      }, 1200);
      return () => { if (tierIntervalRef.current) clearInterval(tierIntervalRef.current); };
    } else {
      if (tierIntervalRef.current) clearInterval(tierIntervalRef.current);
    }
  }, [step, show]);

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const targetRect = current.target ? rects[current.target as "queue" | "stats"] : null;

  // Modal position
  const modalPositionStyle: React.CSSProperties = {};
  const MODAL_WIDTH = 360;
  const GAP = 16;

  if (current.side === "center" || !targetRect) {
    modalPositionStyle.position = "fixed";
    modalPositionStyle.top = "50%";
    modalPositionStyle.left = "50%";
    modalPositionStyle.transform = "translate(-50%, -50%)";
  } else if (current.side === "right") {
    modalPositionStyle.position = "fixed";
    modalPositionStyle.top = Math.max(GAP, targetRect.top + 20);
    modalPositionStyle.left = Math.min(targetRect.left + targetRect.width + GAP, window.innerWidth - MODAL_WIDTH - GAP);
  } else {
    modalPositionStyle.position = "fixed";
    modalPositionStyle.top = Math.max(GAP, targetRect.top + 20);
    modalPositionStyle.left = Math.max(GAP, targetRect.left - MODAL_WIDTH - GAP);
  }

  const spotlightPadding = 8;
  const spotlightRadius = 12;

  const queueRect = rects.queue;
  const statsRect = rects.stats;

  return createPortal(
    <div className="fixed inset-0 z-[60]" style={{ pointerEvents: "none" }} role="dialog" aria-modal="true" aria-label="Onboarding tour">
      {/* Backdrop with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "auto" }}>
        <defs>
          <mask id="onboarding-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - spotlightPadding}
                y={targetRect.top - spotlightPadding}
                width={targetRect.width + spotlightPadding * 2}
                height={targetRect.height + spotlightPadding * 2}
                rx={spotlightRadius}
                ry={spotlightRadius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#onboarding-mask)" />
      </svg>

      {/* Spotlight glow ring */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-accent/50 transition-all duration-500 ease-in-out"
          style={{
            pointerEvents: "none",
            top: targetRect.top - spotlightPadding,
            left: targetRect.left - spotlightPadding,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
            boxShadow: "0 0 24px rgba(139,92,246,0.35)",
          }}
        />
      )}

      {/* ═══ Queue overlay with opaque background ═══ */}
      {(step === 1 || step === 2) && queueRect && (
        <div
          className="absolute overflow-hidden rounded-lg bg-background"
          style={{
            pointerEvents: "none",
            top: queueRect.top,
            left: queueRect.left,
            width: queueRect.width,
            height: queueRect.height,
          }}
        >
          {/* Tab bar */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex gap-0.5 rounded-md border border-border p-0.5 bg-background">
              <span className="text-sm px-2.5 py-1 rounded bg-accent text-accent-foreground font-medium">
                Review <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-accent-foreground/20">{MOCK_REVIEW_ITEMS.length}</span>
              </span>
              <span className="text-sm px-2.5 py-1 rounded text-muted-foreground">New <span className="ml-1 text-xs">43</span></span>
              <span className="text-sm px-2.5 py-1 rounded text-muted-foreground">Done <span className="ml-1 text-xs">7</span></span>
              <span className="text-sm px-2.5 py-1 rounded text-muted-foreground">Deferred</span>
              <span className="text-sm px-2.5 py-1 rounded text-muted-foreground">Import</span>
            </div>
          </div>
          {/* Sort pills */}
          <div className="flex gap-1 mb-2">
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-foreground font-medium">Urgency</span>
            <span className="text-xs px-2 py-0.5 rounded text-muted-foreground">Oldest</span>
            <span className="text-xs px-2 py-0.5 rounded text-muted-foreground">Hardest</span>
            <span className="text-xs px-2 py-0.5 rounded text-muted-foreground">Category</span>
          </div>
          {/* Review items */}
          <div className={`rounded-lg border border-border overflow-hidden bg-background ${step === 2 ? "opacity-40" : ""}`}>
            {MOCK_REVIEW_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0"
              >
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${DOT_COLOR[item.prio]}`} />
                <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{item.num}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground truncate block">{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.category} · {item.attempts} attempt{item.attempts !== 1 ? "s" : ""} · Last: {item.lastSeen}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${OVERDUE_BG[item.prio]}`}>
                    {item.daysOverdue}d overdue
                  </span>
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${DIFF_BG[item.difficulty]}`}>
                    {item.difficulty}
                  </span>
                  <span className="inline-flex h-7 items-center rounded-md bg-accent px-3 text-xs text-accent-foreground">
                    Log
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Step 2: Simulated log modal centered on queue ── */}
          {step === 2 && (
            <div className="absolute inset-0 flex items-start justify-center pt-12">
              <div className="w-[90%] max-w-md rounded-lg border border-border bg-background shadow-2xl overflow-hidden">
                {/* Modal header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold">1. Two Sum</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">Easy</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent">Review</span>
                  <span className="ml-auto text-xs text-muted-foreground">Quick Log</span>
                </div>
                {/* Modal body */}
                <div className="px-4 py-3 space-y-3">
                  {/* Outcome */}
                  <div>
                    <p className={`text-[11px] mb-1.5 transition-colors duration-300 ${logFrame === 0 ? "text-foreground font-medium" : logFrame > 0 ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                      How did it go?
                    </p>
                    <div className="flex gap-1.5">
                      {LOG_STEPS[0].options.map((opt, oi) => (
                        <span key={oi} className={`flex-1 text-center text-[11px] py-1.5 rounded-md border transition-all duration-300 ${
                          (logFrame === 0 && oi === LOG_STEPS[0].active) ? "border-accent bg-accent text-accent-foreground font-medium" :
                          (logFrame > 0 && oi === LOG_STEPS[0].active) ? "border-accent/50 bg-accent/10 text-accent" :
                          "border-border text-muted-foreground/50"
                        }`}>{opt}</span>
                      ))}
                    </div>
                  </div>
                  {/* Quality */}
                  <div>
                    <p className={`text-[11px] mb-1.5 transition-colors duration-300 ${logFrame === 1 ? "text-foreground font-medium" : logFrame > 1 ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                      Solution quality?
                    </p>
                    <div className="flex gap-1.5">
                      {LOG_STEPS[1].options.map((opt, oi) => (
                        <span key={oi} className={`flex-1 text-center text-[11px] py-1.5 rounded-md border transition-all duration-300 ${
                          (logFrame === 1 && oi === LOG_STEPS[1].active) ? "border-accent bg-accent text-accent-foreground font-medium" :
                          (logFrame > 1 && oi === LOG_STEPS[1].active) ? "border-accent/50 bg-accent/10 text-accent" :
                          "border-border text-muted-foreground/50"
                        }`}>{opt}</span>
                      ))}
                    </div>
                  </div>
                  {/* Confidence */}
                  <div>
                    <p className={`text-[11px] mb-1.5 transition-colors duration-300 ${logFrame === 2 ? "text-foreground font-medium" : logFrame > 2 ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                      Confidence
                    </p>
                    <div className="flex gap-1.5">
                      {LOG_STEPS[2].options.map((opt, oi) => (
                        <span key={oi} className={`flex-1 text-center text-[11px] py-1.5 rounded-md border transition-all duration-300 ${
                          (logFrame === 2 && oi === LOG_STEPS[2].active) ? "border-accent bg-accent text-accent-foreground font-medium" :
                          (logFrame > 2 && oi === LOG_STEPS[2].active) ? "border-accent/50 bg-accent/10 text-accent" :
                          "border-border text-muted-foreground/50"
                        }`}>{opt}</span>
                      ))}
                    </div>
                  </div>
                  {/* Time */}
                  <div>
                    <p className={`text-[11px] mb-1.5 transition-colors duration-300 ${logFrame === 3 ? "text-foreground font-medium" : logFrame > 3 ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                      Time spent
                    </p>
                    <div className="flex gap-1.5">
                      {LOG_STEPS[3].options.map((opt, oi) => (
                        <span key={oi} className={`flex-1 text-center text-[11px] py-1.5 rounded-md border transition-all duration-300 ${
                          (logFrame === 3 && oi === LOG_STEPS[3].active) ? "border-accent bg-accent text-accent-foreground font-medium" :
                          (logFrame > 3 && oi === LOG_STEPS[3].active) ? "border-accent/50 bg-accent/10 text-accent" :
                          "border-border text-muted-foreground/50"
                        }`}>{opt}</span>
                      ))}
                    </div>
                  </div>
                  {/* Saving / Result */}
                  {logFrame >= 4 && (
                    <div className="pt-2 border-t border-border/50 text-center">
                      {logFrame === 4 ? (
                        <p className="text-xs text-muted-foreground animate-pulse">Saving\u2026</p>
                      ) : (
                        <>
                          <p className="text-xs text-green-400 font-medium">✓ Logged — Stability 1.2 → 3.6</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Next review scheduled in 4 days</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {/* Modal footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
                  <span className="text-[10px] text-muted-foreground">Full form →</span>
                  <div className="flex gap-2">
                    <span className="inline-flex h-7 items-center rounded-md border border-border px-3 text-[11px] text-muted-foreground">Cancel</span>
                    <span className={`inline-flex h-7 items-center rounded-md px-3 text-[11px] font-medium transition-all duration-300 ${
                      logFrame >= 4 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                    }`}>Save</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Stats overlay: animated right-column data ═══ */}
      {step === 3 && statsRect && (() => {
        const t = TIER_PROGRESSION[tierFrame];
        const activity = ACTIVITY_DATA[tierFrame];
        const actMax = Math.max(...activity.map(d => d.n + d.r), 1);
        const MAX_BAR = 44;
        const diff = DIFF_ATTEMPTED[tierFrame];
        return (
          <div
            className="absolute overflow-y-auto rounded-lg bg-background"
            style={{
              pointerEvents: "none",
              top: statsRect.top,
              left: statsRect.left,
              width: statsRect.width,
              height: statsRect.height,
            }}
          >
            {/* Semester Progress */}
            <section className="rounded-lg border border-border bg-muted p-3 mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Semester Progress</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold tabular-nums transition-all duration-500">{t.daysLeft}</span>
                <span className="text-sm text-muted-foreground">days left</span>
              </div>
              <p className="text-xs text-muted-foreground">Target: 150 problems by Dec 11, 2026</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${t.score >= 75 ? "bg-green-500" : "bg-orange-500"}`}
                  style={{ width: `${Math.min(100, (t.solved / 150) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground transition-all duration-500">{t.solved} solved</span>
                <span className="text-xs text-muted-foreground transition-all duration-500">{150 - t.solved} to go</span>
              </div>
              {/* Compact readiness strip */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold transition-all duration-500 ${TIER_BADGE_BG[t.tier]}`}>
                    {t.tier}
                  </span>
                  <span className="text-xs text-muted-foreground">Readiness</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs leading-none">🔥</span>
                  <span className="text-xs font-semibold tabular-nums transition-all duration-500">{t.streak}</span>
                  <span className="text-xs text-muted-foreground">streak</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold tabular-nums transition-all duration-500">{t.reviewDay.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">reviews/day</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold tabular-nums transition-all duration-500">{t.newDay.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">new/day</span>
                </div>
              </div>
            </section>

            {/* Activity chart with real dates */}
            <section className="rounded-lg border border-border bg-muted p-3 mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Activity</p>
              <div className="flex items-end gap-0.5" style={{ minHeight: MAX_BAR + 28 }}>
                {activity.map((day, i) => {
                  const total = day.n + day.r;
                  const barPx = total > 0 ? Math.max(Math.round((total / actMax) * MAX_BAR), 4) : 3;
                  const revPx = total > 0 ? Math.round((day.r / total) * barPx) : 0;
                  const isToday = i === activity.length - 1;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center justify-end gap-0.5">
                      {total > 0 && (
                        <span className="text-[10px] text-muted-foreground leading-none tabular-nums transition-all duration-500">{total}</span>
                      )}
                      {total > 0 ? (
                        <div className="w-full flex flex-col transition-all duration-700">
                          {day.n > 0 && (
                            <div className="w-full rounded-t-sm bg-green-500" style={{ height: `${barPx - revPx}px` }} />
                          )}
                          {day.r > 0 && (
                            <div className={`w-full bg-accent ${day.n === 0 ? "rounded-t-sm" : ""}`} style={{ height: `${revPx}px` }} />
                          )}
                        </div>
                      ) : (
                        <div className="w-full rounded-t-sm bg-border/40" style={{ height: `${barPx}px` }} />
                      )}
                      <span className={`text-[9px] leading-none tabular-nums ${isToday ? "text-accent font-semibold" : "text-muted-foreground"}`}>
                        {ACTIVITY_DATES[i]}
                      </span>
                    </div>
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
              </div>
            </section>

            {/* Mastery Progress */}
            <section className="rounded-lg border border-border bg-muted p-3 mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Mastery Progress</p>
              <div className="h-2.5 rounded-full bg-background overflow-hidden flex">
                <div className="bg-green-500 transition-all duration-700" style={{ width: `${(t.mastered / 150) * 100}%` }} />
                <div className="bg-blue-500 transition-all duration-700" style={{ width: `${(t.learning / 150) * 100}%` }} />
              </div>
              <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                <span className="transition-all duration-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
                  {t.mastered} Mastered ({Math.round((t.mastered / 150) * 100)}%)
                </span>
                <span className="transition-all duration-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />
                  {t.learning} Learning
                </span>
                <span className="transition-all duration-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-zinc-600 mr-1" />
                  {150 - t.solved} New
                </span>
              </div>
            </section>

            {/* Categories & Difficulty */}
            <section className="rounded-lg border border-border bg-muted p-3">
              <div className="mb-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-2">Categories</p>
                <div className="space-y-1.5">
                  {CATEGORIES.map((cat, ci) => {
                    const attempted = CAT_ATTEMPTED[tierFrame][ci];
                    const pct = cat.total > 0 ? Math.round((attempted / cat.total) * 100) : 0;
                    return (
                      <div key={cat.name} className="flex items-center gap-2">
                        <span className="text-[11px] w-24 shrink-0 truncate" title={cat.name}>{cat.name}</span>
                        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${catBarColor(tierFrame)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] w-8 text-right shrink-0 tabular-nums text-muted-foreground transition-all duration-500">{attempted}/{cat.total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Difficulty */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-2">Difficulty</p>
                <div className="space-y-2">
                  {([
                    { label: "Easy", attempted: diff.easy, total: DIFF_TOTALS.easy },
                    { label: "Medium", attempted: diff.medium, total: DIFF_TOTALS.medium },
                    { label: "Hard", attempted: diff.hard, total: DIFF_TOTALS.hard },
                  ] as const).map((d) => {
                    const pct = d.total > 0 ? Math.round((d.attempted / d.total) * 100) : 0;
                    return (
                      <div key={d.label} className="flex items-center gap-2">
                        <span className="text-[11px] w-12 shrink-0">{d.label}</span>
                        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${DIFF_BAR_COLORS[d.label]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground w-8 text-right tabular-nums transition-all duration-500">{d.attempted}/{d.total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        );
      })()}

      {/* ═══ Modal card ═══ */}
      <div
        className="rounded-lg border border-border bg-background shadow-2xl transition-all duration-500 ease-in-out"
        style={{ ...modalPositionStyle, pointerEvents: "auto", width: MODAL_WIDTH }}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-accent" : i < step ? "w-1.5 bg-accent/50" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Title */}
        <div className="px-5 pt-4 pb-1">
          <h2 className="text-base font-semibold mb-1">{current.title}</h2>
          {current.body && <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>}
        </div>

        {/* ── Step 1: Queue legend/breakdown ── */}
        {step === 1 && (
          <div className="px-5 pb-2 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Here&apos;s what a mid-semester review queue looks like. Each row shows:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 mt-1 shrink-0" />
                <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Priority dot</span> — red = critical (memory nearly gone), orange = overdue, yellow = due soon</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground tabular-nums font-mono shrink-0 mt-0.5">1</span>
                <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">LeetCode #</span> — the problem number on LeetCode/NeetCode</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium shrink-0 mt-0.5">Aa</span>
                <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Problem name</span> — click to view full details, solution approach, and your notes</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold bg-orange-500 text-white shrink-0">6d</span>
                <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Overdue badge</span> — how many days past the scheduled review date</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium bg-green-500/15 text-green-400 shrink-0">Easy</span>
                <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Difficulty</span> — Easy, Medium, or Hard</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="inline-flex h-5 items-center rounded bg-accent px-2 text-[10px] text-accent-foreground shrink-0">Log</span>
                <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Log button</span> — opens the quick-log modal (next step!)</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Log modal explanation ── */}
        {step === 2 && (
          <div className="px-5 pb-2 space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Click &quot;Log&quot; on any review item. The quick-log modal opens — 4 taps and the algorithm recalculates your schedule:
            </p>
            <div className="space-y-1.5">
              {[
                { n: "1", label: "Outcome", desc: "Solved, partial, or couldn\u2019t solve" },
                { n: "2", label: "Quality", desc: "Optimal, suboptimal, or brute force" },
                { n: "3", label: "Confidence", desc: "1-5 scale — how sure were you?" },
                { n: "4", label: "Time", desc: "Quick time bracket" },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-2">
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-all duration-300 ${
                    parseInt(s.n) - 1 === logFrame ? "bg-accent text-accent-foreground" :
                    parseInt(s.n) - 1 < logFrame ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                  }`}>{s.n}</span>
                  <div>
                    <span className="text-xs font-medium">{s.label}</span>
                    <span className="text-xs text-muted-foreground"> — {s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            {logFrame >= 5 && (
              <div className="rounded-md bg-green-500/10 border border-green-500/20 p-2 text-center">
                <p className="text-xs text-green-400 font-medium">✓ Stability 1.2 → 3.6 · Next review in 4d</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Stats breakdown legend ── */}
        {step === 3 && (() => {
          const t = TIER_PROGRESSION[tierFrame];
          return (
            <div className="px-5 pb-2 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Watch your stats grow as you practice consistently. The right panel updates in real-time:
              </p>
              {/* Animated tier display */}
              <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/50">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg text-lg font-bold transition-all duration-500 ${TIER_BADGE_BG[t.tier]}`}>
                  {t.tier}
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums transition-all duration-500">{t.score}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
                  <p className="text-[10px] text-muted-foreground">Readiness Score</p>
                </div>
              </div>
              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Coverage (30%)", value: t.coverage, desc: "Problems attempted" },
                  { label: "Retention (40%)", value: t.retention, desc: "How much you remember" },
                  { label: "Balance (20%)", value: t.balance, desc: "No weak categories" },
                  { label: "Consistency (10%)", value: t.consistency, desc: "Keeping up reviews" },
                ].map((m) => (
                  <div key={m.label} className="p-2 rounded border border-border/50 bg-muted/30">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] text-muted-foreground">{m.label}</span>
                      <span className="text-sm font-semibold tabular-nums transition-all duration-500">{m.value}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-background mt-1 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${TIER_BAR_COLOR[t.tier]}`} style={{ width: `${m.value}%` }} />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{m.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                S ≥ 90 · A ≥ 75 · B ≥ 55 · C ≥ 35 · D &lt; 35
              </p>
            </div>
          );
        })()}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4 pt-2">
          <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => isLast ? finish() : setStep(step + 1)}
              className="inline-flex h-8 items-center rounded-md bg-accent px-4 text-xs text-accent-foreground font-medium hover:opacity-90 transition-colors"
            >
              {isLast ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
