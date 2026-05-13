import type { ConfirmedCaseRecord, CountryEventRecord, CountryMeta, SignalRecord } from "@/types";
import { getConfirmedCases, getCountries, getEvents, getSignals, upsertSignalsFromFeed } from "@/lib/storage";
import { fetchSignalsFeed, withSignalsSyncCache } from "@/lib/ingestion/signals";

/** Return records within the last `days` days from today. */
export function filterByDays<T extends { date: string }>(records: T[], days: number): T[] {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return records.filter((r) => r.date >= cutoffStr);
}

export async function loadConfirmed(): Promise<ConfirmedCaseRecord[]> {
  return getConfirmedCases();
}

export async function loadCountries(): Promise<CountryMeta[]> {
  return getCountries();
}

export async function loadEvents(countryCode?: string): Promise<CountryEventRecord[]> {
  return getEvents(countryCode);
}

async function maybeSyncSignalsFromUrl(): Promise<void> {
  const url = process.env.SIGNALS_URL;
  if (!url) return;

  await withSignalsSyncCache(async () => {
    try {
      const normalized = await fetchSignalsFeed(url);
      await upsertSignalsFromFeed(normalized);
    } catch {
      // Fail open to preserve offline/local behavior.
    }
    return true;
  });
}

export async function loadSignals(): Promise<SignalRecord[]> {
  await maybeSyncSignalsFromUrl();
  return getSignals();
}
