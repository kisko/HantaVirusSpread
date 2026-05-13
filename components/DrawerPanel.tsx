"use client";

import { useEffect, useState } from "react";
import type { CountryDetailResponse, DrawerTab } from "@/types";
import TrendCharts from "./TrendCharts";
import SourcesList from "./SourcesList";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface DrawerPanelProps {
  countryCode: string;
  days: number;
  isWatched: boolean;
  onToggleWatch: () => void;
  onClose: () => void;
}

type EventFormState = {
  date: string;
  org: string;
  title: string;
  url: string;
  notes: string;
  kind: "who_context" | "national_context";
};

const TABS: { id: DrawerTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "trend", label: "Trend" },
  { id: "signals", label: "Signals" },
  { id: "events", label: "Events" },
];

export default function DrawerPanel({ countryCode, days, isWatched, onToggleWatch, onClose }: DrawerPanelProps) {
  const [data, setData] = useState<CountryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");

  const [eventForm, setEventForm] = useState<EventFormState>({
    date: new Date().toISOString().slice(0, 10),
    org: "WHO",
    title: "",
    url: "",
    notes: "",
    kind: "who_context",
  });
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/country?code=${encodeURIComponent(countryCode)}&days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d as CountryDetailResponse);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, [countryCode, days]);

  return (
    <aside
      className="absolute right-0 top-0 z-30 flex h-full w-full flex-col overflow-hidden border-l border-cyan-300/20 bg-slate-950/90 shadow-2xl backdrop-blur-xl sm:w-[460px]"
      role="complementary"
      aria-label={`Country details: ${data?.country.countryName ?? countryCode}`}
    >
      <div className="border-b border-cyan-300/20 bg-slate-900/85 px-4 py-2 text-xs font-medium text-amber-100">
        Not medical advice; do not infer local risk from mentions; official counts come from ECDC/national agencies.
      </div>

      <div className="flex flex-shrink-0 items-center justify-between border-b border-cyan-300/20 bg-slate-900/80 px-4 py-3">
        <div>
          <h2 className="font-display text-base font-bold text-cyan-100">
            {data ? data.country.countryName : countryCode}
          </h2>
          {data && (
            <p className="mt-0.5 text-xs text-slate-300">
              Last {days} days · {data.confirmed.reduce((s, r) => s + r.cases, 0)} confirmed cases · {" "}
              {data.signals.length} signals · {data.events.length} events
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleWatch}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              isWatched
                ? "border-cyan-300/55 bg-cyan-400/18 text-cyan-100"
                : "border-slate-600/80 bg-slate-950/70 text-slate-200 hover:border-cyan-300/55 hover:text-cyan-100"
            }`}
          >
            {isWatched ? "Watching" : "Watch country"}
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-slate-700/70"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-shrink-0 border-b border-cyan-300/20 bg-slate-950/90" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 border-b-2 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-cyan-300 text-cyan-100 bg-cyan-300/10"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex h-32 items-center justify-center text-sm text-slate-400">Loading…</div>}

        {error && (
          <div className="m-4 rounded-md border border-red-400/50 bg-red-900/45 p-3 text-sm text-red-100">
            Failed to load data: {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {activeTab === "overview" && (
              <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="p-4 space-y-3">
                <InfoCard title="What you're seeing" color="blue" icon="Data">
                  <p>
                    <span className="font-medium">{data.confirmed.reduce((s, r) => s + r.cases, 0)} confirmed cases</span>{" "}
                    from <span className="font-medium">{data.confirmed.length} official records</span>{" "}
                    in the last {days} days. <ConfidenceBadge type="confirmed" size="xs" />
                  </p>
                  <p className="mt-1 text-sm">
                    {data.signals.length} signal mentions (unverified notices and media reports){" "}
                    <ConfidenceBadge type="signal" size="xs" />
                  </p>
                </InfoCard>

                <InfoCard title="Forecast" color="slate" icon="8W">
                  <p>
                    Baseline model: <span className="font-medium">{data.derived.forecast8w.engineId}</span>
                  </p>
                  <p className="text-sm mt-1">
                    Backtest MAPE: {data.derived.forecast8w.mape == null ? "N/A" : `${data.derived.forecast8w.mape}%`}
                  </p>
                </InfoCard>

                <InfoCard title="Interpretation guardrails" color="orange" icon="Safety">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Signals are mentions, not confirmed case counts.</li>
                    <li>Official counts come from ECDC and national agencies.</li>
                    <li>Country-level visualization only; no precise case geolocation is shown.</li>
                    <li>Not medical advice.</li>
                  </ul>
                </InfoCard>
              </div>
            )}

            {activeTab === "trend" && (
              <div id="panel-trend" role="tabpanel" aria-labelledby="tab-trend">
                <TrendCharts
                  confirmed={data.confirmed}
                  signalsByWeek={data.derived.signalsByWeek}
                  forecastPoints={data.derived.forecast8w.points}
                  forecastMape={data.derived.forecast8w.mape}
                />
              </div>
            )}

            {activeTab === "signals" && (
              <div id="panel-signals" role="tabpanel" aria-labelledby="tab-signals">
                <SourcesList confirmed={data.confirmed} signals={data.signals} />
              </div>
            )}

            {activeTab === "events" && (
              <div id="panel-events" role="tabpanel" aria-labelledby="tab-events" className="p-4 space-y-4">
                <form
                  className="space-y-2 rounded-lg border border-slate-700/70 bg-slate-900/55 p-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setEventError(null);
                    setEventSaving(true);
                    try {
                      const res = await fetch("/api/events", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ countryCode, ...eventForm }),
                      });
                      if (!res.ok) {
                        const body = (await res.json()) as { error?: string };
                        throw new Error(body.error ?? `Request failed: ${res.status}`);
                      }
                      const created = (await res.json()) as CountryDetailResponse["events"][number];
                      setData((prev) => (prev ? { ...prev, events: [created, ...prev.events] } : prev));
                      setEventForm((prev) => ({ ...prev, title: "", url: "", notes: "" }));
                    } catch (err) {
                      setEventError(err instanceof Error ? err.message : "Failed to save event");
                    } finally {
                      setEventSaving(false);
                    }
                  }}
                >
                  <h3 className="font-display text-sm font-semibold text-cyan-100">Add WHO/National Context Event</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="rounded border border-slate-600/80 bg-slate-950/70 px-2 py-1 text-sm text-slate-100"
                      value={eventForm.date}
                      onChange={(e) => setEventForm((s) => ({ ...s, date: e.target.value }))}
                      required
                    />
                    <select
                      className="rounded border border-slate-600/80 bg-slate-950/70 px-2 py-1 text-sm text-slate-100"
                      value={eventForm.kind}
                      onChange={(e) =>
                        setEventForm((s) => ({ ...s, kind: e.target.value as "who_context" | "national_context" }))
                      }
                    >
                      <option value="who_context">WHO context</option>
                      <option value="national_context">National context</option>
                    </select>
                  </div>
                  <input
                    className="w-full rounded border border-slate-600/80 bg-slate-950/70 px-2 py-1 text-sm text-slate-100"
                    placeholder="Organization"
                    value={eventForm.org}
                    onChange={(e) => setEventForm((s) => ({ ...s, org: e.target.value }))}
                    required
                  />
                  <input
                    className="w-full rounded border border-slate-600/80 bg-slate-950/70 px-2 py-1 text-sm text-slate-100"
                    placeholder="Event title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm((s) => ({ ...s, title: e.target.value }))}
                    required
                  />
                  <input
                    className="w-full rounded border border-slate-600/80 bg-slate-950/70 px-2 py-1 text-sm text-slate-100"
                    placeholder="https://... (optional)"
                    value={eventForm.url}
                    onChange={(e) => setEventForm((s) => ({ ...s, url: e.target.value }))}
                  />
                  <textarea
                    className="w-full rounded border border-slate-600/80 bg-slate-950/70 px-2 py-1 text-sm text-slate-100"
                    rows={3}
                    placeholder="Notes (optional)"
                    value={eventForm.notes}
                    onChange={(e) => setEventForm((s) => ({ ...s, notes: e.target.value }))}
                  />
                  {eventError && <p className="text-xs text-red-600">{eventError}</p>}
                  <button
                    type="submit"
                    disabled={eventSaving}
                    className="neon-ring rounded bg-cyan-400/20 px-3 py-1.5 text-sm font-semibold text-cyan-100 disabled:opacity-60"
                  >
                    {eventSaving ? "Saving..." : "Save event"}
                  </button>
                </form>

                <div className="space-y-2">
                  {data.events.length === 0 && (
                    <p className="text-sm italic text-slate-400">No context events for this country yet.</p>
                  )}
                  {data.events.map((event) => (
                    <article key={event.id} className="rounded-lg border border-slate-700/65 bg-slate-900/60 p-3">
                      <div className="text-xs text-slate-400">{event.date} · {event.kind === "who_context" ? "WHO" : "National"}</div>
                      <h4 className="mt-1 text-sm font-semibold text-slate-100">{event.title}</h4>
                      <p className="mt-1 text-xs text-slate-300">{event.org}</p>
                      {event.notes && <p className="mt-1 text-sm text-slate-200">{event.notes}</p>}
                      {event.url && (
                        <a href={event.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-cyan-200 underline">
                          Source
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

interface InfoCardProps {
  title: string;
  color: "blue" | "orange" | "slate";
  icon: string;
  children: React.ReactNode;
}

function InfoCard({ title, color, icon, children }: InfoCardProps) {
  const colors = {
    blue: "border-cyan-400/35 bg-cyan-400/8 text-slate-100",
    orange: "border-orange-400/35 bg-orange-400/10 text-slate-100",
    slate: "border-slate-600/75 bg-slate-900/60 text-slate-100",
  };

  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <h3 className="font-display mb-1.5 text-sm font-semibold text-cyan-100">
        {icon} {title}
      </h3>
      <div className="text-sm leading-relaxed text-slate-200">{children}</div>
    </div>
  );
}
