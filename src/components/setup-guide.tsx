"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const GITHUB_README = "https://github.com/CadenceElaina/aurora#getting-started";
const POS_KEY = "aurora_guide_pos";
const FLOAT_W = 540;

type Mode = "closed" | "modal" | "float";

/* ── Small reusable primitives ── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      className="absolute top-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function Block({ children }: { children: string }) {
  return (
    <div className="relative group my-2">
      <pre className="rounded-lg border border-border/60 bg-background/60 p-3 pr-14 font-mono text-[12px] text-foreground/90 overflow-x-auto whitespace-pre leading-[1.7]">
        {children}
      </pre>
      <CopyButton text={children} />
    </div>
  );
}

function Inline({ children }: { children: string }) {
  return (
    <code className="rounded-md bg-background/80 border border-border/50 px-1.5 py-[2px] font-mono text-[11px] text-accent">
      {children}
    </code>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 my-2">
      <span className="text-amber-400 text-sm shrink-0 mt-px">⚠</span>
      <div className="text-xs text-amber-300/80 leading-relaxed">{children}</div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1">
      <div className="shrink-0 w-6 h-6 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed flex-1">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border/30 my-3" />;
}

function EnvVar({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-1.5">
      <p className="font-mono text-[12px] text-accent font-semibold tracking-tight">{name}</p>
      <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

/* ── Section icons (inline SVG, 16×16) ── */

const Icons = {
  prereqs: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  install: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  ),
  env: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  ),
  database: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  deploy: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  github: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  ),
  wrench: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
};

/* ── Section definitions ── */

const SECTIONS: { id: string; label: string; icon: React.ReactNode; content: () => React.ReactNode }[] = [
  {
    id: "prereqs",
    label: "Prerequisites",
    icon: Icons.prereqs,
    content: () => (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">What you need</h3>
          <p className="text-xs text-muted-foreground">Aurora is open source — you deploy your own instance with your own database and credentials.</p>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-border/40">
            <span className="text-base mt-px">⬡</span>
            <div>
              <p className="text-sm font-medium text-foreground">Node.js 18+</p>
              <p className="text-xs text-muted-foreground mt-0.5">Check with <Inline>node -v</Inline></p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-border/40">
            <span className="text-base mt-px">🗄</span>
            <div>
              <p className="text-sm font-medium text-foreground">Supabase account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Free tier works.{" "}
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">supabase.com →</a>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-border/40">
            <span className="text-base mt-px">🐙</span>
            <div>
              <p className="text-sm font-medium text-foreground">GitHub account</p>
              <p className="text-xs text-muted-foreground mt-0.5">Required for OAuth sign-in. Also used for optional GitHub Sync.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "install",
    label: "Clone & Install",
    icon: Icons.install,
    content: () => (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Clone the repo</h3>
          <p className="text-xs text-muted-foreground">Clone, install dependencies, and copy the env template.</p>
        </div>
        <Block>{`git clone https://github.com/CadenceElaina/aurora.git
cd aurora
npm install
cp .env.example .env.local`}</Block>
        <p className="text-xs text-muted-foreground">
          Edit <Inline>.env.local</Inline> with your four credentials — see the <strong className="text-foreground">Env Vars</strong> section next.
        </p>
      </div>
    ),
  },
  {
    id: "env",
    label: "Env Vars",
    icon: Icons.env,
    content: () => (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Environment variables</h3>
          <p className="text-xs text-muted-foreground">Four variables required in <Inline>.env.local</Inline>.</p>
        </div>
        <div className="space-y-2">
          <EnvVar name="DATABASE_URL">
            Supabase: <strong className="text-foreground">Project Settings → Database → URI</strong>.
            Use the direct connection string, not the pooler URL.
          </EnvVar>
          <EnvVar name="AUTH_SECRET">
            Generate locally — paste only the printed value:
            <Block>npx auth secret</Block>
          </EnvVar>
          <EnvVar name="AUTH_GITHUB_ID / AUTH_GITHUB_SECRET">
            Create a GitHub OAuth App at{" "}
            <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              github.com/settings/developers →
            </a>
            <div className="mt-1.5 space-y-0.5 text-[11px]">
              <p>· Homepage URL: <Inline>http://localhost:3000</Inline></p>
              <p>· Callback URL: <Inline>http://localhost:3000/api/auth/callback/github</Inline></p>
            </div>
          </EnvVar>
        </div>
      </div>
    ),
  },
  {
    id: "database",
    label: "Database",
    icon: Icons.database,
    content: () => (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Push schema & seed</h3>
          <p className="text-xs text-muted-foreground">Creates all tables and seeds the 150 NeetCode problems.</p>
        </div>
        <Block>{`npx drizzle-kit push
npx tsx scripts/seed.ts`}</Block>
        <Warn>
          If <Inline>drizzle-kit push</Inline> crashes on check constraints, use{" "}
          <Inline>npx drizzle-kit generate</Inline> to produce SQL and apply it manually in the Supabase SQL Editor.
        </Warn>
        <Divider />
        <div>
          <p className="text-xs font-medium text-foreground mb-1.5">If sign-in fails (RLS error)</p>
          <p className="text-xs text-muted-foreground mb-1">Supabase enables Row Level Security by default. Run in the SQL Editor:</p>
          <Block>{`ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "user"
  FOR ALL USING (true) WITH CHECK (true);

-- Repeat for: account, session, verification_token`}</Block>
        </div>
      </div>
    ),
  },
  {
    id: "deploy",
    label: "Deploy",
    icon: Icons.deploy,
    content: () => (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Deploy to Vercel</h3>
          <p className="text-xs text-muted-foreground">Recommended — free tier works, auto-deploys on push.</p>
        </div>
        <div className="space-y-2">
          <Step n={1}>
            Push your repo to GitHub, then import it at{" "}
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">vercel.com</a>
          </Step>
          <Step n={2}>
            <strong className="text-foreground">Settings → Environment Variables</strong> — add all four vars:
            {" "}<Inline>DATABASE_URL</Inline>, <Inline>AUTH_SECRET</Inline>,{" "}
            <Inline>AUTH_GITHUB_ID</Inline>, <Inline>AUTH_GITHUB_SECRET</Inline>
          </Step>
          <Step n={3}>
            Update your GitHub OAuth callback URL to match your domain:
            <Block>{`https://your-app.vercel.app/api/auth/callback/github`}</Block>
          </Step>
          <Step n={4}>Deploy — Vercel auto-deploys on every push to <Inline>main</Inline></Step>
        </div>
        <Warn>
          Paste only the <strong>value</strong> in Vercel env vars — not the full <Inline>KEY=value</Inline> line. Vercel doesn&apos;t strip the key prefix.
        </Warn>
      </div>
    ),
  },
  {
    id: "github-sync",
    label: "GitHub Sync",
    icon: Icons.github,
    content: () => (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">GitHub Sync <span className="ml-1.5 text-[10px] font-normal text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">optional</span></h3>
          <p className="text-xs text-muted-foreground">Auto-detect solved NeetCode problems and surface them for quick confirmation on your dashboard.</p>
        </div>
        <div className="space-y-2">
          <Step n={1}>
            Connect NeetCode to GitHub at{" "}
            <a href="https://neetcode.io/profile/github" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">neetcode.io/profile/github</a>.
            NeetCode creates a submissions repo automatically.
          </Step>
          <Step n={2}>
            In your Aurora dashboard, click the GitHub icon in the nav → enter your submissions repo name → <strong className="text-foreground">Connect</strong>.
            Copy the Payload URL and Secret it shows you.
          </Step>
          <Step n={3}>
            Go to your GitHub repo → <strong className="text-foreground">Settings → Webhooks → Add webhook</strong>.
            Paste the Payload URL and Secret.
          </Step>
          <Step n={4}>
            <Warn>
              Change <strong>Content type</strong> to <Inline>application/json</Inline>.
              GitHub defaults to form-urlencoded — the webhook silently fails without this change.
            </Warn>
          </Step>
          <Step n={5}>
            Select <strong className="text-foreground">Just the push event</strong>, keep SSL enabled → <strong className="text-foreground">Add webhook</strong>.
          </Step>
        </div>
      </div>
    ),
  },
  {
    id: "troubleshoot",
    label: "Troubleshoot",
    icon: Icons.wrench,
    content: () => (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Common issues</h3>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/40 bg-background/30 p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">CallbackRouteError after deploying</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>· Verify all 4 env vars are set in Vercel (values only, not KEY=value)</li>
              <li>· GitHub OAuth callback URL must match your deployed domain exactly</li>
              <li>· Redeploy after changing env vars — Vercel doesn&apos;t hot-apply them</li>
            </ul>
          </div>

          <div className="rounded-lg border border-border/40 bg-background/30 p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">incorrect_client_credentials</p>
            <p className="text-xs text-muted-foreground">
              <Inline>AUTH_GITHUB_ID</Inline> or <Inline>AUTH_GITHUB_SECRET</Inline> doesn&apos;t match GitHub.
              Check your OAuth App — if the secret was lost, generate a new one and redeploy.
            </p>
          </div>

          <div className="rounded-lg border border-border/40 bg-background/30 p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">Sign-in fails — RLS error</p>
            <p className="text-xs text-muted-foreground">See the Database section — apply the RLS policy SQL in the Supabase SQL Editor.</p>
          </div>

          <div className="rounded-lg border border-border/40 bg-background/30 p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">drizzle-kit push crashes</p>
            <p className="text-xs text-muted-foreground">
              Use <Inline>npx drizzle-kit generate</Inline> to produce migration SQL, then apply it manually in Supabase.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

/* ── Shared content area ── */

function GuideContent({ activeIdx, setActiveIdx }: { activeIdx: number; setActiveIdx: (i: number) => void }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeIdx]);

  return (
    <>
      <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        {SECTIONS[activeIdx].content()}
      </div>

      <div className="shrink-0 border-t border-border/40 px-5 py-2.5 flex items-center justify-between bg-background/20">
        <div>
          {activeIdx > 0 && (
            <button onClick={() => setActiveIdx(activeIdx - 1)} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              ← {SECTIONS[activeIdx - 1].label}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a href={GITHUB_README} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            Full README ↗
          </a>
          {activeIdx < SECTIONS.length - 1 && (
            <button onClick={() => setActiveIdx(activeIdx + 1)} className="text-[11px] text-accent hover:opacity-80 transition-opacity flex items-center gap-1">
              {SECTIONS[activeIdx + 1].label} →
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Sidebar nav — shared between modal and float ── */

function SidebarNav({ activeIdx, setActiveIdx }: { activeIdx: number; setActiveIdx: (i: number) => void }) {
  return (
    <div className="w-36 shrink-0 border-r border-border/40 flex flex-col py-4 gap-0.5 px-2">
      <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-2 mb-2">Setup Guide</p>
      {SECTIONS.map((s, i) => (
        <button
          key={s.id}
          onClick={() => setActiveIdx(i)}
          className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-all duration-150 ${
            i === activeIdx
              ? "bg-accent/15 text-accent font-medium border border-accent/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
          }`}
        >
          <span className={i === activeIdx ? "text-accent" : "text-muted-foreground/60"}>{s.icon}</span>
          {s.label}
        </button>
      ))}
    </div>
  );
}

/* ── Panel header — shared between modal and float ── */

interface PanelHeaderProps {
  onClose: () => void;
  onPopOut?: () => void;
  onPopIn?: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
}

function PanelHeader({ onClose, onPopOut, onPopIn, onDragStart }: PanelHeaderProps) {
  const draggable = !!onDragStart;
  return (
    <div
      className={`shrink-0 h-11 flex items-center justify-between px-4 border-b border-border/40 bg-background/30 select-none${draggable ? " cursor-grab active:cursor-grabbing" : ""}`}
      onMouseDown={onDragStart}
    >
      <div className="flex items-center gap-2 min-w-0">
        {draggable && (
          <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor" className="text-muted-foreground/30 shrink-0">
            <circle cx="2" cy="2.5" r="1.4"/><circle cx="6" cy="2.5" r="1.4"/>
            <circle cx="2" cy="7" r="1.4"/><circle cx="6" cy="7" r="1.4"/>
            <circle cx="2" cy="11.5" r="1.4"/><circle cx="6" cy="11.5" r="1.4"/>
          </svg>
        )}
        <span className="text-sm font-semibold text-foreground">Aurora</span>
        <span className="text-muted-foreground/30 text-sm">·</span>
        <span className="text-sm text-muted-foreground truncate">Setup Guide</span>
      </div>
      <div
        className="flex items-center gap-1 shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {onPopOut && (
          <button
            onClick={onPopOut}
            title="Pop out"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            </svg>
            Pop out
          </button>
        )}
        {onPopIn && (
          <button
            onClick={onPopIn}
            title="Back to modal"
            className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            ↙ Modal
          </button>
        )}
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Main component ── */

interface SetupGuideProps {
  /** Override the default trigger. Receives an onClick handler. */
  trigger?: (props: { onClick: () => void }) => React.ReactNode;
}

export function SetupGuide({ trigger }: SetupGuideProps = {}) {
  const [mode, setMode] = useState<Mode>("closed");
  const [activeIdx, setActiveIdx] = useState(0);
  const [pos, setPos] = useState({ x: 24, y: 80 });
  const [isDesktop, setIsDesktop] = useState(false);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const justSwitchedRef = useRef(false);

  useEffect(() => {
    function check() { setIsDesktop(window.innerWidth >= 1024); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - FLOAT_W - 16, p.x)),
          y: Math.max(0, Math.min(window.innerHeight - 120, p.y)),
        });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (mode === "float") {
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
    }
  }, [pos, mode]);

  const open = useCallback(() => { setMode(isDesktop ? "float" : "modal"); }, [isDesktop]);
  const close = useCallback(() => setMode("closed"), []);

  useEffect(() => {
    if (mode === "closed") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode, close]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };

    function onMove(ev: MouseEvent) {
      if (!dragState.current.dragging) return;
      const newX = Math.max(0, Math.min(window.innerWidth - FLOAT_W - 8, dragState.current.startPosX + ev.clientX - dragState.current.startX));
      const newY = Math.max(0, Math.min(window.innerHeight - 120, dragState.current.startPosY + ev.clientY - dragState.current.startY));
      setPos({ x: newX, y: newY });
    }
    function onUp() {
      dragState.current.dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [pos.x, pos.y]);

  const popOut = useCallback(() => {
    justSwitchedRef.current = true;
    setMode("float");
    setTimeout(() => { justSwitchedRef.current = false; }, 150);
  }, []);

  const popIn = useCallback(() => {
    justSwitchedRef.current = true;
    setMode("modal");
    setTimeout(() => { justSwitchedRef.current = false; }, 150);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (justSwitchedRef.current) return;
    close();
  }, [close]);

  const defaultTrigger = (
    <button
      onClick={open}
      className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/95 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
    >
      <span className="text-muted-foreground/70">{Icons.wrench}</span>
      Setup Guide
    </button>
  );

  // Portal target — renders modal/float/minimized outside the nav's stacking context
  // (backdrop-blur on the nav creates a new containing block that traps fixed children)
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <>
      {mode === "closed" && (trigger ? trigger({ onClick: open }) : defaultTrigger)}

      {/* Modal — portaled to body to escape nav's containing block */}
      {mode === "modal" && portalTarget && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Setup Guide"
          onMouseDown={handleBackdropClick}
        >
          <div
            className="relative flex flex-col w-full max-w-xl mx-4 rounded-2xl border border-border/60 bg-muted/95 shadow-2xl overflow-hidden"
            style={{ height: "75vh" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <PanelHeader
              onClose={close}
              onPopOut={isDesktop ? popOut : undefined}
            />
            <div className="flex flex-1 min-h-0">
              <SidebarNav activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
              <div className="flex flex-col flex-1 min-h-0">
                <GuideContent activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
              </div>
            </div>
          </div>
        </div>,
        portalTarget
      )}

      {/* Floating panel — portaled to body */}
      {mode === "float" && portalTarget && createPortal(
        <div
          className="fixed z-[200] flex flex-col rounded-2xl border border-border/60 bg-muted/95 shadow-2xl overflow-hidden"
          style={{ left: pos.x, top: pos.y, width: FLOAT_W, height: "75vh" }}
        >
          <PanelHeader
            onClose={close}
            onPopIn={popIn}
            onDragStart={handleDragStart}
          />
          <div className="flex flex-1 min-h-0">
            <SidebarNav activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
            <div className="flex flex-col flex-1 min-h-0">
              <GuideContent activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
            </div>
          </div>
        </div>,
        portalTarget
      )}
    </>
  );
}
