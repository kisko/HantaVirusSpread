"use client";

import { useMemo, useState } from "react";
import type { CountryMeta, WatchlistCountrySummary } from "@/types";
import { useDraggablePanel } from "./useDraggablePanel";

interface WatchlistPanelProps {
  summaries: WatchlistCountrySummary[];
  countries: CountryMeta[];
  watchedCountryCodes: string[];
  onAddCountry: (countryCode: string) => void;
  onRemoveCountry: (countryCode: string) => void;
  onSelectCountry: (countryCode: string) => void;
}

const LEVEL_STYLES: Record<WatchlistCountrySummary["level"], string> = {
  high: "border-rose-300/45 bg-rose-400/12 text-rose-100",
  medium: "border-orange-300/45 bg-orange-400/12 text-orange-100",
  low: "border-cyan-300/45 bg-cyan-400/12 text-cyan-100",
  quiet: "border-slate-500/45 bg-slate-500/12 text-slate-200",
};

export default function WatchlistPanel({
  summaries,
  countries,
  watchedCountryCodes,
  onAddCountry,
  onRemoveCountry,
  onSelectCountry,
}: WatchlistPanelProps) {
  const [countryToAdd, setCountryToAdd] = useState("");
  const { panelStyle, isDragging, handleProps } = useDraggablePanel("hantaspread.panel.watchlist");

  const availableCountries = useMemo(
    () => countries.filter((country) => !watchedCountryCodes.includes(country.countryCode)),
    [countries, watchedCountryCodes]
  );

  return (
    <section
      className="frost-panel-strong absolute bottom-[14rem] right-4 z-50 flex max-h-[min(24rem,calc(100%-16.5rem))] w-[min(360px,calc(100%-32px))] flex-col rounded-2xl p-3"
      style={panelStyle}
      aria-label="Watchlist alerts"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-cyan-100">Watchlist Alerts</h2>
          <p className="mt-1 text-[11px] text-slate-300">Track countries and surface fast changes in confirmed cases or signal volume.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-cyan-300/40 bg-cyan-400/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
            {summaries.length} watched
          </span>
          <button
            type="button"
            aria-label="Move watchlist panel"
            title="Drag to move watchlist panel"
            className={`flex h-6 w-6 touch-none select-none items-center justify-center rounded-full border border-cyan-300/35 text-cyan-100 transition ${
              isDragging ? "cursor-grabbing bg-cyan-400/28" : "cursor-grab bg-cyan-400/14 hover:bg-cyan-400/24"
            }`}
            {...handleProps}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <circle cx="4" cy="4" r="1.1" />
              <circle cx="8" cy="4" r="1.1" />
              <circle cx="12" cy="4" r="1.1" />
              <circle cx="4" cy="8" r="1.1" />
              <circle cx="8" cy="8" r="1.1" />
              <circle cx="12" cy="8" r="1.1" />
              <circle cx="4" cy="12" r="1.1" />
              <circle cx="8" cy="12" r="1.1" />
              <circle cx="12" cy="12" r="1.1" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <select
          value={countryToAdd}
          onChange={(event) => setCountryToAdd(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-600/80 bg-slate-950/80 px-2 py-2 text-xs text-slate-100"
          aria-label="Add country to watchlist"
        >
          <option value="">Add country to watchlist</option>
          {availableCountries.map((country) => (
            <option key={country.countryCode} value={country.countryCode}>
              {country.countryName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (!countryToAdd) return;
            onAddCountry(countryToAdd);
            setCountryToAdd("");
          }}
          className="neon-ring rounded-lg bg-cyan-400/20 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/28"
        >
          Add
        </button>
      </div>

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
        {summaries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-600/70 bg-slate-900/45 p-3 text-xs text-slate-300">
            No countries watched yet. Search for a country or add one here to start receiving alert summaries.
          </div>
        ) : (
          summaries.map((summary) => (
            <article key={summary.countryCode} className="rounded-xl border border-slate-700/70 bg-slate-900/55 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectCountry(summary.countryCode)}
                    className="text-left font-display text-sm font-semibold text-slate-100 hover:text-cyan-100"
                  >
                    {summary.countryName}
                  </button>
                  <div className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${LEVEL_STYLES[summary.level]}`}>
                    {summary.level}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCountry(summary.countryCode)}
                  className="rounded-full border border-slate-600/70 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:border-rose-300/60 hover:text-rose-100"
                >
                  Remove
                </button>
              </div>

              <ul className="mt-2 space-y-1 text-xs text-slate-200">
                {summary.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="rounded-lg border border-cyan-300/18 bg-cyan-400/8 p-2">
                  <div className="uppercase tracking-[0.12em] text-slate-400">Cases</div>
                  <div className="mt-1 font-semibold text-cyan-100">{summary.last7Confirmed} last 7d</div>
                  <div className="text-slate-400">{summary.prev7Confirmed} previous 7d</div>
                </div>
                <div className="rounded-lg border border-orange-300/18 bg-orange-400/8 p-2">
                  <div className="uppercase tracking-[0.12em] text-slate-400">Signals</div>
                  <div className="mt-1 font-semibold text-orange-100">{summary.last7Signals} last 7d</div>
                  <div className="text-slate-400">{summary.prev7Signals} previous 7d</div>
                </div>
              </div>

              <p className="mt-2 text-[10px] text-slate-400">
                Latest activity: {summary.latestActivityDate ?? "No recent activity"}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}