"use client";

import { useState } from "react";

const STORAGE_KEY = "drills-onboarded";

export function shouldShowTour(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === null; } catch { return false; }
}

interface DrillTourProps {
  muted: boolean;
  onToggleMute: () => void;
  onDismiss: () => void; // called only when user confirms ("Got it" or "don't show again")
  onClose: () => void;   // called when user closes X without confirming — does NOT set flag
}

export function DrillTour({ muted, onToggleMute, onDismiss, onClose }: DrillTourProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  function handleGotIt() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ok */ }
    onDismiss();
  }

  function handleClose() {
    if (dontShowAgain) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ok */ }
      onDismiss();
    } else {
      onClose(); // reappears next visit
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md mx-4 rounded-xl border border-border bg-muted p-6 space-y-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (X) — does not set flag unless checkbox is checked */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-4 text-muted-foreground hover:text-foreground text-lg leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="space-y-1 pr-6">
          <h2 className="text-base font-semibold text-foreground">Syntax Drills</h2>
          <p className="text-xs text-muted-foreground">Build Python muscle memory through spaced repetition.</p>
        </div>

        {/* Level system */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">5 Levels</p>
          <div className="grid grid-cols-5 gap-1 text-center">
            {(["Recognize", "Recall", "Compose", "Implement", "Apply"] as const).map((label, i) => (
              <div key={i} className="rounded-md border border-border bg-card p-1.5">
                <p className="text-[10px] font-bold text-accent">L{i + 1}</p>
                <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            L1 shows multiple-choice options. L2–L4 are free-form. L5 runs your code against test cases.
          </p>
        </div>

        {/* Keyboard shortcuts */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Shortcuts</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span><kbd className="font-mono bg-card border border-border rounded px-1 text-[10px]">Ctrl+Shift+Enter</kbd> — submit</span>
            <span><kbd className="font-mono bg-card border border-border rounded px-1 text-[10px]">Ctrl+.</kbd> — next</span>
            <span><kbd className="font-mono bg-card border border-border rounded px-1 text-[10px]">Tab</kbd> — type-it mode (L1)</span>
            <span><kbd className="font-mono bg-card border border-border rounded px-1 text-[10px]">Ctrl+,</kbd> — previous</span>
          </div>
        </div>

        {/* Session types */}
        <div className="rounded-md border border-border/50 bg-card p-3 space-y-1">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Daily Drill</span> — 8 drills chosen by SRS (due + new).{" "}
            <span className="font-medium text-foreground">Category practice</span> — pick any category to focus on.
          </p>
        </div>

        {/* Sounds toggle */}
        <div className="flex items-center justify-between rounded-md border border-border/50 bg-card px-3 py-2">
          <span className="text-xs text-muted-foreground">Sound effects</span>
          <button
            onClick={onToggleMute}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              muted
                ? "bg-muted-foreground/10 text-muted-foreground"
                : "bg-accent/15 text-accent"
            }`}
          >
            {muted ? "🔇 Off" : "🔊 On"}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 accent-accent"
            />
            <span className="text-[11px] text-muted-foreground">Don&apos;t show again</span>
          </label>
          <button
            onClick={handleGotIt}
            className="inline-flex h-8 items-center rounded-md bg-accent px-5 text-xs font-medium text-accent-foreground hover:opacity-90 transition-colors"
          >
            Got it →
          </button>
        </div>
      </div>
    </div>
  );
}
