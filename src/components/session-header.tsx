"use client";

interface SessionHeaderProps {
  current: number;         // 0-based index of current drill
  total: number;           // total drills in session
  combo: number;           // consecutive correct streak
  autoContinue: boolean;
  muted: boolean;
  onToggleAutoContinue: () => void;
  onToggleMute: () => void;
  onExit: () => void;
  categoryLabel?: string;
}

export function SessionHeader({
  current,
  total,
  combo,
  autoContinue,
  muted,
  onToggleAutoContinue,
  onToggleMute,
  onExit,
  categoryLabel,
}: SessionHeaderProps) {
  return (
    <div className="flex items-center justify-between shrink-0 py-1">
      {/* Left: label + dot pips */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-foreground">
          {categoryLabel ? `${categoryLabel} Practice` : "Daily Drill"}
        </span>

        {/* Dot pips */}
        <div className="flex items-center gap-1" aria-label={`Drill ${current + 1} of ${total}`}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`inline-block rounded-full transition-colors duration-200 ${
                i < current
                  ? "w-2 h-2 bg-accent/60"          // completed
                  : i === current
                  ? "w-2 h-2 bg-accent"              // current
                  : "w-2 h-2 bg-border"              // upcoming
              }`}
            />
          ))}
        </div>

        {/* Combo badge — only after ≥4 consecutive correct */}
        {combo >= 4 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
            🔥 {combo} in a row
          </span>
        )}
      </div>

      {/* Right: auto-continue toggle + mute + exit */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleAutoContinue}
          title={autoContinue ? "Auto-continue on" : "Auto-continue off"}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
            autoContinue
              ? "bg-accent/20 text-accent"
              : "bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
          }`}
        >
          auto {autoContinue ? "▶" : "▷"}
        </button>

        <button
          onClick={onToggleMute}
          title={muted ? "Unmute sounds" : "Mute sounds"}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {muted ? "🔇" : "🔊"}
        </button>

        <button
          onClick={onExit}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Exit
        </button>
      </div>
    </div>
  );
}
