/**
 * Drill sound system — synthesized via Web Audio API (no static files needed).
 *
 * Sounds are generated procedurally so they work without audio asset setup.
 * If you later want file-based sounds, replace `synthesize*` calls with
 * Audio element pre-loads and set `currentTime = 0` before play.
 *
 * Mute state persisted to localStorage under key "drills-muted".
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browsers require user gesture before audio)
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(
  frequency: number,
  startTime: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = "sine",
) {
  const c = getCtx();
  if (!c) return;
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
  osc.stop(startTime + duration + 0.01);
}

/** Short ascending two-note chime — confident, clean */
function playCorrect() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(523.25, t,       0.15, 0.18); // C5
  tone(659.25, t + 0.08, 0.18, 0.18); // E5
}

/** Single mid neutral tone — curious, not punishing */
function playPartial() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(440, t, 0.18, 0.12); // A4 — warm middle
}

/** Short descending two-note — sympathetic, not harsh */
function playWrong() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(392, t,       0.14, 0.14); // G4
  tone(329.63, t + 0.07, 0.18, 0.12); // E4
}

/** Three ascending notes — celebratory but short */
function playMilestone() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(523.25, t,        0.12, 0.2); // C5
  tone(659.25, t + 0.1,  0.12, 0.2); // E5
  tone(783.99, t + 0.2,  0.22, 0.22); // G5
}

export type SoundName = "correct" | "partial" | "wrong" | "milestone";

export function playSound(name: SoundName, muted: boolean): void {
  if (muted) return;
  switch (name) {
    case "correct":   playCorrect(); break;
    case "partial":   playPartial(); break;
    case "wrong":     playWrong(); break;
    case "milestone": playMilestone(); break;
  }
}

export function getMutedPref(): boolean {
  try { return localStorage.getItem("drills-muted") === "true"; } catch { return false; }
}

export function setMutedPref(muted: boolean): void {
  try { localStorage.setItem("drills-muted", String(muted)); } catch { /* ok */ }
}
