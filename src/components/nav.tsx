"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/problems", label: "Problems" },
  { href: "/mock-interview", label: "Mock" },
  { href: "/info", label: "Info" },
];

/* ── Time-based greeting with localStorage persistence ── */
const GREETING_KEY = "aurora_greeting";

function pickGreeting(name?: string): string {
  const hour = new Date().getHours();
  const first = name?.split(" ")[0];

  let opts: string[];
  if (hour < 4) {
    opts = first
      ? [`Burning the midnight oil, ${first}?`, `Late night grind, ${first}.`, `Still at it, ${first}?`]
      : ["Burning the midnight oil?", "Late night grind.", "Midnight session. Let's go."];
  } else if (hour < 7) {
    opts = first
      ? [`Rise and grind, ${first}.`, `Early bird, ${first}.`, `Up before the sun, ${first}.`]
      : ["Rise and grind.", "Early bird gets the offer.", "Up before the sun."];
  } else if (hour < 12) {
    opts = first
      ? [`Good morning, ${first}.`, `Morning, ${first}.`, `Let's get it, ${first}.`]
      : ["Good morning.", "Morning.", "Let's get it."];
  } else if (hour < 17) {
    opts = first
      ? [`Good afternoon, ${first}.`, `Afternoon session, ${first}.`, `Welcome back, ${first}.`]
      : ["Good afternoon.", "Afternoon session.", "Welcome back."];
  } else if (hour < 21) {
    opts = first
      ? [`Good evening, ${first}.`, `Evening, ${first}.`, `Welcome back, ${first}.`]
      : ["Good evening.", "Evening session.", "Welcome back."];
  } else {
    opts = first
      ? [`Night owl, ${first}?`, `Late session, ${first}.`, `Winding down, ${first}?`]
      : ["Night owl?", "Late session.", "Winding down?"];
  }
  return opts[Math.floor(Math.random() * opts.length)];
}

function getTimeSlot(): string {
  const hour = new Date().getHours();
  if (hour < 4) return "latenight";
  if (hour < 7) return "earlyam";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function useGreeting(userName?: string): string | null {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    if (!userName) return;

    const now = Date.now();
    const today = new Date().toDateString();
    const slot = getTimeSlot();

    try {
      const raw = localStorage.getItem(GREETING_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const sameDay = saved.day === today;
        const sameSlot = saved.slot === slot;
        const recentActivity = now - (saved.lastActivity ?? 0) < 4 * 60 * 60 * 1000;

        if (sameDay && sameSlot && recentActivity && saved.text) {
          // Same day, same time slot, active recently — reuse
          localStorage.setItem(GREETING_KEY, JSON.stringify({ ...saved, lastActivity: now }));
          setGreeting(saved.text);
          return;
        }
      }
    } catch { /* ignore corrupted data */ }

    // Generate fresh greeting
    const text = pickGreeting(userName);
    localStorage.setItem(GREETING_KEY, JSON.stringify({ text, day: today, slot, lastActivity: now }));
    setGreeting(text);
  }, [userName]);

  return greeting;
}

export function Nav({ isAuthenticated = false, authConfigured = true, isDemo = false, userName }: { isAuthenticated?: boolean; authConfigured?: boolean; isDemo?: boolean; userName?: string }) {
  const pathname = usePathname();
  const [logoHovered, setLogoHovered] = useState(false);
  const greeting = useGreeting(isAuthenticated ? userName : undefined);

  // On the landing page, show a minimal nav
  const isLanding = pathname === "/";

  return (
    <header className={`sticky top-0 z-50 flex h-14 items-center justify-between px-6 transition-colors duration-300 ${
      isLanding
        ? "border-b border-transparent bg-transparent"
        : "border-b border-border/60 bg-background/80 backdrop-blur-md"
    }`}>
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="text-lg font-semibold text-foreground overflow-hidden whitespace-nowrap"
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        >
          <span className="inline-flex">
            <span>Aurora</span>
            <span
              className="inline-block overflow-hidden transition-all duration-300 ease-in-out"
              style={{ maxWidth: logoHovered ? "14rem" : "0rem", opacity: logoHovered ? 1 : 0 }}
            >
              &nbsp;— interview prep
            </span>
          </span>
        </Link>
        {!isLanding && (
          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors duration-150 ${
                  pathname.startsWith(href)
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isAuthenticated && !isLanding && <GitHubSyncDropdown />}
        {isDemo && !isLanding && <DemoGitHubBadge />}
        {greeting && !isLanding && (
          <span className="hidden sm:inline text-sm text-muted-foreground">{greeting}</span>
        )}
        {isAuthenticated ? (
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150"
            title="Sign out"
          >
            Sign out
          </button>
        ) : authConfigured ? (
          <div className="flex items-center gap-1.5">
            {isDemo && !isLanding && (
              <span className="hidden sm:inline-flex items-center rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                DEMO
              </span>
            )}
            <Link
              href="/auth/signin"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors duration-150 hover:opacity-90"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <Link
            href="/auth/error?error=Configuration"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            title="Auth not configured — click for setup guide"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            Setup needed
          </Link>
        )}
      </div>
    </header>
  );
}

/* ── GitHub Sync Dropdown ── */

function GitHubSyncDropdown() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; repo: string | null } | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [repo, setRepo] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [result, setResult] = useState<{ secret: string; webhookUrl: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/github-sync")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => {
        if (d) setStatus({ connected: d.connected, repo: d.repo });
      })
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!status) return null;

  async function handleConnect() {
    if (!repo.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/github-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repo.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ secret: data.secret, webhookUrl: data.webhookUrl });
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/github-sync", { method: "DELETE" });
      if (res.ok) {
        setStatus({ connected: false, repo: null });
        setConfirming(false);
        setResult(null);
        setShowSetup(false);
        setRepo("");
      }
    } finally {
      setDisconnecting(false);
    }
  }

  function handleSetupDone() {
    setStatus({ connected: true, repo: repo.trim() });
    setResult(null);
    setShowSetup(false);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title={status.connected ? `GitHub sync: ${status.repo}` : "GitHub sync"}
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        {status.connected && (
          <span className="h-2 w-2 rounded-full bg-green-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-border bg-background shadow-lg z-50">
          {status.connected && !showSetup ? (
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium">Sync active</span>
                </div>
                {!confirming ? (
                  <button
                    onClick={() => setConfirming(true)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Disconnect
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{status.repo}</p>
              {confirming && (
                <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/5 p-2.5 space-y-2">
                  <p className="text-xs text-red-400 font-medium">Disconnect GitHub sync?</p>
                  <p className="text-[11px] text-muted-foreground">New submissions won&apos;t be detected automatically. You can reconnect anytime.</p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="inline-flex h-7 items-center rounded-md bg-red-500/20 border border-red-500/40 px-3 text-xs text-red-400 font-medium hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                    >
                      {disconnecting ? "Disconnecting…" : "Yes, disconnect"}
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      className="inline-flex h-7 items-center rounded-md px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Set up GitHub sync</p>
                <button onClick={() => { setOpen(false); setShowSetup(false); }} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-detect when you solve problems on NeetCode via GitHub webhook.
              </p>

              {!result ? (
                <div className="space-y-3">
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p><span className="font-medium text-foreground">1.</span> Go to <a href="https://neetcode.io/profile/github" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">neetcode.io/profile/github</a> and connect your GitHub account</p>
                    <p><span className="font-medium text-foreground">2.</span> Enter your NeetCode submissions repo:</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                      placeholder="owner/repo-name"
                      className="h-7 flex-1 rounded-md border border-border bg-muted px-2 text-xs placeholder:text-muted-foreground focus:outline-none"
                    />
                    <button
                      onClick={handleConnect}
                      disabled={connecting || !repo.trim()}
                      className="inline-flex h-7 items-center rounded-md bg-accent px-2.5 text-xs text-accent-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {connecting ? "..." : "Connect"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-md bg-green-500/10 p-2 text-xs text-green-500 font-medium">
                    Connected! Now configure the webhook in GitHub.
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p><span className="font-medium text-foreground">3.</span> Go to your repo → Settings → Webhooks → Add webhook</p>
                    <div>
                      <p className="text-muted-foreground mb-1">Payload URL:</p>
                      <code className="block rounded bg-muted px-2 py-1 text-[11px] text-foreground select-all break-all">{result.webhookUrl}</code>
                    </div>
                    <p>
                      <span className="font-medium text-foreground">4.</span>{" "}
                      <span className="font-medium text-orange-400">Change Content type</span> to{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-[11px]">application/json</code>{" "}
                      <span className="text-orange-400">(GitHub defaults to form-urlencoded)</span>
                    </p>
                    <div>
                      <p className="text-muted-foreground mb-1"><span className="font-medium text-foreground">5.</span> Secret:</p>
                      <code className="block rounded bg-muted px-2 py-1 text-[11px] text-foreground select-all break-all">{result.secret}</code>
                    </div>
                    <p><span className="font-medium text-foreground">6.</span> Select <span className="font-medium text-foreground">Just the push event</span></p>
                    <p><span className="font-medium text-foreground">7.</span> Keep SSL verification enabled, then <span className="font-medium text-foreground">Add webhook</span></p>
                  </div>
                  <button
                    onClick={handleSetupDone}
                    className="text-xs text-accent hover:underline"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Demo GitHub Badge ── Static "connected" indicator for signed-out demo */

function DemoGitHubBadge() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="GitHub sync: demo-user/neetcode-solutions (demo)"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <span className="h-2 w-2 rounded-full bg-green-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-border bg-background shadow-lg z-50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium">Sync active</span>
            <span className="ml-auto text-xs text-accent border border-accent/30 rounded px-1.5 py-0.5">DEMO</span>
          </div>
          <p className="text-xs text-muted-foreground">demo-user/neetcode-solutions</p>
          <p className="text-xs text-muted-foreground/70">
            GitHub pushes auto-detect solved problems and surface them as pending confirmations.{" "}
            <Link href="/auth/signin" className="text-accent hover:underline">Sign in</Link> to connect your own repo.
          </p>
        </div>
      )}
    </div>
  );
}
