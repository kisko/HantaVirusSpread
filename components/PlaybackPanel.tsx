"use client";

import type { ForecastSnapshot, PlaybackShiftMarker, PlaybackStep } from "@/types";

// Helper to get quarter number (0-3) from date
function getQuarter(dateStr: string): number {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const month = date.getUTCMonth();
  return Math.floor(month / 3);
}

// Quarter colors
const QUARTER_COLORS = [
  "bg-blue-500/15",  // Q1 - blue
  "bg-green-500/15", // Q2 - green
  "bg-yellow-500/15", // Q3 - yellow
  "bg-purple-500/15", // Q4 - purple
];

const QUARTER_BORDERS = [
  "border-blue-500/40",  // Q1
  "border-green-500/40", // Q2
  "border-yellow-500/40", // Q3
  "border-purple-500/40", // Q4
];

interface PlaybackPanelProps {
  steps: PlaybackStep[];
  shiftMarkers: PlaybackShiftMarker[];
  activeIndex: number;
  activeWindowDays: number;
  isPlaying: boolean;
  speedLabel: string;
  latestObservedIndex: number;
  forecast: ForecastSnapshot | null;
  onIndexChange: (index: number) => void;
  onTogglePlay: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  onSpeedDown: () => void;
  onSpeedUp: () => void;
  onJumpToLatest: () => void;
}

export default function PlaybackPanel({
  steps,
  shiftMarkers,
  activeIndex,
  activeWindowDays,
  isPlaying,
  speedLabel,
  latestObservedIndex,
  forecast,
  onIndexChange,
  onTogglePlay,
  onStepBackward,
  onStepForward,
  onJumpToStart,
  onJumpToEnd,
  onSpeedDown,
  onSpeedUp,
  onJumpToLatest,
}: PlaybackPanelProps) {
  if (steps.length === 0) {
    return null;
  }

  const activeStep = steps[Math.min(activeIndex, steps.length - 1)];
  const milestones = [
    steps[0],
    steps[latestObservedIndex],
    steps[latestObservedIndex + 1],
    steps[steps.length - 1],
  ].filter((step, index, all) => step && all.findIndex((candidate) => candidate.index === step.index) === index);
  const maxIndex = Math.max(steps.length - 1, 1);
  const isAtEnd = activeIndex >= steps.length - 1;
  const activeTimelineIndex = Math.min(activeIndex, steps.length - 1);
  const cursorLeftPercent = (activeTimelineIndex / maxIndex) * 100;
  const cursorLabelClass =
    cursorLeftPercent < 8
      ? "translate-x-0"
      : cursorLeftPercent > 92
        ? "-translate-x-full"
        : "-translate-x-1/2";

  return (
    <section className="absolute bottom-0 left-0 right-0 z-40 border-t border-cyan-300/35 bg-slate-950/95 shadow-[0_-12px_36px_rgba(2,6,23,0.68)] backdrop-blur-xl">
      <div className="px-2.5 py-1">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
          <div className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-100">
            <span className={`rounded-full px-2 py-0.5 ${activeStep.mode === "forecast" ? "bg-orange-400/20 text-orange-100" : "bg-cyan-400/20 text-cyan-100"}`}>
              {activeStep.mode === "forecast" ? "Forecast" : "History"}
            </span>
            <span className="ml-2 text-slate-200">
              {activeIndex + 1}/{steps.length}
            </span>
          </div>

          <div className="flex items-center justify-center gap-0.5">
            <IconButton label="Go to start" onClick={onJumpToStart}>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M2 2h2v12H2zM6 8l8 6V2z" />
              </svg>
            </IconButton>
            <IconButton label="Previous step" onClick={onStepBackward}>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M12 2L4 8l8 6z" />
              </svg>
            </IconButton>
            <IconButton
              label={isAtEnd && !isPlaying ? "Replay (K)" : isPlaying ? "Pause (K)" : "Play (K)"}
              onClick={onTogglePlay}
              emphasized
            >
              {isAtEnd && !isPlaying ? (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M8 2a6 6 0 106 6h-2a4 4 0 11-1.17-2.83L9 7h5V2l-1.74 1.74A5.97 5.97 0 008 2z" />
                </svg>
              ) : isPlaying ? (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M4 2h3v12H4zM9 2h3v12H9z" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M4 2l9 6-9 6z" />
                </svg>
              )}
            </IconButton>
            <IconButton label="Next step" onClick={onStepForward}>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M4 2l8 6-8 6z" />
              </svg>
            </IconButton>
            <IconButton label="Go to end" onClick={onJumpToEnd}>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M12 2h2v12h-2zM2 2l8 6-8 6z" />
              </svg>
            </IconButton>
            <IconButton label="Back to latest observed" onClick={onJumpToLatest}>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M8 2a6 6 0 106 6h-2a4 4 0 11-1.17-2.83L9 7h5V2l-1.74 1.74A5.97 5.97 0 008 2z" />
              </svg>
            </IconButton>
          </div>

          <p className="truncate text-right text-[11px] font-semibold text-slate-100">
            {activeStep.date}
            <span className="ml-2 text-[10px] font-medium text-slate-300">K/Space</span>
          </p>
        </div>

        <div className="mt-1">
          <div className="mb-0.5 flex items-center justify-between text-[10px] font-medium text-slate-200">
            <span>Timeline (click to navigate)</span>
            <span>{shiftMarkers.length} markers</span>
          </div>
          <div className="relative pt-2.5">
            <div
              className="pointer-events-none absolute top-0 z-20"
              style={{ left: `${cursorLeftPercent}%` }}
              aria-hidden="true"
            >
              <span
                className={`inline-flex items-center rounded-full border border-cyan-300/55 bg-slate-900/90 px-1.5 py-[1px] text-[9px] font-semibold text-cyan-100 shadow-[0_4px_18px_rgba(8,47,73,0.45)] ${cursorLabelClass}`}
              >
                {activeStep.date}
              </span>
            </div>

            {/* Timeline background with quarterly color bands */}
            <div className="pointer-events-none absolute left-0 right-0 top-4 h-0.5 flex overflow-hidden rounded-full" aria-hidden="true">
              {steps.map((step, idx) => {
                // Group steps by quarter
                const currentQuarter = getQuarter(step.date);
                const nextStep = steps[idx + 1];
                const nextQuarter = nextStep ? getQuarter(nextStep.date) : currentQuarter;
                
                // Only render at quarter boundaries
                if (idx === 0 || currentQuarter !== getQuarter(steps[idx - 1].date)) {
                  const quarterStart = idx;
                  const quarterEnd = steps.findIndex((s, i) => i > idx && getQuarter(s.date) !== currentQuarter);
                  const quarterEndIdx = quarterEnd === -1 ? steps.length - 1 : quarterEnd - 1;
                  
                  const startPercent = (step.index / maxIndex) * 100;
                  const endPercent = (steps[quarterEndIdx].index / maxIndex) * 100;
                  const width = endPercent - startPercent;
                  
                  return (
                    <div
                      key={`q${currentQuarter}-${idx}`}
                      className={`${QUARTER_COLORS[currentQuarter]}`}
                      style={{ width: `${width}%` }}
                      aria-hidden="true"
                    />
                  );
                }
                return null;
              })}
            </div>
            
            {/* History/Forecast color overlay */}
            <div className="pointer-events-none absolute left-0 right-0 top-4 h-0.5" aria-hidden="true">
              <div
                className="absolute left-0 top-0 h-full bg-cyan-400/20"
                style={{
                  width: `${(Math.min(activeIndex, steps.findIndex((s) => s.mode === "forecast") ?? steps.length - 1) / maxIndex) * 100}%`,
                }}
                aria-hidden="true"
              />
            </div>
            
            {/* Shift markers (data points) */}
            <div className="pointer-events-none absolute left-0 right-0 top-0 h-3.5">
              {shiftMarkers.map((marker) => {
                const left = `${(marker.index / maxIndex) * 100}%`;
                const tone =
                  marker.kind === "mixed"
                    ? "bg-fuchsia-300"
                    : marker.kind === "confirmed"
                      ? "bg-cyan-300"
                      : "bg-orange-300";

                return (
                  <span
                    key={marker.index}
                    className="absolute top-0 h-3.5 -translate-x-1/2 group"
                    style={{ left }}
                    role="tooltip"
                    title={marker.label}
                  >
                    <span className={`absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-slate-500`} />
                    <span className={`absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.18)] transition-all group-hover:h-2 group-hover:w-2 ${tone}`} />
                  </span>
                );
              })}
            </div>
            
            {/* Interactive range input */}
            <input
              type="range"
              min={0}
              max={Math.max(steps.length - 1, 0)}
              value={activeTimelineIndex}
              onChange={(event) => onIndexChange(Number(event.target.value))}
              className="w-full cursor-pointer"
              aria-label="Playback timeline"
            />
            
            {/* Timeline tick marks - every second date */}
            <div className="relative w-full h-1.5 -mt-1 pointer-events-none">
              {steps.length > 0 && (
                <>
                  {steps.map((step, idx) => {
                    // Show ticks for every other step, plus first and last
                    if (idx === 0 || idx === steps.length - 1 || idx % 2 === 0) {
                      const left = `${(step.index / maxIndex) * 100}%`;
                      return (
                        <div
                          key={step.index}
                          className="absolute w-px h-1.5 bg-slate-500/60"
                          style={{ left, transform: "translateX(-50%)" }}
                          aria-hidden="true"
                        />
                      );
                    }
                    return null;
                  })}
                </>
              )}
            </div>
            
            {/* Date labels below timeline - more granular for better context */}
            <div className="mt-2 flex items-center justify-between text-[8px] text-slate-400 gap-0.5 overflow-hidden">
              {steps.length > 0 && (
                <>
                  <span title={steps[0].date} className="flex-shrink-0">{steps[0].date.slice(5)}</span>
                  {steps.length > 1 && (
                    <>
                      {steps.length > 30 && (
                        <span title={steps[Math.floor(steps.length * 0.15)].date} className="flex-shrink-0">
                          {steps[Math.floor(steps.length * 0.15)].date.slice(5)}
                        </span>
                      )}
                      {steps.length > 20 && (
                        <span title={steps[Math.floor(steps.length * 0.3)].date} className="flex-shrink-0">
                          {steps[Math.floor(steps.length * 0.3)].date.slice(5)}
                        </span>
                      )}
                      <span title={steps[Math.floor(steps.length * 0.5)].date} className="flex-shrink-0">
                        {steps[Math.floor(steps.length * 0.5)].date.slice(5)}
                      </span>
                      {steps.length > 20 && (
                        <span title={steps[Math.floor(steps.length * 0.7)].date} className="flex-shrink-0">
                          {steps[Math.floor(steps.length * 0.7)].date.slice(5)}
                        </span>
                      )}
                      {steps.length > 30 && (
                        <span title={steps[Math.floor(steps.length * 0.85)].date} className="flex-shrink-0">
                          {steps[Math.floor(steps.length * 0.85)].date.slice(5)}
                        </span>
                      )}
                      <span title={steps[steps.length - 1].date} className="flex-shrink-0">{steps[steps.length - 1].date.slice(5)}</span>
                    </>
                  )}
                </>
              )}
            </div>
            
            {/* Quarter color legend */}
            <div className="mt-1 flex items-center gap-1.5 text-[7px] text-slate-500">
              <span className="h-1.5 w-2 rounded-sm bg-blue-500/15 border border-blue-500/40" title="Q1" aria-label="Quarter 1"></span>
              <span className="h-1.5 w-2 rounded-sm bg-green-500/15 border border-green-500/40" title="Q2" aria-label="Quarter 2"></span>
              <span className="h-1.5 w-2 rounded-sm bg-yellow-500/15 border border-yellow-500/40" title="Q3" aria-label="Quarter 3"></span>
              <span className="h-1.5 w-2 rounded-sm bg-purple-500/15 border border-purple-500/40" title="Q4" aria-label="Quarter 4"></span>
            </div>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-1.5 overflow-hidden text-[10px] whitespace-nowrap">
            <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-slate-200">
              {milestones.map((step) => (
                <button
                  key={step.index}
                  onClick={() => onIndexChange(step.index)}
                  className={`rounded-full px-1.5 py-[1px] transition ${step.index === activeStep.index ? "bg-cyan-400/25 text-cyan-100" : "bg-slate-800/90 text-slate-200 hover:bg-slate-700"}`}
                  aria-label={`Jump to ${step.label}`}
                >
                  {step.mode === "forecast" ? step.label : step.date.slice(5)}
                </button>
              ))}
            </div>

            <div className="flex flex-shrink-0 items-center gap-1">
              <IconButton label="Speed down" onClick={onSpeedDown}>
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M3 7h10v2H3z" />
                </svg>
              </IconButton>
              <span className="w-8 text-center text-[10px] font-semibold text-slate-100">{speedLabel}</span>
              <IconButton label="Speed up" onClick={onSpeedUp}>
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M7 3h2v4h4v2H9v4H7V9H3V7h4z" />
                </svg>
              </IconButton>
            </div>

            <p className="hidden flex-shrink-0 text-[10px] text-slate-100 md:block">
              {activeStep.mode === "forecast"
                ? `Projected ${forecast?.daysAhead ?? activeStep.offsetDays}d ahead`
                : `${activeWindowDays}-day trailing window`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

interface IconButtonProps {
  label: string;
  onClick: () => void;
  emphasized?: boolean;
  children: React.ReactNode;
}

function IconButton({ label, onClick, emphasized = false, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-5.5 w-5.5 items-center justify-center rounded-full border transition ${
        emphasized
          ? "border-cyan-300/70 bg-cyan-400/25 text-cyan-50 hover:bg-cyan-400/35"
          : "border-slate-600/80 bg-slate-900/70 text-slate-100 hover:border-cyan-300/70 hover:text-cyan-100"
      }`}
    >
      {children}
    </button>
  );
}