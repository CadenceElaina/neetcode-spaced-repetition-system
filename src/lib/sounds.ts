/**
 * Drill sound system — synthesized via Web Audio API (no static files needed).
 *
 * Key constraint: browsers suspend AudioContext until a user gesture occurs.
 * playSound() is async so it can await ctx.resume() inside the gesture handler
 * before scheduling any oscillators — this is what makes it actually work.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Schedule a single tone on an already-running context. */
function tone(
  c: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = "sine",
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function doCorrect(c: AudioContext) {
  const t = c.currentTime;
  tone(c, 523.25, t,        0.15, 0.18); // C5
  tone(c, 659.25, t + 0.08, 0.18, 0.18); // E5
}

function doPartial(c: AudioContext) {
  const t = c.currentTime;
  tone(c, 440, t, 0.18, 0.12); // A4
}

function doWrong(c: AudioContext) {
  const t = c.currentTime;
  tone(c, 392,    t,        0.14, 0.14); // G4
  tone(c, 329.63, t + 0.07, 0.18, 0.12); // E4
}

function doMilestone(c: AudioContext) {
  const t = c.currentTime;
  tone(c, 523.25, t,       0.12, 0.2);  // C5
  tone(c, 659.25, t + 0.1, 0.12, 0.2);  // E5
  tone(c, 783.99, t + 0.2, 0.22, 0.22); // G5
}

export type SoundName = "correct" | "partial" | "wrong" | "milestone";

/**
 * Play a sound effect. Must be called within (or immediately after) a user
 * gesture so the browser allows AudioContext.resume().
 */
export async function playSound(name: SoundName, muted: boolean): Promise<void> {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  try {
    // Resume MUST complete before scheduling tones — this is the critical fix.
    if (c.state !== "running") await c.resume();
  } catch {
    return; // Browser denied — silent fail
  }
  switch (name) {
    case "correct":   doCorrect(c); break;
    case "partial":   doPartial(c); break;
    case "wrong":     doWrong(c); break;
    case "milestone": doMilestone(c); break;
  }
}

export function getMutedPref(): boolean {
  try { return localStorage.getItem("drills-muted") === "true"; } catch { return false; }
}

export function setMutedPref(muted: boolean): void {
  try { localStorage.setItem("drills-muted", String(muted)); } catch { /* ok */ }
}
