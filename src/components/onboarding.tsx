"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

const ONBOARDING_KEY = "aurora_onboarding_complete";

/* ── Simulated review queue data ── */
const MOCK_REVIEW_ITEMS = [
  { num: 1, title: "Two Sum", difficulty: "Easy" as const, category: "Arrays & Hashing", attempts: 3, lastSeen: "5d ago", daysOverdue: 3, retention: 52, prio: "high" as const },
  { num: 206, title: "Reverse Linked List", difficulty: "Easy" as const, category: "Linked List", attempts: 2, lastSeen: "8d ago", daysOverdue: 6, retention: 44, prio: "critical" as const },
  { num: 20, title: "Valid Parentheses", difficulty: "Easy" as const, category: "Stack", attempts: 4, lastSeen: "3d ago", daysOverdue: 1, retention: 61, prio: "medium" as const },
  { num: 15, title: "3Sum", difficulty: "Medium" as const, category: "Two Pointers", attempts: 1, lastSeen: "12d ago", daysOverdue: 9, retention: 38, prio: "critical" as const },
  { num: 102, title: "Binary Tree Level Order", difficulty: "Medium" as const, category: "Trees", attempts: 3, lastSeen: "4d ago", daysOverdue: 2, retention: 67, prio: "medium" as const },
  { num: 141, title: "Linked List Cycle", difficulty: "Easy" as const, category: "Linked List", attempts: 1, lastSeen: "7d ago", daysOverdue: 4, retention: 49, prio: "high" as const },
  { num: 121, title: "Best Time to Buy Stock", difficulty: "Easy" as const, category: "Sliding Window", attempts: 2, lastSeen: "11d ago", daysOverdue: 7, retention: 41, prio: "critical" as const },
  { num: 70, title: "Climbing Stairs", difficulty: "Easy" as const, category: "1D DP", attempts: 2, lastSeen: "6d ago", daysOverdue: 2, retention: 58, prio: "medium" as const },
  { num: 53, title: "Maximum Subarray", difficulty: "Medium" as const, category: "Greedy", attempts: 1, lastSeen: "9d ago", daysOverdue: 5, retention: 46, prio: "high" as const },
  { num: 235, title: "Lowest Common Ancestor BST", difficulty: "Medium" as const, category: "Trees", attempts: 2, lastSeen: "10d ago", daysOverdue: 8, retention: 39, prio: "critical" as const },
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

type Rect = { top: number; left: number; width: number; height: number };

/* ── Step definitions (3 slides) ── */
const STEPS = [
  {
    title: "Welcome to Aurora",
    body: "Aurora schedules reviews based on how well you remember each problem — so you spend time on what needs work, not what you already know.",
    target: null as string | null,
    side: "center" as const,
  },
  {
    title: "Your Queue & Quick Log",
    body: "",
    target: "queue",
    side: "right" as const,
  },
  {
    title: "Set Your Goal",
    body: "",
    target: null as string | null,
    side: "center" as const,
  },
];

export function Onboarding({ isDemo = false, userId, onPreferences }: {
  isDemo?: boolean;
  userId?: string;
  onPreferences?: (prefs: { targetCount: number; targetDate: string; autoDeferHards: boolean; goalType: "blind75" | "neetcode150" | "none" }) => void;
}) {
  const [show, setShow] = useState(false);
  const storageKey = userId ? `${ONBOARDING_KEY}_${userId}` : ONBOARDING_KEY;
  const [step, setStep] = useState(0);
  const [rects, setRects] = useState<{ queue: Rect | null; stats: Rect | null }>({ queue: null, stats: null });
  const [logFrame, setLogFrame] = useState(0);
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastSpotlightRect, setLastSpotlightRect] = useState<Rect | null>(null);
  const [spotlightVisible, setSpotlightVisible] = useState(false);
  const spotlightFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preference state for goal step
  const [selectedGoal, setSelectedGoal] = useState<"blind75" | "neetcode150" | "none">("neetcode150");
  const [selectedDate, setSelectedDate] = useState("2026-09-01");
  const [deferHards, setDeferHards] = useState(true);

  const measure = useCallback(() => {
    const q = document.querySelector("[data-onboarding='queue']");
    const s = document.querySelector("[data-onboarding='stats']");
    setRects({
      queue: q ? q.getBoundingClientRect() : null,
      stats: s ? s.getBoundingClientRect() : null,
    });
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      const t = setTimeout(() => { setShow(true); measure(); }, 400);
      return () => clearTimeout(t);
    }
  }, [measure, storageKey]);

  useEffect(() => {
    if (!show) return;
    const handler = () => measure();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [show, measure]);

  useEffect(() => { if (show) measure(); }, [step, show, measure]);

  // Log animation (step 1 — "Your Queue & Quick Log")
  useEffect(() => {
    if (step === 1 && show) {
      setLogFrame(0);
      logIntervalRef.current = setInterval(() => {
        setLogFrame((f) => (f + 1) % LOG_STEPS.length);
      }, 1400);
      return () => { if (logIntervalRef.current) clearInterval(logIntervalRef.current); };
    } else {
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    }
  }, [step, show]);

  // Spotlight fade: keeps spotlight visible briefly when step changes away from a targeted step
  useEffect(() => {
    const rect = STEPS[step].target ? rects[STEPS[step].target as "queue" | "stats"] : null;
    if (spotlightFadeTimerRef.current) clearTimeout(spotlightFadeTimerRef.current);
    if (rect) {
      setLastSpotlightRect(rect);
      setSpotlightVisible(true);
    } else {
      setSpotlightVisible(false);
      spotlightFadeTimerRef.current = setTimeout(() => setLastSpotlightRect(null), 350);
    }
    return () => { if (spotlightFadeTimerRef.current) clearTimeout(spotlightFadeTimerRef.current); };
  }, [step, rects]);

  function finish() {
    const targetCount = selectedGoal === "blind75" ? 75 : selectedGoal === "neetcode150" ? 150 : 0;
    if (targetCount > 0) {
      localStorage.setItem("srs_target", JSON.stringify({ date: selectedDate, count: targetCount }));
    }
    if (!isDemo) {
      fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-auto-defer-hards", enabled: deferHards }),
      }).catch(() => {/* ignore errors during onboarding save */});
    }
    localStorage.setItem("srs_goal_type", selectedGoal);
    onPreferences?.({ targetCount, targetDate: selectedDate, autoDeferHards: deferHards, goalType: selectedGoal });
    localStorage.setItem(storageKey, "1");
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

  return createPortal(
    <div className="fixed inset-0 z-[60]" style={{ pointerEvents: "none" }} role="dialog" aria-modal="true" aria-label="Onboarding tour">
      {/* Backdrop with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "auto" }}>
        <defs>
          <mask id="onboarding-mask">
            <rect width="100%" height="100%" fill="white" />
            {lastSpotlightRect && (
              <rect
                x={lastSpotlightRect.left - spotlightPadding}
                y={lastSpotlightRect.top - spotlightPadding}
                width={lastSpotlightRect.width + spotlightPadding * 2}
                height={lastSpotlightRect.height + spotlightPadding * 2}
                rx={spotlightRadius}
                ry={spotlightRadius}
                fill="black"
                style={{ opacity: spotlightVisible ? 1 : 0, transition: "opacity 0.35s ease" }}
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#onboarding-mask)" />
      </svg>

      {/* Spotlight glow ring */}
      {lastSpotlightRect && (
        <div
          className="absolute rounded-xl border-2 border-accent/50"
          style={{
            pointerEvents: "none",
            top: lastSpotlightRect.top - spotlightPadding,
            left: lastSpotlightRect.left - spotlightPadding,
            width: lastSpotlightRect.width + spotlightPadding * 2,
            height: lastSpotlightRect.height + spotlightPadding * 2,
            boxShadow: "0 0 24px rgba(139,92,246,0.35)",
            opacity: spotlightVisible ? 1 : 0,
            transition: "opacity 0.35s ease",
          }}
        />
      )}

      {/* ═══ Queue overlay with log animation (step 1) ═══ */}
      {queueRect && (
        <div
          className="absolute overflow-hidden rounded-lg bg-background"
          style={{
            pointerEvents: "none",
            top: queueRect.top,
            left: queueRect.left,
            width: queueRect.width,
            height: queueRect.height,
            opacity: step === 1 ? 1 : 0,
            transition: "opacity 0.35s ease",
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
          {/* Review items — full opacity so symbols are legible */}
          <div className="rounded-lg border border-border overflow-hidden bg-background">
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

          {/* Simulated log modal centered on queue */}
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
                {LOG_STEPS.slice(0, 4).map((logStep, li) => (
                  <div key={logStep.section}>
                    <p className={`text-[11px] mb-1.5 transition-colors duration-300 ${logFrame === li ? "text-foreground font-medium" : logFrame > li ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                      {logStep.label}
                    </p>
                    <div className="flex gap-1.5">
                      {logStep.options.map((opt, oi) => (
                        <span key={oi} className={`flex-1 text-center text-[11px] py-1.5 rounded-md border transition-all duration-300 ${
                          (logFrame === li && oi === logStep.active) ? "border-accent bg-accent text-accent-foreground font-medium" :
                          (logFrame > li && oi === logStep.active) ? "border-accent/50 bg-accent/10 text-accent" :
                          "border-border text-muted-foreground/50"
                        }`}>{opt}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {logFrame >= 4 && (
                  <div className="pt-2 border-t border-border/50 text-center">
                    {logFrame === 4 ? (
                      <p className="text-xs text-muted-foreground animate-pulse">Saving\u2026</p>
                    ) : (
                      <>
                        <p className="text-xs text-green-400 font-medium">\u2713 Logged — Stability 1.2 \u2192 3.6</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Next review scheduled in 4 days</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              {/* Modal footer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
                <span className="text-[10px] text-muted-foreground">Full form \u2192</span>
                <div className="flex gap-2">
                  <span className="inline-flex h-7 items-center rounded-md border border-border px-3 text-[11px] text-muted-foreground">Cancel</span>
                  <span className={`inline-flex h-7 items-center rounded-md px-3 text-[11px] font-medium transition-all duration-300 ${
                    logFrame >= 4 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}>Save</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal card ═══ */}
      <div
        className="rounded-lg border border-border bg-background shadow-2xl transition-all duration-500 ease-in-out flex flex-col"
        style={{ ...modalPositionStyle, pointerEvents: "auto", width: MODAL_WIDTH, minHeight: 320, maxHeight: "90vh" }}
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

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className="px-5 pb-2">
            <p className="text-xs text-muted-foreground mt-2">
              Read more about the algorithm and this site on our{" "}
              <a href="/info" className="text-accent hover:underline">info page →</a>
            </p>
          </div>
        )}

        {/* ── Step 1: Queue + Quick Log ── */}
        {step === 1 && (
          <div className="px-5 pb-2 space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Click &quot;Log&quot; on any problem to record your attempt. 4 quick taps and the algorithm recalculates your schedule.
            </p>
            {logFrame >= 5 && (
              <div className="rounded-md bg-green-500/10 border border-green-500/20 p-2 text-center">
                <p className="text-xs text-green-400 font-medium">\u2713 Stability 1.2 \u2192 3.6 \u00b7 Next review in 4d</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Set Your Goal ── */}
        {step === 2 && (
          <div className="px-5 pb-2 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pick a problem set and target date. You can change these anytime.
            </p>
            <div className="space-y-2">
              {([
                { id: "blind75" as const, label: "Blind 75", desc: "The essential 75 problems", count: 75 },
                { id: "neetcode150" as const, label: "NeetCode 150", desc: "Comprehensive coverage across all patterns", count: 150 },
                { id: "none" as const, label: "No specific goal", desc: "Just track whatever I practice", count: 0 },
              ]).map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    selectedGoal === goal.id
                      ? "border-accent bg-accent/10 ring-1 ring-accent/50"
                      : "border-border hover:border-border/80 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{goal.label}</span>
                    {goal.count > 0 && <span className="text-xs text-muted-foreground tabular-nums">{goal.count} problems</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{goal.desc}</p>
                </button>
              ))}
            </div>
            {selectedGoal !== "none" && (
              <div>
                <label htmlFor="onboarding-date" className="block text-xs text-muted-foreground mb-1">Target date</label>
                <input
                  id="onboarding-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Default: Sep 1, 2026 (Fall recruiting season)</p>
              </div>
            )}
            {/* Defer hards toggle */}
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={deferHards}
                onChange={(e) => setDeferHards(e.target.checked)}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent/50"
              />
              <div>
                <span className="text-sm font-medium">Defer Hard problems</span>
                <p className="text-xs text-muted-foreground">Focus on Easy &amp; Medium first (recommended)</p>
              </div>
            </label>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4 pt-2 mt-auto border-t border-border/20">
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
