import type { ConfirmedCaseRecord, ForecastPoint } from "@/types";

export interface ForecastResult {
  engineId: string;
  mape: number | null;
  points: ForecastPoint[];
}

export interface ForecastEngine {
  id: string;
  forecastWeekly(series: Array<{ weekStart: string; cases: number }>, horizonWeeks: number): ForecastResult;
}

function toMondayIso(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function aggregateWeeklyCases(records: ConfirmedCaseRecord[]): Array<{ weekStart: string; cases: number }> {
  const map = new Map<string, number>();
  for (const row of records) {
    const weekStart = toMondayIso(row.date);
    map.set(weekStart, (map.get(weekStart) ?? 0) + row.cases);
  }

  return [...map.entries()]
    .map(([weekStart, cases]) => ({ weekStart, cases }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function computeMape(actual: number[], predicted: number[]): number | null {
  if (actual.length === 0 || predicted.length === 0 || actual.length !== predicted.length) return null;
  const terms = actual
    .map((value, idx) => {
      if (value <= 0) return null;
      return Math.abs((value - predicted[idx]) / value);
    })
    .filter((v): v is number => v !== null);

  if (terms.length === 0) return null;
  return Number(((terms.reduce((a, b) => a + b, 0) / terms.length) * 100).toFixed(2));
}

export const seasonalNaiveEngine: ForecastEngine = {
  id: "seasonal-naive-v1",
  forecastWeekly(series, horizonWeeks) {
    if (series.length === 0) {
      return { engineId: this.id, mape: null, points: [] };
    }

    const fallback = series.at(-1)?.cases ?? 0;
    const lookup = new Map(series.map((point) => [point.weekStart, point.cases]));

    const points: ForecastPoint[] = [];
    const lastWeek = series.at(-1)?.weekStart ?? addDays(new Date().toISOString().slice(0, 10), -7);

    for (let i = 1; i <= horizonWeeks; i += 1) {
      const target = addDays(lastWeek, i * 7);
      const seasonalRef = addDays(target, -52 * 7);
      const predicted = lookup.get(seasonalRef) ?? fallback;
      const intervalHalfWidth = Math.max(2, Math.round(predicted * 0.25));

      points.push({
        date: target,
        predictedCases: Math.max(0, Math.round(predicted)),
        lower80: Math.max(0, Math.round(predicted - intervalHalfWidth)),
        upper80: Math.max(0, Math.round(predicted + intervalHalfWidth)),
      });
    }

    const backtestHorizon = Math.min(8, Math.max(0, series.length - 1));
    const actual: number[] = [];
    const predicted: number[] = [];
    for (let i = series.length - backtestHorizon; i < series.length; i += 1) {
      const targetWeek = series[i]?.weekStart;
      if (!targetWeek) continue;
      const seasonalRef = addDays(targetWeek, -52 * 7);
      const pred = lookup.get(seasonalRef) ?? series[i - 1]?.cases ?? fallback;
      actual.push(series[i].cases);
      predicted.push(pred);
    }

    return {
      engineId: this.id,
      mape: computeMape(actual, predicted),
      points,
    };
  },
};

export function forecastCountrySeries(
  records: ConfirmedCaseRecord[],
  engine: ForecastEngine = seasonalNaiveEngine,
  horizonWeeks = 8
): ForecastResult {
  const weekly = aggregateWeeklyCases(records);
  return engine.forecastWeekly(weekly, horizonWeeks);
}
