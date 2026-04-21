"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { SkyCanvas } from "@/components/sky-canvas";

/* ── Types ── */

interface CategoryStat {
  name: string;
  total: number;
  easy: number;
  medium: number;
  hard: number;
}

interface LandingPageProps {
  totalProblems: number;
  categories: CategoryStat[];
  isAuthenticated: boolean;
  authConfigured: boolean;
}

/* ── Headline variants ── */

const HEADLINES: { top: string; bottom: string }[] = [
  { top: "Your brain forgets.", bottom: "Aurora doesn\u2019t." },
  { top: "Stop guessing what", bottom: "you need to practice." },
  { top: "Review smarter.", bottom: "Not more." },
  { top: "Know it today.", bottom: "Still know it in 30 days." },
  { top: "The algorithm remembers", bottom: "what you forget." },
  { top: "Stop re-solving problems", bottom: "you already know." },
];

/* ── SVG Constellation Map with Path Illumination ── */

const MAP_NODES = [
  { label: "Arrays & Hashing", x: 195, y: 10 },
  { label: "Two Pointers", x: 40, y: 95 },
  { label: "Stack", x: 355, y: 85 },
  { label: "Binary Search", x: 365, y: 195 },
  { label: "Sliding Window", x: 175, y: 130 },
  { label: "Linked List", x: 10, y: 215 },
  { label: "Trees", x: 210, y: 250 },
  { label: "Tries", x: 50, y: 340 },
  { label: "Heap / PQ", x: 330, y: 335 },
  { label: "Backtracking", x: 380, y: 280 },
  { label: "Graphs", x: 155, y: 410 },
  { label: "1-D DP", x: 330, y: 420 },
];

// Indices: 0=Arrays 1=TwoPtr 2=Stack 3=BinSearch 4=SlidWin 5=LinkedList 6=Trees 7=Tries 8=Heap 9=Backtrack 10=Graphs 11=DP
const MAP_EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [4, 6], [5, 6], [3, 6],
  [6, 7], [6, 8], [6, 9], [7, 10], [8, 11], [9, 11], [10, 11],
];

// Predefined learning paths — each starts with fundamentals, ends with advanced
const LEARNING_PATHS = [
  // Breadth-first: arrays → pointers → sliding → stack → binary → linked → trees → tries → heap → backtrack → graphs → dp
  [0, 1, 4, 2, 3, 5, 6, 7, 8, 9, 10, 11],
  // Stack-heavy: arrays → stack → two ptr → binary → sliding → linked → trees → heap → backtrack → tries → graphs → dp
  [0, 2, 1, 3, 4, 5, 6, 8, 9, 7, 10, 11],
  // Pointer-first: arrays → two ptr → linked → sliding → binary → stack → trees → backtrack → tries → heap → graphs → dp
  [0, 1, 5, 4, 3, 2, 6, 9, 7, 8, 10, 11],
];

const NODE_W = 140;
const NODE_H = 34;
const NODE_DELAY = 1200; // ms between node reveals

function ConstellationMap() {
  const [revealedNodes, setRevealedNodes] = useState<Set<number>>(new Set());
  const [revealedEdges, setRevealedEdges] = useState<Set<string>>(new Set());
  const [latestNode, setLatestNode] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const pathRef = useRef<number[]>([]);

  // Pick a random path on mount
  useEffect(() => {
    const path = LEARNING_PATHS[Math.floor(Math.random() * LEARNING_PATHS.length)];
    pathRef.current = path;

    // Reveal nodes one at a time
    path.forEach((nodeIdx, step) => {
      setTimeout(() => {
        setRevealedNodes((prev) => new Set(prev).add(nodeIdx));
        setLatestNode(nodeIdx);

        // Reveal any edges connecting this node to already-revealed nodes
        const revealed = new Set<number>();
        path.slice(0, step + 1).forEach((n) => revealed.add(n));

        MAP_EDGES.forEach(([a, b]) => {
          if (revealed.has(a) && revealed.has(b)) {
            setRevealedEdges((prev) => new Set(prev).add(`${a}-${b}`));
          }
        });
      }, (step + 1) * NODE_DELAY);
    });
  }, []);

  const floats = useMemo(
    () =>
      MAP_NODES.map(() => ({
        dx: (Math.random() - 0.5) * 8,
        dy: (Math.random() - 0.5) * 8,
        dur: (3.5 + Math.random() * 4).toFixed(1),
      })),
    [],
  );

  return (
    <svg viewBox="-10 -35 550 505" className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Edges — dim until revealed, then glow */}
      {MAP_EDGES.map(([a, b], i) => {
        const key = `${a}-${b}`;
        const active = revealedEdges.has(key);
        return (
          <line
            key={`e-${i}`}
            x1={MAP_NODES[a].x + NODE_W / 2}
            y1={MAP_NODES[a].y + NODE_H / 2}
            x2={MAP_NODES[b].x + NODE_W / 2}
            y2={MAP_NODES[b].y + NODE_H / 2}
            stroke={active ? "rgba(167, 139, 250, 0.7)" : "rgba(124, 58, 237, 0.08)"}
            strokeWidth={active ? "2" : "0.5"}
            filter={active ? "url(#glow)" : undefined}
            style={{
              transition: "stroke 0.8s ease, stroke-width 0.8s ease",
              ...(active ? { animation: `line-pulse ${4 + (i % 5) * 0.7}s ease-in-out ${(i % 7) * 0.5}s infinite` } : {}),
            }}
          />
        );
      })}

      {/* Nodes — dim until revealed, glow on latest */}
      {MAP_NODES.map((n, i) => {
        const f = floats[i];
        const active = revealedNodes.has(i);
        const isLatest = latestNode === i;
        const isHovered = hoveredNode === i;
        const nodeOpacity = active ? 1 : 0.12;
        const fillAlpha = isHovered ? 0.14 : active ? 0.12 : 0.03;
        const strokeAlpha = isHovered ? 0.6 : active ? 0.3 : 0.1;
        const dotAlpha = active ? 0.9 : 0.15;

        return (
          <g
            key={`n-${i}`}
            style={{
              transition: "opacity 0.8s ease",
              opacity: nodeOpacity,
              cursor: active ? "default" : undefined,
            }}
            filter={isLatest ? "url(#glow-strong)" : active ? "url(#glow)" : undefined}
            onMouseEnter={() => active && setHoveredNode(i)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`${n.x},${n.y}; ${n.x + f.dx},${n.y + f.dy}; ${n.x},${n.y}`}
              dur={`${f.dur}s`}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
            />
            <rect
              width={NODE_W}
              height={NODE_H}
              rx="6"
              fill={`rgba(167, 139, 250, ${fillAlpha})`}
              stroke={`rgba(167, 139, 250, ${strokeAlpha})`}
              strokeWidth="0.7"
            />
            <circle cx="12" cy={NODE_H / 2} r="3.5" fill={`rgba(167, 139, 250, ${dotAlpha})`} />
            <text
              x={NODE_W / 2 + 4}
              y={NODE_H / 2 + 4.5}
              textAnchor="middle"
              fontSize="13"
              fill={active ? "rgba(237,233,246,0.95)" : "rgba(167,139,250,0.15)"}
              fontFamily="system-ui, sans-serif"
              fontWeight={isHovered ? 500 : undefined}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── 3D Parallax Tilt Hook ── */

function useTilt(maxDeg = 10) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const { width, height, left, top } = el.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      const rotX = ((height / 2 - y) / height) * maxDeg;
      const rotY = ((x - width / 2) / width) * maxDeg;
      el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
    },
    [maxDeg],
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)";
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}

/* ── Feature Card with tilt ── */

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(8);

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="rounded-lg border border-border/40 bg-muted/40 p-2 backdrop-blur-sm cursor-default"
      style={{
        transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)",
        transformStyle: "preserve-3d",
        transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
      }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-xs">{icon}</span>
        <p className="text-xs font-semibold text-foreground">{title}</p>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
    </div>
  );
}

/* ── Main Landing Page ── */

export function LandingPage({ totalProblems, categories, isAuthenticated, authConfigured }: LandingPageProps) {
  // Start at 0 for SSR, randomize on client mount to avoid hydration mismatch
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHeadlineIdx(Date.now() % HEADLINES.length);
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setHeadlineIdx((i) => (i + 1) % HEADLINES.length);
        setVisible(true);
      }, 600);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const headline = HEADLINES[headlineIdx];

  return (
    <div
      className="relative flex h-[calc(100dvh-3.5rem-1px)] flex-col overflow-hidden"
      style={{ width: "100vw", marginLeft: "calc(-50vw + 50%)", marginTop: "-2rem", marginBottom: "-2rem" }}
    >
      <SkyCanvas />

      {/* ── Main: hero + constellation centered together as a unit ── */}
      <main className="relative z-10 flex-1 min-h-0 flex items-center justify-center">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-8 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12">
          {/* Hero */}
          <div className="w-full max-w-lg shrink-0 space-y-2 sm:space-y-3">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-accent">Spaced repetition for LeetCode</p>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight min-h-[4rem] sm:min-h-[4.5rem] text-white" style={{ textShadow: "0 2px 24px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.6)" }}>
              <span
                className="inline-block"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(8px)",
                  transition: "opacity 0.8s ease, transform 0.8s ease",
                }}
              >
                {headline.top}
                <br />
                <span className="text-accent">{headline.bottom}</span>
              </span>
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
              Like Anki, but for coding interviews. Solve problems, rate your recall —
              Aurora schedules your next review at the optimal time.
            </p>

            {!isAuthenticated && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {authConfigured ? (
                  <Link
                    href="/auth/signin"
                    className="inline-flex h-10 items-center rounded-md bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-[0_0_28px_var(--glow)] transition-all duration-150 hover:shadow-[0_0_40px_var(--glow)]"
                  >
                    Get started — free
                  </Link>
                ) : (
                  <Link
                    href="/problems"
                    className="inline-flex h-10 items-center rounded-md bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-[0_0_28px_var(--glow)] transition-all duration-150 hover:shadow-[0_0_40px_var(--glow)]"
                  >
                    Browse Problems
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 items-center rounded-md border border-accent/30 px-5 text-sm font-medium text-foreground transition-all duration-150 hover:border-accent/60 hover:shadow-[0_0_20px_var(--glow)]"
                >
                  View demo
                </Link>
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-center flex-1">
                <p className="text-base font-bold text-foreground">{totalProblems}</p>
                <p className="text-[11px] text-muted-foreground">problems</p>
              </div>
              <div className="h-5 w-px bg-border/50" />
              <div className="text-center flex-1">
                <p className="text-base font-bold text-foreground">{categories.length}</p>
                <p className="text-[11px] text-muted-foreground">categories</p>
              </div>
              <div className="h-5 w-px bg-border/50" />
              <div className="text-center relative group focus-within:*:last-child:opacity-100 focus-within:*:last-child:pointer-events-auto flex-1">
                <div className="flex items-center gap-1 justify-center">
                  <p className="text-base font-bold text-foreground">FSRS</p>
                  <button type="button" className="text-muted-foreground/60 text-[10px] cursor-help" aria-label="What is FSRS?">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">algorithm</p>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-lg border border-border/60 bg-muted/95 p-3 text-left text-xs text-foreground shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50">
                  <p className="font-semibold mb-1">Free Spaced Repetition Scheduler</p>
                  <p className="text-muted-foreground leading-relaxed">An open-source algorithm that schedules reviews at growing intervals based on how well you retain each problem. Aurora adapts it using solve outcome, confidence, and solve speed.</p>
                </div>
              </div>
              {isAuthenticated && (
                <>
                  <div className="h-5 w-px bg-border/50" />
                  <Link
                    href="/dashboard"
                    className="inline-flex h-8 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-[0_0_20px_var(--glow)] transition-all duration-150 hover:shadow-[0_0_32px_var(--glow)] flex-1"
                  >
                    Go to Dashboard
                  </Link>
                </>
              )}
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-1.5">
              <FeatureCard icon="🧠" title="Spaced Recall" desc="Review intervals grow as you prove mastery" />
              <FeatureCard icon="📊" title="Readiness Score" desc="Know exactly how prepared you are (S–D tier)" />
              <FeatureCard icon="🎯" title="Category Focus" desc="Target weak categories with smart filtering" />
              <FeatureCard icon="⏱️" title="Mock Interviews" desc="Timed sessions from your weak spots" />
            </div>

            {/* Sub-nav links + github */}
            <div className="flex items-center justify-around gap-4">
              <Link href="/info" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                How it works
              </Link>
              <a
                href="https://github.com/CadenceElaina/aurora"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                Free &amp; open source
              </a>
              <Link href="/problems" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Browse problems
              </Link>
            </div>
          </div>

          {/* Constellation — hidden below lg */}
          <div className="hidden lg:flex items-center justify-center shrink-0">
            <div className="w-[480px] xl:w-[540px] aspect-[10/9]" style={{ filter: "drop-shadow(0 0 50px rgba(167, 139, 250, 0.08))" }}>
              <ConstellationMap />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
