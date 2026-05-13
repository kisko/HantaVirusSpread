import type { ConfirmedCaseRecord, SignalRecord, ConfirmedTrend, WeeklySignalBucket } from "@/types";

/** ISO Monday of the week containing `date`. */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Bucket signal records by ISO week (Monday-based).
 * Returns weeks sorted ascending.
 */
export function signalsByWeek(signals: SignalRecord[]): WeeklySignalBucket[] {
  const buckets = new Map<string, number>();

  for (const s of signals) {
    const week = getWeekStart(new Date(s.date));
    buckets.set(week, (buckets.get(week) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, count]) => ({ weekStart, count }));
}

/**
 * Compute a simple linear-regression slope (cases per day) and
 * percentage change from oldest to newest value.
 */
export function computeConfirmedTrend(records: ConfirmedCaseRecord[]): ConfirmedTrend {
  if (records.length === 0) {
    return { slopePerDay: 0, lastValue: 0, changePct: 0 };
  }

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const lastValue = sorted[sorted.length - 1].cases;

  if (sorted.length === 1) {
    return { slopePerDay: 0, lastValue, changePct: 0 };
  }

  // Normalise x to days since first record
  const t0 = new Date(sorted[0].date).getTime();
  const points = sorted.map((r) => ({
    x: (new Date(r.date).getTime() - t0) / 86_400_000,
    y: r.cases,
  }));

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  const slopePerDay = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;

  const firstValue = sorted[0].cases;
  const changePct =
    firstValue === 0
      ? 0
      : ((lastValue - firstValue) / firstValue) * 100;

  return {
    slopePerDay: Math.round(slopePerDay * 100) / 100,
    lastValue,
    changePct: Math.round(changePct * 10) / 10,
  };
}
