"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ConfirmedCaseRecord, ForecastPoint, WeeklySignalBucket } from "@/types";

interface TrendChartsProps {
  confirmed: ConfirmedCaseRecord[];
  signalsByWeek: WeeklySignalBucket[];
  forecastPoints?: ForecastPoint[];
  forecastMape?: number | null;
}

function formatDate(d: string): string {
  const dt = new Date(`${d}T00:00:00.000Z`);
  return dt.toLocaleDateString("en-GB", { month: "short", year: "2-digit", day: "2-digit" });
}

export default function TrendCharts({ confirmed, signalsByWeek, forecastPoints = [], forecastMape = null }: TrendChartsProps) {
  const confirmedData = [...confirmed]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, observed: r.cases, deaths: r.deaths ?? 0, lower: null as number | null, band: null as number | null, forecast: null as number | null }));

  const forecastData = forecastPoints.map((p) => ({
    date: p.date,
    observed: null as number | null,
    deaths: null as number | null,
    forecast: p.predictedCases,
    lower: p.lower80,
    band: Math.max(0, p.upper80 - p.lower80),
  }));

  const trendData = [...confirmedData, ...forecastData].map((row) => ({ ...row, label: formatDate(row.date) }));

  const signalData = signalsByWeek.map((b) => ({
    week: formatDate(b.weekStart),
    signals: b.count,
  }));

  return (
    <div className="space-y-6 p-4">
      <section aria-labelledby="confirmed-chart-heading">
        <div className="flex items-center gap-2 mb-2">
          <h3 id="confirmed-chart-heading" className="font-display text-sm font-semibold text-cyan-100">
            Confirmed Cases and 8-Week Baseline Forecast
          </h3>
          <span className="rounded border border-cyan-400/45 bg-cyan-400/18 px-1.5 py-0.5 text-xs font-medium text-cyan-100">
            CONFIRMED + FORECAST
          </span>
        </div>

        {trendData.length === 0 ? (
          <p className="text-sm italic text-slate-400">No confirmed records in this time window.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={trendData} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={18} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />

              <Area dataKey="lower" stackId="forecast-band" stroke="none" fill="transparent" name="Forecast lower 80%" />
              <Area dataKey="band" stackId="forecast-band" stroke="none" fill="#93c5fd" fillOpacity={0.35} name="Forecast interval 80%" />

              <Line
                type="monotone"
                dataKey="observed"
                stroke="#1d4ed8"
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
                name="Observed confirmed"
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#0f766e"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 2 }}
                connectNulls
                name="Baseline forecast"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        <p className="mt-1 text-xs text-slate-300">
          Baseline model uses seasonal naive weekly projection. Backtest MAPE: {forecastMape == null ? "N/A" : `${forecastMape}%`}.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Source: official surveillance data only. Signals are displayed separately and not mixed into confirmed counts.
        </p>
      </section>

      <section aria-labelledby="signals-chart-heading">
        <div className="flex items-center gap-2 mb-2">
          <h3 id="signals-chart-heading" className="font-display text-sm font-semibold text-orange-100">
            Signal Mentions by Week
          </h3>
          <span className="rounded border border-orange-400/45 bg-orange-400/18 px-1.5 py-0.5 text-xs font-medium text-orange-100">
            SIGNALS
          </span>
        </div>

        {signalData.length === 0 ? (
          <p className="text-sm italic text-slate-400">No signals in this time window.</p>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={signalData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="signals" fill="#f97316" name="Signal Mentions" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        <p className="mt-1 text-xs font-medium text-orange-200">
          Signals are mentions and may be incomplete, duplicated, or inaccurate. Do not infer local risk from mentions.
        </p>
      </section>
    </div>
  );
}
