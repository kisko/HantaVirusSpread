"use client";

import { useState } from "react";
import type { DaysFilter, MapFilter, PanelVisibility } from "@/types";

interface TopBarProps {
  filter: MapFilter;
  onFilterChange: (f: Partial<MapFilter>) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  countryNames: string[];
  onCountrySelect: (code: string) => void;
  countryNameToCode: Record<string, string>;
  panelVisibility: PanelVisibility;
  onPanelVisibilityChange: (panel: keyof PanelVisibility, visible: boolean) => void;
}

const DAY_OPTIONS: DaysFilter[] = [7, 30, 365];

export default function TopBar({
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  countryNames,
  onCountrySelect,
  countryNameToCode,
  panelVisibility,
  onPanelVisibilityChange,
}: TopBarProps) {
  const filtered =
    searchQuery.trim().length > 0
      ? countryNames.filter((n) =>
          n.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [];

  return (
    <header
      className="absolute top-0 left-0 right-0 z-20 border-b border-cyan-300/20 bg-slate-950/62 shadow-[0_14px_34px_rgba(2,6,23,0.5)] backdrop-blur-xl"
      role="banner"
    >
      <div className="flex items-center gap-3 px-4 py-2 flex-wrap">
        {/* Brand */}
        <div className="flex items-center gap-2 mr-2">
          <span
            className="font-display text-lg font-bold tracking-[0.02em] text-cyan-200"
            aria-label="HantaSpread"
          >
            HantaSpread
          </span>
          <span className="hidden h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.95)] sm:block" aria-hidden="true" />
          <span className="text-xs font-normal text-slate-400 hidden sm:block">
            Hantavirus Activity Tracker
          </span>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <label htmlFor="country-search" className="sr-only">
            Search country
          </label>
          <input
            id="country-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search country…"
            className="w-full rounded-lg border border-slate-600/60 bg-slate-900/80 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
            aria-autocomplete="list"
            aria-controls="country-search-results"
          />
          {filtered.length > 0 && (
            <ul
              id="country-search-results"
              role="listbox"
              className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-slate-600/60 bg-slate-950/95 shadow-xl text-sm"
            >
              {filtered.map((name) => (
                <li
                  key={name}
                  role="option"
                  aria-selected="false"
                  className="cursor-pointer px-3 py-2 text-slate-200 hover:bg-cyan-400/10"
                  onClick={() => {
                    const code = countryNameToCode[name];
                    if (code) {
                      onCountrySelect(code);
                      onSearchChange("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const code = countryNameToCode[name];
                      if (code) {
                        onCountrySelect(code);
                        onSearchChange("");
                      }
                    }
                  }}
                  tabIndex={0}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Days filter */}
        <fieldset className="flex items-center gap-1" aria-label="Time window">
          <legend className="sr-only">Days filter</legend>
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => onFilterChange({ days: d })}
              aria-pressed={filter.days === d}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filter.days === d
                  ? "bg-cyan-400/20 text-cyan-200 border-cyan-300/60"
                  : "bg-slate-900/85 text-slate-300 border-slate-600/80 hover:border-cyan-300/50"
              }`}
            >
              {d === 365 ? "1 yr" : `${d}d`}
            </button>
          ))}
        </fieldset>

        {/* Layer toggles */}
        <div className="flex items-center gap-2" role="group" aria-label="Map layers">
          <ToggleChip
            id="toggle-confirmed"
            label="Confirmed"
            checked={filter.showConfirmed}
            onChange={(v) => onFilterChange({ showConfirmed: v })}
            color="bg-blue-600"
          />
          <ToggleChip
            id="toggle-signals"
            label="Signals"
            checked={filter.showSignals}
            onChange={(v) => onFilterChange({ showSignals: v })}
            color="bg-orange-500"
          />
        </div>

        {/* Norway lens */}
        <ToggleChip
          id="toggle-norway"
          label="Norway lens"
          checked={filter.norwayLens}
          onChange={(v) => onFilterChange({ norwayLens: v })}
          color="bg-emerald-600"
        />

        {/* Panel visibility menu */}
        <PanelVisibilityMenu panelVisibility={panelVisibility} onPanelVisibilityChange={onPanelVisibilityChange} />

        {/* Nav links */}
        <nav className="ml-auto flex gap-2 text-xs" aria-label="Site navigation">
          <a
            href="/methodology"
            className="rounded-full border border-slate-600/80 bg-slate-900/75 px-2.5 py-1 text-slate-300 hover:border-cyan-300/60 hover:text-cyan-200"
          >
            Methodology
          </a>
          <a
            href="/about"
            className="rounded-full border border-slate-600/80 bg-slate-900/75 px-2.5 py-1 text-slate-300 hover:border-cyan-300/60 hover:text-cyan-200"
          >
            About
          </a>
        </nav>
      </div>
    </header>
  );
}

interface ToggleChipProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
}

interface PanelVisibilityMenuProps {
  panelVisibility: PanelVisibility;
  onPanelVisibilityChange: (panel: keyof PanelVisibility, visible: boolean) => void;
}

function PanelVisibilityMenu({ panelVisibility, onPanelVisibilityChange }: PanelVisibilityMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const panels: { key: keyof PanelVisibility; label: string }[] = [
    { key: "overview", label: "Overview Panel" },
    { key: "legend", label: "Legend" },
    { key: "watchlist", label: "Watchlist" },
    { key: "norwayRisk", label: "Norway Risk" },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-[999999] rounded-full border border-slate-600/80 bg-slate-900/75 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-cyan-300/60 hover:text-cyan-200 transition-colors flex items-center gap-1.5"
        aria-label="Panel visibility"
        aria-expanded={isOpen}
        title="Show/hide panels"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <path d="M8 2a1 1 0 100 2 1 1 0 000-2zm0 5a1 1 0 100 2 1 1 0 000-2zm0 5a1 1 0 100 2 1 1 0 000-2z" />
        </svg>
        Panels
      </button>
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-[999999] rounded-lg border border-slate-600/60 bg-slate-950/95 shadow-xl p-2 min-w-[180px]">
          {panels.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md hover:bg-cyan-400/10 text-xs text-slate-200 transition-colors"
            >
              <input
                type="checkbox"
                checked={panelVisibility[key]}
                onChange={(e) => onPanelVisibilityChange(key, e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleChip({ id, label, checked, onChange, color }: ToggleChipProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-1.5 cursor-pointer select-none px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
        checked
          ? `${color} text-white border-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.2)]`
          : "bg-slate-900/85 text-slate-300 border-slate-600/80 hover:border-slate-400"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
        aria-checked={checked}
      />
      {label}
    </label>
  );
}
