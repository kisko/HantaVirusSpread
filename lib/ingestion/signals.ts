import { z } from "zod";
import { cache } from "@/lib/cache";
import type { NormalizedSignalInput } from "@/lib/storage";

const SIGNALS_SYNC_TTL_MS = 15 * 60 * 1000;

const RawSignalSchema = z.object({
  source_name: z.string().min(1),
  tier: z.coerce.number().min(1).max(5),
  score: z.coerce.number().min(0),
  country_code: z.string().length(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1),
  url: z.string().url(),
  snippet: z.string().optional(),
});

const RawSignalsSchema = z.array(RawSignalSchema);

export function normalizeSignalFeed(raw: unknown): NormalizedSignalInput[] {
  const parsed = RawSignalsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`signals feed validation failed: ${JSON.stringify(parsed.error.flatten())}`);
  }

  return parsed.data.map((row) => ({
    source_name: row.source_name,
    tier: row.tier,
    score: row.score,
    country_code: row.country_code.toUpperCase(),
    date: row.date,
    title: row.title,
    url: row.url,
    snippet: row.snippet,
  }));
}

export function dedupeNormalizedSignals(items: NormalizedSignalInput[]): NormalizedSignalInput[] {
  const seen = new Set<string>();
  const output: NormalizedSignalInput[] = [];

  for (const item of items) {
    const key = `${item.country_code}|${item.date}|${item.title.trim().toLowerCase()}|${item.url.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

export async function fetchSignalsFeed(url: string): Promise<NormalizedSignalInput[]> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Signals feed request failed: ${res.status}`);
  }

  const raw = (await res.json()) as unknown;
  return normalizeSignalFeed(raw);
}

export async function withSignalsSyncCache<T>(factory: () => Promise<T>): Promise<T> {
  return cache.getOrSet("signals:sync:last", factory, SIGNALS_SYNC_TTL_MS);
}

export { SIGNALS_SYNC_TTL_MS };
