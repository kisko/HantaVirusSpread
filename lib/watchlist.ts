import type {
  ConfirmedCaseRecord,
  CountryMeta,
  SignalRecord,
  WatchAlertLevel,
  WatchlistCountrySummary,
} from "@/types";

const DAY_MS = 86_400_000;
const LEVEL_ORDER: Record<WatchAlertLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
  quiet: 3,
};

function daysDiff(anchorDate: string, valueDate: string): number {
  return Math.floor((Date.parse(`${anchorDate}T00:00:00.000Z`) - Date.parse(`${valueDate}T00:00:00.000Z`)) / DAY_MS);
}

function nextLevel(current: WatchAlertLevel, candidate: WatchAlertLevel): WatchAlertLevel {
  return LEVEL_ORDER[candidate] < LEVEL_ORDER[current] ? candidate : current;
}

function maxIsoDate(current: string | null, candidate: string): string {
  return current == null || candidate > current ? candidate : current;
}

export function buildWatchlistSummaries(
  watchedCountryCodes: string[],
  countries: CountryMeta[],
  confirmed: ConfirmedCaseRecord[],
  signals: SignalRecord[],
  anchorDate: string | null
): WatchlistCountrySummary[] {
  if (!anchorDate) {
    return watchedCountryCodes.map((countryCode) => ({
      countryCode,
      countryName: countries.find((country) => country.countryCode === countryCode)?.countryName ?? countryCode,
      level: "quiet",
      reasons: ["Waiting for data"],
      last7Confirmed: 0,
      prev7Confirmed: 0,
      last7Signals: 0,
      prev7Signals: 0,
      latestActivityDate: null,
    }));
  }

  const countriesByCode = new Map(countries.map((country) => [country.countryCode, country]));

  return watchedCountryCodes
    .map((countryCode) => {
      const countryConfirmed = confirmed.filter((record) => record.countryCode === countryCode);
      const countrySignals = signals.filter((record) => record.countryCode === countryCode);
      let last7Confirmed = 0;
      let prev7Confirmed = 0;
      let last28Confirmed = 0;
      let last7Signals = 0;
      let prev7Signals = 0;
      let last28Signals = 0;
      let latestActivityDate: string | null = null;

      for (const record of countryConfirmed) {
        const diff = daysDiff(anchorDate, record.date);
        if (diff < 0) continue;
        latestActivityDate = maxIsoDate(latestActivityDate, record.date);
        if (diff < 7) last7Confirmed += record.cases;
        if (diff >= 7 && diff < 14) prev7Confirmed += record.cases;
        if (diff < 28) last28Confirmed += record.cases;
      }

      for (const record of countrySignals) {
        const diff = daysDiff(anchorDate, record.date);
        if (diff < 0) continue;
        latestActivityDate = maxIsoDate(latestActivityDate, record.date);
        if (diff < 7) last7Signals += 1;
        if (diff >= 7 && diff < 14) prev7Signals += 1;
        if (diff < 28) last28Signals += 1;
      }

      const reasons: string[] = [];
      let level: WatchAlertLevel = "quiet";

      if (last7Confirmed >= 6 && last7Confirmed >= Math.max(prev7Confirmed + 3, Math.ceil(prev7Confirmed * 1.5))) {
        reasons.push(`Confirmed cases accelerated to ${last7Confirmed} in the last 7 days.`);
        level = nextLevel(level, last7Confirmed >= 12 ? "high" : "medium");
      } else if (prev7Confirmed === 0 && last7Confirmed >= 3) {
        reasons.push(`New confirmed activity appeared this week (${last7Confirmed} cases).`);
        level = nextLevel(level, "medium");
      }

      if (last7Signals >= 3 && last7Signals >= Math.max(prev7Signals + 2, prev7Signals * 2 || 2)) {
        reasons.push(`Signal volume spiked to ${last7Signals} mentions this week.`);
        level = nextLevel(level, last7Signals >= 6 ? "high" : "medium");
      }

      if (last7Signals >= 4 && last28Confirmed === 0) {
        reasons.push("Signals are rising without recent confirmed cases.");
        level = nextLevel(level, "medium");
      }

      if (reasons.length === 0 && (last28Confirmed > 0 || last28Signals > 0)) {
        reasons.push("Recent activity is present but stable.");
        level = "low";
      }

      if (reasons.length === 0) {
        reasons.push("No notable activity in the last 28 days.");
      }

      return {
        countryCode,
        countryName: countriesByCode.get(countryCode)?.countryName ?? countryCode,
        level,
        reasons,
        last7Confirmed,
        prev7Confirmed,
        last7Signals,
        prev7Signals,
        latestActivityDate,
      };
    })
    .sort((a, b) => {
      const levelDiff = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
      if (levelDiff !== 0) return levelDiff;
      const activityA = a.last7Confirmed + a.last7Signals;
      const activityB = b.last7Confirmed + b.last7Signals;
      if (activityA !== activityB) return activityB - activityA;
      return a.countryName.localeCompare(b.countryName);
    });
}