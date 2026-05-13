import { NextRequest, NextResponse } from "next/server";
import { cache, DEFAULT_TTL_MS } from "@/lib/cache";
import { loadConfirmed, loadSignals, loadCountries, loadEvents, filterByDays } from "@/lib/dataLoaders";
import { CountryQuerySchema } from "@/lib/schemas";
import { computeConfirmedTrend, signalsByWeek } from "@/lib/derive";
import { forecastCountrySeries } from "@/lib/forecast";
import type { CountryDetailResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const daysStr = req.nextUrl.searchParams.get("days") ?? "365";

    const parsed = CountryQuerySchema.safeParse({ code, days: daysStr });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { code: countryCode, days } = parsed.data;

    const cacheKey = `country:${countryCode}:${days}`;
    const data = await cache.getOrSet<CountryDetailResponse>(
      cacheKey,
      async () => {
        const countries = await loadCountries();
        const country = countries.find((c) => c.countryCode === countryCode);
        if (!country) {
          throw new Error(`Country not found: ${countryCode}`);
        }

        const allConfirmed = await loadConfirmed();
        const allSignals = await loadSignals();
        const allEvents = await loadEvents(countryCode);

        const confirmed = filterByDays(
          allConfirmed.filter((r) => r.countryCode === countryCode),
          days
        );
        const signals = filterByDays(
          allSignals.filter((r) => r.countryCode === countryCode),
          days
        );

        const confirmedTrend = computeConfirmedTrend(confirmed);
        const weeklySignals = signalsByWeek(signals);
        const forecast8w = forecastCountrySeries(confirmed, undefined, 8);

        return {
          country,
          confirmed,
          signals,
          events: allEvents,
          derived: {
            confirmedTrend,
            signalsByWeek: weeklySignals,
            forecast8w,
          },
        };
      },
      DEFAULT_TTL_MS
    );

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("Country not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
