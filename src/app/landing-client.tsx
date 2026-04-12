"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";

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

/* ── Canvas Sky ── */

function SkyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = 0;
    let H = 0;

    function resize() {
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      canvas!.width = W * devicePixelRatio;
      canvas!.height = H * devicePixelRatio;
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    // Stars
    type FixedStar = { x: number; y: number; r: number; a: number; ts: number; to: number };
    const stars: FixedStar[] = [];
    function makeStars() {
      stars.length = 0;
      const count = Math.floor((W * H) / 2600);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H * 0.85,
          r: Math.random() * 1.25 + 0.2,
          a: Math.random() * 0.5 + 0.3,
          ts: Math.random() * 0.018 + 0.004,
          to: Math.random() * Math.PI * 2,
        });
      }
    }
    makeStars();
    const resizeCb = () => {
      resize();
      makeStars();
    };
    window.removeEventListener("resize", resize);
    window.addEventListener("resize", resizeCb);

    // Shooting stars
    type Shooter = { x: number; y: number; vx: number; vy: number; len: number; life: number };
    const shooters: Shooter[] = [];
    let lastShoot = 0;

    const BG = ["#000008", "#04000f", "#07000e", "#0c0015"];
    const STAR_COLOR = "#a78bfa";
    const NEB = { xf: 0.26, yf: 0.40, rx: 200, ry: 110, col: "#7c3aed", al: 0.14 };

    function hexAlpha(hex: string, a: number) {
      return hex + Math.floor(a * 255).toString(16).padStart(2, "0");
    }

    function frame(ts: number) {
      ctx!.clearRect(0, 0, W, H);

      // Background gradient
      const gr = ctx!.createLinearGradient(0, 0, 0, H);
      BG.forEach((c, i) => gr.addColorStop(i / (BG.length - 1), c));
      ctx!.fillStyle = gr;
      ctx!.fillRect(0, 0, W, H);

      // Nebula glow
      const ox = W * NEB.xf;
      const oy = H * NEB.yf;
      const ng = ctx!.createRadialGradient(ox, oy, 0, ox, oy, Math.max(NEB.rx, NEB.ry));
      ng.addColorStop(0, hexAlpha(NEB.col, NEB.al));
      ng.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.save();
      ctx!.scale(1, NEB.ry / NEB.rx);
      ctx!.fillStyle = ng;
      ctx!.beginPath();
      ctx!.arc(ox, (oy * NEB.rx) / NEB.ry, NEB.rx, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();

      // Stars
      for (const s of stars) {
        const a = s.a * (0.55 + 0.45 * Math.sin(ts * s.ts + s.to));
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = hexAlpha(STAR_COLOR, a);
        ctx!.fill();
      }

      // Shooting stars
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        const tail = ctx!.createLinearGradient(
          s.x, s.y,
          s.x - (s.vx * s.len) / 5, s.y - (s.vy * s.len) / 5,
        );
        tail.addColorStop(0, `rgba(255,255,255,${s.life * 0.8})`);
        tail.addColorStop(1, "rgba(255,255,255,0)");
        ctx!.beginPath();
        ctx!.moveTo(s.x, s.y);
        ctx!.lineTo(s.x - (s.vx * s.len) / 5, s.y - (s.vy * s.len) / 5);
        ctx!.strokeStyle = tail;
        ctx!.lineWidth = 1.3;
        ctx!.stroke();
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.022;
        if (s.life <= 0) shooters.splice(i, 1);
      }
      if (ts - lastShoot > 2800 + Math.random() * 4000) {
        shooters.push({
          x: Math.random() * W * 0.55 + 80,
          y: Math.random() * H * 0.3 + 10,
          vx: 4 + Math.random() * 3,
          vy: 2 + Math.random() * 1.5,
          len: 65 + Math.random() * 55,
          life: 1,
        });
        lastShoot = ts;
      }

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCb);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

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
  [0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [5, 6], [3, 6],
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
  }, []);;

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
    <svg viewBox="-10 -35 550 505" className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
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

      {/* Nodes — dim until revealed; active nodes styled like "How it works" button */}
      {MAP_NODES.map((n, i) => {
        const f = floats[i];
        const active = revealedNodes.has(i);
        const isLatest = latestNode === i;
        const isHovered = hoveredNode === i && active;
        const nodeOpacity = active ? 1 : 0.1;
        // Border matches button: accent/30 at rest → accent/60 on hover
        const strokeColor = isHovered
          ? "rgba(167, 139, 250, 0.6)"
          : active
          ? "rgba(167, 139, 250, 0.3)"
          : "rgba(124, 58, 237, 0.08)";
        const fillColor = isHovered
          ? "rgba(167, 139, 250, 0.14)"
          : active
          ? "rgba(167, 139, 250, 0.06)"
          : "rgba(167, 139, 250, 0.02)";
        // Text is foreground-white (like button text), not purple accent
        const textColor = active ? "rgba(237, 233, 246, 0.95)" : "rgba(167, 139, 250, 0.12)";
        const dotColor = active ? "rgba(167, 139, 250, 0.9)" : "rgba(167, 139, 250, 0.12)";

        return (
          <g
            key={`n-${i}`}
            style={{ transition: "opacity 0.8s ease", opacity: nodeOpacity, cursor: active ? "default" : "default" }}
            filter={isHovered || isLatest ? "url(#glow-strong)" : active ? "url(#glow)" : undefined}
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
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={active ? "1" : "0.5"}
            />
            <circle cx="12" cy={NODE_H / 2} r="3.5" fill={dotColor} />
            <text
              x={NODE_W / 2 + 4}
              y={NODE_H / 2 + 4.5}
              textAnchor="middle"
              fontSize="13"
              fill={textColor}
              fontFamily="system-ui, sans-serif"
              fontWeight={isHovered ? "500" : "400"}
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
        <h3 className="text-[11px] font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
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
      className="flex h-[calc(100vh-3.5rem)] flex-col relative overflow-hidden"
      style={{ width: "100vw", marginLeft: "calc(-50vw + 50%)", marginTop: "-2rem", marginBottom: "-2rem" }}
    >
      {/* Canvas sky — fixed fullscreen behind everything */}
      <div className="fixed inset-0 z-0">
        <SkyCanvas />
      </div>

      {/* ── Main split: hero left, constellation right ── */}
      <div className="flex flex-1 min-h-0 relative z-10">
        {/* Left: Hero — pushed toward center */}
        <div className="flex flex-col justify-center w-full lg:w-[45%] shrink-0 overflow-y-auto py-6 pl-[8vw] pr-8 lg:pl-[10vw] lg:pr-12">
          <div className="space-y-3 max-w-lg">
            {/* Tagline */}
            <p className="text-xs font-medium uppercase tracking-widest text-accent">Spaced repetition for LeetCode</p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl leading-tight min-h-[4.5rem] text-white">
              <span
                className="inline-block"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(8px)",
                  transition: "opacity 0.8s ease, transform 0.8s ease",
                  textShadow: "0 2px 24px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.6)",
                }}
              >
                {headline.top}
                <br />
                <span className="text-accent">
                  {headline.bottom}
                </span>
              </span>
            </h1>

            <p className="text-base leading-relaxed text-muted-foreground">
              Like Anki, but for coding interviews. Solve problems, rate your recall —
              Aurora schedules your next review at the optimal time.
            </p>

            <div className="flex items-center gap-4 pt-2">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 items-center rounded-md bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-[0_0_28px_var(--glow)] transition-all duration-150 hover:shadow-[0_0_40px_var(--glow)]"
                >
                  Go to Dashboard
                </Link>
              ) : authConfigured ? (
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
                href="/info"
                className="inline-flex h-10 items-center rounded-md border border-accent/30 px-5 text-sm font-medium text-foreground transition-all duration-150 hover:border-accent/60 hover:shadow-[0_0_20px_var(--glow)]"
              >
                How it works →
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-5">
              <div className="text-center">
                <p className="text-base font-bold text-foreground">{totalProblems}</p>
                <p className="text-[10px] text-muted-foreground">problems</p>
              </div>
              <div className="h-5 w-px bg-border/50" />
              <div className="text-center">
                <p className="text-base font-bold text-foreground">{categories.length}</p>
                <p className="text-[10px] text-muted-foreground">categories</p>
              </div>
              <div className="h-5 w-px bg-border/50" />
              <div className="text-center">
                <p className="text-base font-bold text-foreground">FSRS</p>
                <p className="text-[10px] text-muted-foreground">algorithm</p>
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-1.5">
              <FeatureCard icon="🧠" title="Spaced Recall" desc="Review intervals grow as you prove mastery" />
              <FeatureCard icon="📊" title="Readiness Score" desc="Know exactly how prepared you are (S–D tier)" />
              <FeatureCard icon="🎯" title="Pattern Drills" desc="Focus on one category, weakest first" />
              <FeatureCard icon="⏱️" title="Mock Interviews" desc="Timed sessions from your weak spots" />
            </div>
          </div>
        </div>

        {/* Right: Floating constellation — fills space, overflow visible */}
        <div className="hidden lg:flex flex-1 items-center justify-center min-h-0 overflow-visible">
          <div
            className="w-full h-full max-w-[600px] max-h-[560px] overflow-visible"
            style={{ filter: "drop-shadow(0 0 50px rgba(167, 139, 250, 0.08))" }}
          >
            <ConstellationMap />
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="px-6 py-2 shrink-0 relative z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <p className="text-xs text-muted-foreground">
            free & open source
          </p>
          <div className="flex items-center gap-4">
            <Link href="/problems" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Browse Problems
            </Link>
            <Link href="/info" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
