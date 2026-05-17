"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { saveSoundSettings, DEFAULT_SOUND_SETTINGS } from "@/lib/sounds";



/* ── Mock session items: 1 new problem + review items ── */
type MockSessionItem =
  | { type: "new"; num: number; title: string; difficulty: "Easy" | "Medium" | "Hard"; category: string }
  | { type: "review"; num: number; title: string; difficulty: "Easy" | "Medium" | "Hard"; category: string; attempts: number; warn: boolean; prio: "critical" | "high" | "medium" };

const MOCK_SESSION_ITEMS: MockSessionItem[] = [
  { type: "new", num: 1, title: "Two Sum", difficulty: "Easy", category: "Arrays & Hashing" },
  { type: "review", num: 206, title: "Reverse Linked List", difficulty: "Easy", category: "Linked List", attempts: 2, warn: true, prio: "critical" },
  { type: "review", num: 20, title: "Valid Parentheses", difficulty: "Easy", category: "Stack", attempts: 4, warn: false, prio: "medium" },
  { type: "review", num: 15, title: "3Sum", difficulty: "Medium", category: "Two Pointers", attempts: 1, warn: true, prio: "critical" },
  { type: "review", num: 102, title: "Binary Tree Level Order", difficulty: "Medium", category: "Trees", attempts: 3, warn: false, prio: "medium" },
  { type: "review", num: 141, title: "Linked List Cycle", difficulty: "Easy", category: "Linked List", attempts: 1, warn: true, prio: "high" },
  { type: "review", num: 121, title: "Best Time to Buy Stock", difficulty: "Easy", category: "Sliding Window", attempts: 2, warn: true, prio: "critical" },
  { type: "review", num: 70, title: "Climbing Stairs", difficulty: "Easy", category: "1D DP", attempts: 2, warn: false, prio: "medium" },
];

const DOT_COLOR: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
};

const DIFF_BG: Record<string, string> = {
  Easy: "bg-green-500/15 text-green-400",
  Medium: "bg-yellow-500/15 text-yellow-400",
};

/* ── Animated log sequence (6 frames: outcome→quality→confidence→time→saving→done) ── */
const LOG_STEPS_COUNT = 6;

type Rect = { top: number; left: number; width: number; height: number };
const DEMO_ONBOARDING_KEY = "aurora_demo_onboarding_complete";

type Strategy = "steady" | "coverage" | "retention";

function strategyToSettings(strategy: Strategy, sessionSize: number): { newPerSession: number; advisoryThreshold: "relaxed" | "moderate" | "strict" } {
  switch (strategy) {
    case "coverage": {
      // Cap at sessionSize-1 so there is always at least 1 review slot.
      // At Light budget (sessionSize=2) this limits coverage to 1 new/session.
      const raw = sessionSize >= 7 ? 3 : 2;
      return { newPerSession: Math.min(raw, sessionSize - 1), advisoryThreshold: "relaxed" };
    }
    case "retention":
      return { newPerSession: 0, advisoryThreshold: "strict" };
    case "steady":
    default:
      return { newPerSession: 1, advisoryThreshold: "moderate" };
  }
}

/* ── Step definitions (4 slides) ── */
const STEPS = [
  {
    title: "Welcome to Aurora",
    body: "Aurora schedules reviews based on how well you remember each problem — so you spend time on what needs work, not what you already know.",
    target: null as string | null,
    side: "center" as const,
  },
  {
    title: "Today's Session",
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
  {
    title: "Your Daily Plan",
    body: "Each day, Aurora fills your session with a mix of reviews and new problems. Pick a strategy — you can change this anytime in settings.",
    target: null as string | null,
    side: "center" as const,
  },
];

const ONBOARDING_BUDGET_PRESETS = [
  { minutes: 30, label: "Light", sub: "30 min" },
  { minutes: 60, label: "Moderate", sub: "60 min" },
  { minutes: 90, label: "Focused", sub: "90 min" },
  { minutes: 120, label: "Intensive", sub: "120+ min" },
] as const;

function defaultCountdownName(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long" }) + " Countdown";
}

export function Onboarding({ isDemo = false, onboardingComplete = false, onPreferences }: {
  isDemo?: boolean;
  onboardingComplete?: boolean;
  onPreferences?: (prefs: { targetCount: number; targetDate: string; autoDeferHards: boolean; goalType: "blind75" | "neetcode150" | "none"; timeBudget: number; newPerSession: number; advisoryThreshold: "relaxed" | "moderate" | "strict"; countdownTitle: string }) => void;
}) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [rects, setRects] = useState<{ queue: Rect | null; stats: Rect | null }>({ queue: null, stats: null });
  const [logFrame, setLogFrame] = useState(0);
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastSpotlightRect, setLastSpotlightRect] = useState<Rect | null>(null);
  const [spotlightVisible, setSpotlightVisible] = useState(false);
  const spotlightFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preference state for goal step
  const [selectedTimeBudget, setSelectedTimeBudget] = useState(60);
  const [selectedGoal, setSelectedGoal] = useState<"blind75" | "neetcode150">("neetcode150");
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
    return `${year}-09-01`;
  });
  const [countdownName, setCountdownName] = useState(() => {
    const now = new Date();
    const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
    return defaultCountdownName(`${year}-09-01`);
  });
  const countdownNameEdited = useRef(false);
  const [deferHards, setDeferHards] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>("steady");

  const measure = useCallback(() => {
    const q = document.querySelector("[data-onboarding='queue']");
    const s = document.querySelector("[data-onboarding='stats']");
    setRects({
      queue: q ? q.getBoundingClientRect() : null,
      stats: s ? s.getBoundingClientRect() : null,
    });
  }, []);

  useEffect(() => {
    const demoComplete = isDemo && localStorage.getItem(DEMO_ONBOARDING_KEY) === "1";
    if (!onboardingComplete && !demoComplete) {
      const t = setTimeout(() => { setShow(true); measure(); }, 400);
      return () => clearTimeout(t);
    }
  }, [isDemo, onboardingComplete, measure]);

  useEffect(() => {
    if (!show) return;
    const handler = () => measure();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [show, measure]);

  useEffect(() => { if (show) measure(); }, [step, show, measure]);

  // Log animation (step 1 — Today's Session)
  useEffect(() => {
    if (step === 1 && show) {
      setLogFrame(0);
      logIntervalRef.current = setInterval(() => {
        setLogFrame((f) => (f + 1) % LOG_STEPS_COUNT);
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
    const targetCount = selectedGoal === "blind75" ? 75 : 150;
    const cap = Math.max(1, Math.floor(selectedTimeBudget / 25));
    const sessionSize = Math.min(Math.max(2, cap + 1), 8);
    const { newPerSession, advisoryThreshold } = strategyToSettings(selectedStrategy, sessionSize);
    localStorage.setItem("aurora_time_budget", String(selectedTimeBudget));
    localStorage.setItem("aurora_new_per_session", String(newPerSession));
    localStorage.setItem("aurora_advisory_threshold", advisoryThreshold);
    if (isDemo) {
      localStorage.setItem(DEMO_ONBOARDING_KEY, "1");
    } else {
      fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-auto-defer-hards", enabled: deferHards }),
      }).catch(() => {/* ignore */});
      fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete-onboarding" }),
      }).catch(() => {/* ignore */});
      fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyTimeBudgetMinutes: selectedTimeBudget, newPerSession, advisoryThreshold }),
      }).catch(() => {/* ignore */});
    }
    if (soundEnabled) {
      saveSoundSettings({ ...DEFAULT_SOUND_SETTINGS, sessionComplete: "wow", volume: 0.35 });
    }
    onPreferences?.({ targetCount, targetDate: selectedDate, autoDeferHards: deferHards, goalType: selectedGoal, timeBudget: selectedTimeBudget, newPerSession, advisoryThreshold, countdownTitle: countdownName });
    setShow(false);
  }

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const targetRect = current.target ? rects[current.target as "queue" | "stats"] : null;

  // Modal position
  const modalPositionStyle: React.CSSProperties = {};
  const MODAL_WIDTH = 480;
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
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-0.5 rounded-md border border-border p-0.5 bg-background">
              <span className="text-sm px-2.5 py-1 rounded bg-accent text-accent-foreground font-medium">
                Today&apos;s Session <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-accent-foreground/20">{MOCK_SESSION_ITEMS.length}</span>
              </span>
              <span className="text-sm px-2.5 py-1 rounded text-muted-foreground">New <span className="ml-1 text-xs">43</span></span>
              <span className="text-sm px-2.5 py-1 rounded text-muted-foreground">Completed <span className="ml-1 text-xs">7</span></span>
            </div>
          </div>
          {/* Sort / filter bar matching real dashboard */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Urgency
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div className="flex gap-0.5 rounded border border-border p-0.5 bg-background">
              <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground font-medium">Session</span>
              <span className="text-[11px] px-2 py-0.5 rounded text-muted-foreground">All</span>
            </div>
            <span className="flex-1 text-[11px] text-muted-foreground/50 px-2 py-0.5 rounded-md border border-border">Filter...</span>
          </div>
          {/* Session items matching real dashboard layout */}
          <div className="rounded-lg border border-border overflow-hidden bg-background">
            {MOCK_SESSION_ITEMS.map((item, i) => (
              <div key={i} className="border-b border-border last:border-b-0">
                {item.type === "new" && (
                  <div className="px-3 pt-2 pb-0.5">
                    <span className="text-[10px] font-semibold text-accent tracking-wide uppercase">New Problem</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">· Start Arrays &amp; Hashing</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 px-3 py-2">
                  {item.type === "review" ? (
                    <div className={`h-2 w-2 rounded-full shrink-0 ${DOT_COLOR[item.prio]}`} />
                  ) : (
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{item.num}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
                      {item.type === "review" && <span className="text-[10px] text-muted-foreground shrink-0">#{item.num}</span>}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                      {item.type === "review" && (
                        <>
                          <span className="text-xs text-muted-foreground">· {item.attempts} attempt{item.attempts !== 1 ? "s" : ""}</span>
                          {item.warn && <span className="text-[10px] text-orange-400">· Retention dropping fast</span>}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${DIFF_BG[item.difficulty]}`}>
                      {item.difficulty}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 border border-border/50 rounded px-1 py-0.5 leading-none">NC↗</span>
                    <span className="inline-flex h-6 items-center rounded-md bg-accent px-2.5 text-[11px] text-accent-foreground">Log</span>
                  </div>
                </div>
              </div>
            ))}
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
        <div className={`px-5 pt-4 pb-1${step === 0 ? " text-center" : ""}`}>
          <h2 className="text-base font-semibold mb-1">{current.title}</h2>
          {current.body && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isDemo && step === 0
                ? "This demo shows a realistic Aurora account with reviews, new problems, GitHub detections, and readiness signals. Explore freely; nothing is saved until you sign in."
                : current.body}
            </p>
          )}
        </div>

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className="px-5 pb-2 text-center">
            <p className="text-xs text-muted-foreground mt-2">
              <a href="/info" className="text-accent hover:underline">Info &amp; algorithm →</a>
              {" · "}
              <a href="https://github.com/CadenceElaina/aurora" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">GitHub →</a>
            </p>
          </div>
        )}

        {/* ── Step 1: Today's Session + Log animation ── */}
        {step === 1 && (
          <div className="px-5 pb-3 space-y-3 overflow-y-auto flex-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isDemo
                ? "Your dashboard has a Today's Session tab (due reviews + new problems) and a New tab to browse all problems. Log anything in a few taps."
                : "Today's Session shows your curated mix of reviews and new problems. Tap Log on any item to record how it went — the algorithm recalculates your next review instantly."}
            </p>
            {/* Log form animation */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
                <span className="text-xs text-muted-foreground shrink-0">1.</span>
                <span className="text-sm font-medium">Two Sum</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 shrink-0">Easy</span>
                <span className="ml-auto text-[10px] text-accent shrink-0">Refresh pattern →</span>
              </div>
              <div className="px-3 py-2.5 space-y-2.5 bg-background">
                {/* How did it go? */}
                <div>
                  <p className={`text-[11px] mb-1 transition-colors duration-300 ${logFrame === 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>How did it go?</p>
                  <div className="flex gap-1.5">
                    {(["Couldn't solve", "Partial / Hint", "Solved"] as const).map((opt, oi) => (
                      <span key={oi} className={`flex-1 text-center text-[11px] py-1 rounded border transition-all duration-300 ${
                        (logFrame === 0 && oi === 2) ? "border-accent bg-accent text-accent-foreground font-medium" :
                        (logFrame > 0 && oi === 2) ? "border-accent/50 bg-accent/10 text-accent" :
                        "border-border text-muted-foreground/50"
                      }`}>{opt}</span>
                    ))}
                  </div>
                </div>
                {/* Solution quality */}
                <div>
                  <p className={`text-[11px] mb-1 transition-colors duration-300 ${logFrame === 1 ? "text-foreground font-medium" : "text-muted-foreground"}`}>Solution quality</p>
                  <div className="flex gap-1.5">
                    {(["Optimal", "Not Optimal"] as const).map((opt, oi) => (
                      <span key={oi} className={`flex-1 text-center text-[11px] py-1 rounded border transition-all duration-300 ${
                        (logFrame === 1 && oi === 0) ? "border-accent bg-accent text-accent-foreground font-medium" :
                        (logFrame > 1 && oi === 0) ? "border-accent/50 bg-accent/10 text-accent" :
                        "border-border text-muted-foreground/50"
                      }`}>{opt}</span>
                    ))}
                  </div>
                </div>
                {/* Confidence + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className={`text-[11px] mb-1 transition-colors duration-300 ${logFrame === 2 ? "text-foreground font-medium" : "text-muted-foreground"}`}>Confidence</p>
                    <div className="flex gap-1">
                      {(["1","2","3","4","5"] as const).map((n, ni) => (
                        <span key={n} className={`flex h-6 w-full items-center justify-center rounded text-[11px] transition-all duration-300 ${
                          (logFrame === 2 && ni === 3) ? "bg-accent text-accent-foreground font-medium" :
                          (logFrame > 2 && ni === 3) ? "bg-accent/20 text-accent" :
                          "border border-border text-muted-foreground/50"
                        }`}>{n}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={`text-[11px] mb-1 transition-colors duration-300 ${logFrame === 3 ? "text-foreground font-medium" : "text-muted-foreground"}`}>Time (min)</p>
                    <span className={`block h-6 w-full rounded border px-2 text-[11px] leading-6 transition-all duration-300 ${
                      logFrame >= 3 ? "border-accent/60 text-foreground" : "border-border text-muted-foreground/30"
                    }`}>20</span>
                  </div>
                </div>
                {/* Date + Notes static */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] mb-1 text-muted-foreground/40">Date</p>
                    <span className="block h-6 w-full rounded border border-border px-2 text-[11px] leading-6 text-muted-foreground/30">05/17/2026</span>
                  </div>
                  <div>
                    <p className="text-[11px] mb-1 text-muted-foreground/40">Notes</p>
                    <span className="block h-6 w-full rounded border border-border px-2 text-[11px] leading-6 text-muted-foreground/30 truncate">Key insight...</span>
                  </div>
                </div>
                {logFrame >= 4 && (
                  <div className="text-center">
                    {logFrame === 4 ? (
                      <p className="text-[11px] text-muted-foreground animate-pulse">Saving…</p>
                    ) : (
                      <p className="text-[11px] text-green-400 font-medium">✓ Logged — next review in 4 days</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 px-3 py-2 border-t border-border">
                <span className="inline-flex h-6 items-center rounded border border-border px-3 text-[11px] text-muted-foreground">Cancel</span>
                <span className={`inline-flex h-6 items-center rounded px-3 text-[11px] font-medium transition-all duration-300 ${
                  logFrame >= 4 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                }`}>Save</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Set Your Goal ── */}
        {step === 2 && (
          <div className="px-5 pb-2 space-y-3 overflow-y-auto flex-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isDemo
                ? "Set a target date and pick a problem set for this preview. Sign in when you want Aurora to remember the plan."
                : "Set a target date and pick a problem set. You can change these anytime in settings."}
            </p>

            {/* Target date + countdown name — side by side */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="onboarding-date" className="block text-xs text-muted-foreground mb-1">Target date</label>
                <input
                  id="onboarding-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    if (!countdownNameEdited.current) {
                      setCountdownName(defaultCountdownName(e.target.value));
                    }
                  }}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label htmlFor="onboarding-countdown-name" className="block text-xs text-muted-foreground mb-1">Countdown name</label>
                <input
                  id="onboarding-countdown-name"
                  type="text"
                  value={countdownName}
                  onChange={(e) => {
                    countdownNameEdited.current = true;
                    setCountdownName(e.target.value);
                  }}
                  placeholder="September Countdown"
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            {/* Time budget selector */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">How much time can you practice daily?</p>
              <div className="grid grid-cols-4 gap-1.5">
                {ONBOARDING_BUDGET_PRESETS.map((p) => (
                  <button
                    key={p.minutes}
                    onClick={() => setSelectedTimeBudget(p.minutes)}
                    className={`text-left rounded-lg border px-3 py-2 transition-all ${
                      selectedTimeBudget === p.minutes
                        ? "border-accent bg-accent/10 ring-1 ring-accent/50"
                        : "border-border hover:border-border/80 hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-sm font-medium block">{p.label}</span>
                    <span className="text-xs text-muted-foreground">{p.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Problem set */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Problem set</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "blind75" as const, label: "Blind 75", count: 75 },
                  { id: "neetcode150" as const, label: "NeetCode 150", count: 150 },
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
                      <span className="text-xs text-muted-foreground tabular-nums">{goal.count}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

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

        {/* ── Step 3: Your Daily Plan ── */}
        {step === 3 && (
          <div className="px-5 pb-2 space-y-2 overflow-y-auto flex-1">
            {(() => {
              const cap = Math.max(1, Math.floor(selectedTimeBudget / 25));
              const sessionSize = Math.min(Math.max(2, cap + 1), 8);
              const coverageNewCount = strategyToSettings("coverage", sessionSize).newPerSession;
              const strategies: { id: Strategy; label: string; desc: string }[] = [
                {
                  id: "steady",
                  label: "Steady Pace",
                  desc: "Reviews first, 1 new problem/day — keeps your queue manageable as you build coverage.",
                },
                {
                  id: "coverage",
                  label: "Push Coverage",
                  desc: `${coverageNewCount} new problem${coverageNewCount !== 1 ? "s" : ""}/day — grow coverage fast${coverageNewCount < 2 ? " (budget limits new slots)" : ", review load grows over time"}.`,
                },
                {
                  id: "retention",
                  label: "Lock In Retention",
                  desc: "Reviews only — reinforce everything you've seen before adding anything new.",
                },
              ];
              return (
                <div className="space-y-2">
                  {strategies.map((s) => {
                    const settings = strategyToSettings(s.id, sessionSize);
                    const reviewCount = sessionSize - settings.newPerSession;
                    const newCount = settings.newPerSession;
                    const isSelected = selectedStrategy === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStrategy(s.id)}
                        className={`w-full text-left rounded-lg border p-3 transition-all ${
                          isSelected
                            ? "border-accent bg-accent/10 ring-1 ring-accent/50"
                            : "border-border hover:border-border/80 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-medium">{s.label}</span>
                          {s.id === "steady" && <span className="text-[10px] text-accent font-medium shrink-0">recommended</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{s.desc}</p>
                        {/* Session bar visual */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: sessionSize }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-2 flex-1 rounded-sm ${
                                i < reviewCount
                                  ? "bg-accent"
                                  : "bg-accent/25"
                              }`}
                            />
                          ))}
                          <span className="text-xs font-medium text-foreground/70 ml-1.5 shrink-0">
                            {reviewCount}r + {newCount}n
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Sound opt-in (moved here from step 2) */}
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent/50"
              />
              <div>
                <span className="text-sm font-medium">Enable celebration sounds</span>
                <p className="text-xs text-muted-foreground">Plays a sound when you finish a session. Change anytime in settings.</p>
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
