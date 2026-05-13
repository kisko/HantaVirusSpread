import { computeConfirmedTrend } from "@/lib/derive";
import type {
  ConfirmedCaseRecord,
  CountryMeta,
  ForecastAreaRisk,
  ForecastSnapshot,
  PlaybackShiftMarker,
  PlaybackStep,
  SignalRecord,
} from "@/types";

const DAY_MS = 86_400_000;

export const HISTORY_PLAYBACK_DAYS = 90;
export const FORECAST_STEP_DAYS = [30, 60, 90] as const;

const SIGNAL_TIER_WEIGHTS: Record<SignalRecord["sourceTier"], number> = {
  A: 1,
  B: 0.7,
  C: 0.4,
  D: 0.2,
};

const SEASONALITY_BY_MONTH = [0.82, 0.88, 1.0, 1.12, 1.24, 1.34, 1.28, 1.18, 1.04, 0.94, 0.88, 0.82];

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  return toIsoDate(new Date(parseIsoDate(date).getTime() + days * DAY_MS));
}

function diffDays(from: string, to: string): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / DAY_MS);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatTimelineLabel(date: string): string {
  return parseIsoDate(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function getMonthSeasonality(date: string): number {
  return SEASONALITY_BY_MONTH[parseIsoDate(date).getUTCMonth()] ?? 1;
}

function weightedSignalSum(signals: SignalRecord[]): number {
  return signals.reduce((sum, signal) => sum + (SIGNAL_TIER_WEIGHTS[signal.sourceTier] ?? 0.2), 0);
}

export function getLatestObservedDate(
  confirmed: ConfirmedCaseRecord[],
  signals: SignalRecord[]
): string {
  const latest = [...confirmed.map((record) => record.date), ...signals.map((record) => record.date)]
    .sort()
    .at(-1);

  if (!latest) {
    return toIsoDate(new Date());
  }

  return latest;
}

export function buildPlaybackSteps(latestObservedDate: string): PlaybackStep[] {
  const historyStart = addDays(latestObservedDate, -(HISTORY_PLAYBACK_DAYS - 1));
  const steps: PlaybackStep[] = [];

  for (let dayOffset = 0; dayOffset < HISTORY_PLAYBACK_DAYS; dayOffset += 1) {
    const date = addDays(historyStart, dayOffset);
    steps.push({
      index: steps.length,
      date,
      mode: "history",
      offsetDays: diffDays(latestObservedDate, date),
      label: formatTimelineLabel(date),
    });
  }

  for (const dayOffset of FORECAST_STEP_DAYS) {
    const date = addDays(latestObservedDate, dayOffset);
    steps.push({
      index: steps.length,
      date,
      mode: "forecast",
      offsetDays: dayOffset,
      label: `+${dayOffset}d`,
    });
  }

  return steps;
}

export function buildPlaybackShiftMarkers(
  confirmed: ConfirmedCaseRecord[],
  signals: SignalRecord[],
  latestObservedDate: string,
  maxMarkers = 8
): PlaybackShiftMarker[] {
  const steps = buildPlaybackSteps(latestObservedDate);
  const historySteps = steps.filter((step) => step.mode === "history");
  const historyDates = new Set(historySteps.map((step) => step.date));
  const stepIndexByDate = new Map(historySteps.map((step) => [step.date, step.index]));
  const aggregates = new Map<string, { confirmedCases: number; signalCount: number }>();

  for (const record of confirmed) {
    if (!historyDates.has(record.date)) continue;
    const current = aggregates.get(record.date) ?? { confirmedCases: 0, signalCount: 0 };
    current.confirmedCases += record.cases;
    aggregates.set(record.date, current);
  }

  for (const record of signals) {
    if (!historyDates.has(record.date)) continue;
    const current = aggregates.get(record.date) ?? { confirmedCases: 0, signalCount: 0 };
    current.signalCount += 1;
    aggregates.set(record.date, current);
  }

  return [...aggregates.entries()]
    .map(([date, totals]) => {
      const index = stepIndexByDate.get(date);
      if (index == null) {
        return null;
      }

      const kind =
        totals.confirmedCases > 0 && totals.signalCount > 0
          ? "mixed"
          : totals.confirmedCases > 0
            ? "confirmed"
            : "signal";

      return {
        index,
        date,
        label:
          kind === "mixed"
            ? `${totals.confirmedCases} cases + ${totals.signalCount} signals`
            : kind === "confirmed"
              ? `${totals.confirmedCases} confirmed cases`
              : `${totals.signalCount} signals`,
        kind,
        confirmedCases: totals.confirmedCases,
        signalCount: totals.signalCount,
      } satisfies PlaybackShiftMarker;
    })
    .filter((marker): marker is PlaybackShiftMarker => marker != null)
    .sort((left, right) => {
      const scoreLeft = left.confirmedCases + left.signalCount * 5;
      const scoreRight = right.confirmedCases + right.signalCount * 5;
      if (scoreLeft !== scoreRight) return scoreRight - scoreLeft;
      return right.date.localeCompare(left.date);
    })
    .slice(0, maxMarkers)
    .sort((left, right) => left.index - right.index);
}

function filterRange<T extends { date: string }>(records: T[], startDate: string, endDate: string): T[] {
  return records.filter((record) => record.date >= startDate && record.date <= endDate);
}

function buildProjectedSignalRecords(
  country: CountryMeta,
  targetDate: string,
  count: number
): SignalRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `forecast-signal-${country.countryCode}-${targetDate}-${index + 1}`,
    countryCode: country.countryCode,
    countryName: country.countryName,
    date: targetDate,
    title: `Projected open-data signal pressure for ${country.countryName}`,
    snippet: "Synthetic forward-looking signal built from public seasonal guidance and recent official alerts.",
    sourceUrl: "https://www.cdc.gov/hantavirus/about/index.html",
    sourceOrg: "Open-data forecast model",
    signalType: "other",
    sourceTier: "B",
    confidence: "signal",
  }));
}

export function buildForecastSnapshot(
  confirmed: ConfirmedCaseRecord[],
  signals: SignalRecord[],
  countries: CountryMeta[],
  latestObservedDate: string,
  targetDate: string
): ForecastSnapshot {
  const daysAhead = Math.max(0, diffDays(latestObservedDate, targetDate));
  const recentConfirmedWindowStart = addDays(latestObservedDate, -180);
  const recentSignalWindowStart = addDays(latestObservedDate, -60);

  const areaRisks: ForecastAreaRisk[] = countries.map((country) => {
    const countryConfirmed = filterRange(
      confirmed.filter((record) => record.countryCode === country.countryCode),
      recentConfirmedWindowStart,
      latestObservedDate
    );
    const countrySignals = filterRange(
      signals.filter((record) => record.countryCode === country.countryCode),
      recentSignalWindowStart,
      latestObservedDate
    );

    const trend = computeConfirmedTrend(countryConfirmed);
    const lastObservedCases = countryConfirmed.at(-1)?.cases ?? 0;
    const averageCases =
      countryConfirmed.length === 0
        ? 0
        : countryConfirmed.reduce((sum, record) => sum + record.cases, 0) / countryConfirmed.length;
    const signalWeight = weightedSignalSum(countrySignals);
    const seasonality = getMonthSeasonality(targetDate);
    const trendContribution = Math.max(0, trend.slopePerDay) * daysAhead;
    const signalBaseline = signalWeight * 6;
    const baseline = Math.max(lastObservedCases, averageCases * 0.9, signalBaseline);
    const signalBoost = 1 + Math.min(signalWeight / 6, 0.35);
    const projectedCases = Math.round(
      clamp((baseline + trendContribution) * seasonality * signalBoost, 0, 999)
    );
    const projectedSignals = Math.round(
      clamp(signalWeight * seasonality + Math.max(0, trend.slopePerDay) / 6, 0, 4)
    );
    const rawRisk = projectedCases + projectedSignals * 15 + Math.max(0, trend.changePct) * 0.15;

    return {
      countryCode: country.countryCode,
      countryName: country.countryName,
      projectedCases,
      projectedSignals,
      riskScore: rawRisk,
    };
  });

  const maxRisk = Math.max(1, ...areaRisks.map((risk) => risk.riskScore));
  const normalizedAreaRisks = areaRisks
    .map((risk) => ({
      ...risk,
      riskScore: Math.round((risk.riskScore / maxRisk) * 100),
    }))
    .filter((risk) => risk.projectedCases > 0 || risk.projectedSignals > 0)
    .sort((left, right) => right.riskScore - left.riskScore);

  return {
    targetDate,
    daysAhead,
    summary: [
      "Forward view uses only open data: recent confirmed records, recent public signal reports, and seasonality from public-health guidance.",
      "Seasonality is weighted toward the spring and summer months when rodent exposure risk is typically higher in Europe.",
      "This is a heuristic planning model, not an official outbreak forecast or medical advice.",
    ],
    areaRisks: normalizedAreaRisks,
    sourceNotes: [
      "CDC hantavirus public guidance: https://www.cdc.gov/hantavirus/about/index.html",
      "Recent official/open signals already in the dataset: RKI, THL, Folkhalsomyndigheten, regional public-health bulletins.",
    ],
  };
}

export function getDisplayDataForPlayback(
  confirmed: ConfirmedCaseRecord[],
  signals: SignalRecord[],
  countries: CountryMeta[],
  activeDate: string,
  latestObservedDate: string,
  windowDays: number
): {
  confirmed: ConfirmedCaseRecord[];
  signals: SignalRecord[];
  forecast: ForecastSnapshot | null;
} {
  const windowStart = addDays(activeDate, -(windowDays - 1));

  if (activeDate <= latestObservedDate) {
    return {
      confirmed: filterRange(confirmed, windowStart, activeDate),
      signals: filterRange(signals, windowStart, activeDate),
      forecast: null,
    };
  }

  const forecast = buildForecastSnapshot(confirmed, signals, countries, latestObservedDate, activeDate);
  const projectedConfirmed: ConfirmedCaseRecord[] = forecast.areaRisks
    .filter((risk) => risk.projectedCases > 0)
    .map((risk) => ({
      id: `forecast-confirmed-${risk.countryCode}-${activeDate}`,
      countryCode: risk.countryCode,
      countryName: risk.countryName,
      date: activeDate,
      cases: risk.projectedCases,
      sourceUrl: "https://www.cdc.gov/hantavirus/about/index.html",
      sourceOrg: "Open-data forecast model",
      confidence: "confirmed",
    }));
  const projectedSignals = forecast.areaRisks.flatMap((risk) => {
    const country = countries.find((item) => item.countryCode === risk.countryCode);
    if (!country || risk.projectedSignals === 0) {
      return [];
    }
    return buildProjectedSignalRecords(country, activeDate, risk.projectedSignals);
  });

  return {
    confirmed: [
      ...filterRange(confirmed, addDays(latestObservedDate, -(windowDays - 1)), latestObservedDate),
      ...projectedConfirmed,
    ],
    signals: [
      ...filterRange(signals, addDays(latestObservedDate, -(windowDays - 1)), latestObservedDate),
      ...projectedSignals,
    ],
    forecast,
  };
}