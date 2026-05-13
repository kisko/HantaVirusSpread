"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { MapFilter, ConfirmedCaseRecord, SignalRecord, CountryMeta, DashboardOverview } from "@/types";
import TopBar from "@/components/TopBar";
import Legend from "@/components/Legend";
import Footer from "@/components/Footer";
import DrawerPanel from "@/components/DrawerPanel";
import NorwayRiskCard from "@/components/NorwayRiskCard";
import PlaybackPanel from "@/components/PlaybackPanel";
import WatchlistPanel from "@/components/WatchlistPanel";
import { buildPlaybackShiftMarkers, buildPlaybackSteps, getDisplayDataForPlayback, getLatestObservedDate, HISTORY_PLAYBACK_DAYS } from "@/lib/playback";
import { buildWatchlistSummaries } from "@/lib/watchlist";

// Client-only map import (avoids SSR window errors)
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2];
const WATCHLIST_STORAGE_KEY = "hantaspread.watchlist";

const DEFAULT_FILTER: MapFilter = {
  days: 30,
  showConfirmed: true,
  showSignals: true,
  norwayLens: false,
};

export default function HomePage() {
  const [filter, setFilter] = useState<MapFilter>(DEFAULT_FILTER);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState(HISTORY_PLAYBACK_DAYS - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeedIndex, setPlaybackSpeedIndex] = useState(1);

  const [confirmed, setConfirmed] = useState<ConfirmedCaseRecord[]>([]);
  const [signals, setSignals] = useState<SignalRecord[]>([]);
  const [countries, setCountries] = useState<CountryMeta[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [watchedCountryCodes, setWatchedCountryCodes] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setWatchedCountryCodes(parsed.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      setWatchedCountryCodes([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchedCountryCodes));
  }, [watchedCountryCodes]);

  // Load country list once on mount
  useEffect(() => {
    fetch("/api/countries")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((cs) => setCountries(cs as CountryMeta[]))
      .catch(() => {
        // Fallback to static list if API fails
        loadAllCountries().then((cs) => setCountries(cs));
      });
  }, []);

  // Fetch the full last-year record set once; playback derives the visible window client-side.
  useEffect(() => {
    setLoadError(null);

    Promise.all([
      fetch("/api/confirmed?days=365").then((r) =>
        r.ok ? r.json() : Promise.reject(r.statusText)
      ),
      fetch("/api/signals?days=365").then((r) =>
        r.ok ? r.json() : Promise.reject(r.statusText)
      ),
    ])
      .then(([c, s]) => {
        setConfirmed(c as ConfirmedCaseRecord[]);
        setSignals(s as SignalRecord[]);
      })
      .catch((e) => setLoadError(String(e)));

    fetch("/api/overview")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d) => setOverview(d as DashboardOverview))
      .catch(() => setOverview(null));
  }, []);

  const latestObservedDate = useMemo(
    () => getLatestObservedDate(confirmed, signals),
    [confirmed, signals]
  );

  const playbackSteps = useMemo(
    () => buildPlaybackSteps(latestObservedDate),
    [latestObservedDate]
  );

  const playbackShiftMarkers = useMemo(
    () => buildPlaybackShiftMarkers(confirmed, signals, latestObservedDate),
    [confirmed, signals, latestObservedDate]
  );

  useEffect(() => {
    setPlaybackIndex(Math.min(HISTORY_PLAYBACK_DAYS - 1, Math.max(playbackSteps.length - 1, 0)));
    setIsPlaying(false);
  }, [latestObservedDate, playbackSteps.length]);

  const activeStep = playbackSteps[playbackIndex] ?? playbackSteps[playbackSteps.length - 1] ?? {
    index: 0,
    date: latestObservedDate,
    mode: "history" as const,
    offsetDays: 0,
    label: latestObservedDate,
  };

  const displayData = useMemo(
    () =>
      getDisplayDataForPlayback(
        confirmed,
        signals,
        countries,
        activeStep.date,
        latestObservedDate,
        filter.days
      ),
    [activeStep.date, confirmed, countries, filter.days, latestObservedDate, signals]
  );

  const watchlistSummaries = useMemo(
    () => buildWatchlistSummaries(watchedCountryCodes, countries, confirmed, signals, latestObservedDate),
    [watchedCountryCodes, countries, confirmed, signals, latestObservedDate]
  );

  useEffect(() => {
    if (!isPlaying || playbackSteps.length === 0) return;
    if (playbackIndex >= playbackSteps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const baseDelay = activeStep.mode === "history" ? 220 : 900;
    const speed = PLAYBACK_SPEEDS[playbackSpeedIndex] ?? 1;
    const delay = Math.max(120, Math.round(baseDelay / speed));
    const timer = window.setTimeout(() => {
      setPlaybackIndex((current) => Math.min(current + 1, playbackSteps.length - 1));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [activeStep.mode, isPlaying, playbackIndex, playbackSpeedIndex, playbackSteps.length]);

  const updateFilter = useCallback((partial: Partial<MapFilter>) => {
    setFilter((prev) => ({ ...prev, ...partial }));
  }, []);

  const addWatchedCountry = useCallback((countryCode: string) => {
    setWatchedCountryCodes((current) => (current.includes(countryCode) ? current : [...current, countryCode]));
  }, []);

  const removeWatchedCountry = useCallback((countryCode: string) => {
    setWatchedCountryCodes((current) => current.filter((code) => code !== countryCode));
  }, []);

  const toggleWatchedCountry = useCallback((countryCode: string) => {
    setWatchedCountryCodes((current) =>
      current.includes(countryCode) ? current.filter((code) => code !== countryCode) : [...current, countryCode]
    );
  }, []);

  const countryNameToCode = countries.reduce<Record<string, string>>((acc, c) => {
    acc[c.countryName] = c.countryCode;
    return acc;
  }, {});

  const countryNames = countries.map((c) => c.countryName).sort();

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden">
      <TopBar
        filter={filter}
        onFilterChange={updateFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        countryNames={countryNames}
        onCountrySelect={(code) => {
          setSelectedCountry(code);
          setSearchQuery("");
        }}
        countryNameToCode={countryNameToCode}
      />

      {/* Map area */}
      <main className="relative mb-[36px] mt-[56px] flex-1" aria-label="Map area">
        <div aria-hidden="true" className="pointer-events-none absolute left-[-180px] top-[-150px] z-0 h-80 w-80 rounded-full bg-cyan-400/18 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-[-180px] right-[-80px] z-0 h-96 w-96 rounded-full bg-orange-400/16 blur-3xl" />

        <div className="frost-panel animate-rise-in absolute left-4 right-4 top-4 z-30 rounded-xl px-3 py-2 text-xs font-medium text-amber-100 sm:right-auto sm:w-[500px]">
          Not medical advice; do not infer local risk from mentions; official counts come from ECDC/national agencies.
        </div>

        <section className="frost-panel-strong animate-rise-in absolute left-4 top-20 z-30 hidden w-[340px] rounded-2xl p-3 lg:block">
          <h2 className="font-display text-sm font-semibold text-cyan-100">HantaSpread Global Overview</h2>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-cyan-300/20 bg-slate-900/60 p-2">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Latest Cases</div>
              <div className="font-display text-lg font-bold text-cyan-100">{overview?.latestCases ?? "-"}</div>
            </div>
            <div className="rounded-xl border border-cyan-300/20 bg-slate-900/60 p-2">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">4W Trend</div>
              <div className="font-display text-lg font-bold text-cyan-100">
                {overview?.trend4wPct == null ? "N/A" : `${overview.trend4wPct}%`}
              </div>
            </div>
            <div className="rounded-xl border border-cyan-300/20 bg-slate-900/60 p-2">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">YoY</div>
              <div className="font-display text-lg font-bold text-cyan-100">
                {overview?.yoyPct == null ? "N/A" : `${overview.yoyPct}%`}
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-300">
            Signals and mentions are contextual only and never treated as official case counts.
          </p>
        </section>

        {loadError && (
          <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-lg border border-red-400/60 bg-red-900/70 px-4 py-2 text-sm text-red-100">
            {loadError}
          </div>
        )}

        <MapView
          confirmedRecords={displayData.confirmed}
          signalRecords={displayData.signals}
          countries={countries}
          filter={filter}
          onCountryClick={(code) => {
            setSelectedCountry(code);
          }}
          selectedCountryCode={selectedCountry}
        />

        <PlaybackPanel
          steps={playbackSteps}
          shiftMarkers={playbackShiftMarkers}
          activeIndex={playbackIndex}
          activeWindowDays={filter.days}
          isPlaying={isPlaying}
          speedLabel={`${PLAYBACK_SPEEDS[playbackSpeedIndex] ?? 1}x`}
          latestObservedIndex={Math.min(HISTORY_PLAYBACK_DAYS - 1, Math.max(playbackSteps.length - 1, 0))}
          forecast={displayData.forecast}
          onIndexChange={setPlaybackIndex}
          onTogglePlay={() => {
            if (playbackIndex >= playbackSteps.length - 1) {
              setPlaybackIndex(0);
            }
            setIsPlaying((current) => !current);
          }}
          onStepBackward={() => {
            setIsPlaying(false);
            setPlaybackIndex((current) => Math.max(current - 1, 0));
          }}
          onStepForward={() => {
            setIsPlaying(false);
            setPlaybackIndex((current) => Math.min(current + 1, Math.max(playbackSteps.length - 1, 0)));
          }}
          onJumpToStart={() => {
            setIsPlaying(false);
            setPlaybackIndex(0);
          }}
          onJumpToEnd={() => {
            setIsPlaying(false);
            setPlaybackIndex(Math.max(playbackSteps.length - 1, 0));
          }}
          onSpeedDown={() => {
            setPlaybackSpeedIndex((current) => Math.max(current - 1, 0));
          }}
          onSpeedUp={() => {
            setPlaybackSpeedIndex((current) => Math.min(current + 1, PLAYBACK_SPEEDS.length - 1));
          }}
          onJumpToLatest={() => {
            setPlaybackIndex(Math.min(HISTORY_PLAYBACK_DAYS - 1, Math.max(playbackSteps.length - 1, 0)));
            setIsPlaying(false);
          }}
        />

        <Legend />

        <WatchlistPanel
          summaries={watchlistSummaries}
          countries={countries}
          watchedCountryCodes={watchedCountryCodes}
          onAddCountry={(code) => {
            addWatchedCountry(code);
            setSelectedCountry(code);
          }}
          onRemoveCountry={removeWatchedCountry}
          onSelectCountry={(code) => setSelectedCountry(code)}
        />

        {filter.norwayLens && activeStep.mode === "history" && <NorwayRiskCard days={filter.days} />}

        {selectedCountry && (
          <DrawerPanel
            countryCode={selectedCountry}
            days={filter.days}
            isWatched={watchedCountryCodes.includes(selectedCountry)}
            onToggleWatch={() => toggleWatchedCountry(selectedCountry)}
            onClose={() => setSelectedCountry(null)}
          />
        )}
      </main>

      <Footer className="absolute bottom-0 left-0 right-0 h-[32px]" />
    </div>
  );
}

// Client-side helper to get all countries from the confirmed + signals data
async function loadAllCountries(): Promise<CountryMeta[]> {
  // This is a client-side workaround; in production, expose a /api/countries endpoint.
  // For now, use a hardcoded centroid list matching countries.json.
  const STATIC_COUNTRIES: CountryMeta[] = [
    { countryCode: "NO", countryName: "Norway", centroid: { lat: 64.5731, lon: 17.8886 } },
    { countryCode: "SE", countryName: "Sweden", centroid: { lat: 60.1282, lon: 18.6435 } },
    { countryCode: "FI", countryName: "Finland", centroid: { lat: 64.9631, lon: 25.7671 } },
    { countryCode: "DE", countryName: "Germany", centroid: { lat: 51.1657, lon: 10.4515 } },
    { countryCode: "FR", countryName: "France", centroid: { lat: 46.2276, lon: 2.2137 } },
    { countryCode: "PL", countryName: "Poland", centroid: { lat: 51.9194, lon: 19.1451 } },
    { countryCode: "CZ", countryName: "Czech Republic", centroid: { lat: 49.8175, lon: 15.473 } },
    { countryCode: "SK", countryName: "Slovakia", centroid: { lat: 48.669, lon: 19.699 } },
    { countryCode: "AT", countryName: "Austria", centroid: { lat: 47.5162, lon: 14.5501 } },
    { countryCode: "RU", countryName: "Russia", centroid: { lat: 61.524, lon: 105.3188 } },
    { countryCode: "BY", countryName: "Belarus", centroid: { lat: 53.7098, lon: 27.9534 } },
    { countryCode: "UA", countryName: "Ukraine", centroid: { lat: 48.3794, lon: 31.1656 } },
    { countryCode: "HU", countryName: "Hungary", centroid: { lat: 47.1625, lon: 19.5033 } },
    { countryCode: "RO", countryName: "Romania", centroid: { lat: 45.9432, lon: 24.9668 } },
    { countryCode: "HR", countryName: "Croatia", centroid: { lat: 45.1, lon: 15.2 } },
    { countryCode: "SI", countryName: "Slovenia", centroid: { lat: 46.1512, lon: 14.9955 } },
    { countryCode: "BA", countryName: "Bosnia and Herzegovina", centroid: { lat: 43.9159, lon: 17.6791 } },
    { countryCode: "RS", countryName: "Serbia", centroid: { lat: 44.0165, lon: 21.0059 } },
    { countryCode: "BG", countryName: "Bulgaria", centroid: { lat: 42.7339, lon: 25.4858 } },
    { countryCode: "GR", countryName: "Greece", centroid: { lat: 39.0742, lon: 21.8243 } },
    { countryCode: "LT", countryName: "Lithuania", centroid: { lat: 55.1694, lon: 23.8813 } },
    { countryCode: "LV", countryName: "Latvia", centroid: { lat: 56.8796, lon: 24.6032 } },
    { countryCode: "EE", countryName: "Estonia", centroid: { lat: 58.5953, lon: 25.0136 } },
    { countryCode: "DK", countryName: "Denmark", centroid: { lat: 56.2639, lon: 9.5018 } },
    { countryCode: "NL", countryName: "Netherlands", centroid: { lat: 52.1326, lon: 5.2913 } },
    { countryCode: "BE", countryName: "Belgium", centroid: { lat: 50.5039, lon: 4.4699 } },
    { countryCode: "CH", countryName: "Switzerland", centroid: { lat: 46.8182, lon: 8.2275 } },
    { countryCode: "US", countryName: "United States", centroid: { lat: 37.0902, lon: -95.7129 } },
    { countryCode: "AR", countryName: "Argentina", centroid: { lat: -38.4161, lon: -63.6167 } },
    { countryCode: "CL", countryName: "Chile", centroid: { lat: -35.6751, lon: -71.543 } },
  ];
  return STATIC_COUNTRIES;
}
