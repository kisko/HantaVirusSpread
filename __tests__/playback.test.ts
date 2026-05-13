import { describe, expect, it } from "@jest/globals";
import {
  buildForecastSnapshot,
  buildPlaybackShiftMarkers,
  buildPlaybackSteps,
  getDisplayDataForPlayback,
  HISTORY_PLAYBACK_DAYS,
} from "@/lib/playback";
import type { ConfirmedCaseRecord, CountryMeta, SignalRecord } from "@/types";

const countries: CountryMeta[] = [
  { countryCode: "DE", countryName: "Germany", centroid: { lat: 51.1, lon: 10.4 } },
  { countryCode: "SE", countryName: "Sweden", centroid: { lat: 60.1, lon: 18.6 } },
];

const confirmed: ConfirmedCaseRecord[] = [
  {
    id: "de-1",
    countryCode: "DE",
    countryName: "Germany",
    date: "2025-02-15",
    cases: 8,
    sourceUrl: "https://example.com/de-1",
    sourceOrg: "Example",
    confidence: "confirmed",
  },
  {
    id: "de-2",
    countryCode: "DE",
    countryName: "Germany",
    date: "2025-03-15",
    cases: 16,
    sourceUrl: "https://example.com/de-2",
    sourceOrg: "Example",
    confidence: "confirmed",
  },
  {
    id: "de-3",
    countryCode: "DE",
    countryName: "Germany",
    date: "2025-04-15",
    cases: 30,
    sourceUrl: "https://example.com/de-3",
    sourceOrg: "Example",
    confidence: "confirmed",
  },
];

const signals: SignalRecord[] = [
  {
    id: "sig-1",
    countryCode: "DE",
    countryName: "Germany",
    date: "2025-04-10",
    title: "Alert",
    snippet: "Alert",
    sourceUrl: "https://example.com/sig-1",
    sourceOrg: "Example",
    signalType: "agency_update",
    sourceTier: "A",
    confidence: "signal",
  },
  {
    id: "sig-2",
    countryCode: "SE",
    countryName: "Sweden",
    date: "2025-04-08",
    title: "Notice",
    snippet: "Notice",
    sourceUrl: "https://example.com/sig-2",
    sourceOrg: "Example",
    signalType: "media_mention",
    sourceTier: "C",
    confidence: "signal",
  },
];

describe("buildPlaybackSteps", () => {
  it("creates daily history steps plus monthly forecast steps", () => {
    const steps = buildPlaybackSteps("2025-05-13");
    expect(steps).toHaveLength(HISTORY_PLAYBACK_DAYS + 3);
    expect(steps[0].date).toBe("2025-02-13");
    expect(steps[HISTORY_PLAYBACK_DAYS - 1].mode).toBe("history");
    expect(steps.at(-1)?.date).toBe("2025-08-11");
    expect(steps.at(-1)?.mode).toBe("forecast");
  });
});

describe("buildPlaybackShiftMarkers", () => {
  it("creates markers for notable historical update dates", () => {
    const markers = buildPlaybackShiftMarkers(confirmed, signals, "2025-05-13", 5);

    expect(markers.length).toBeGreaterThan(0);
    expect(markers.some((marker) => marker.date === "2025-04-15")).toBe(true);
    expect(markers.some((marker) => marker.date === "2025-04-10")).toBe(true);
    expect(markers.find((marker) => marker.date === "2025-04-15")?.kind).toBe("confirmed");
  });
});

describe("buildForecastSnapshot", () => {
  it("ranks countries by projected risk", () => {
    const snapshot = buildForecastSnapshot(
      confirmed,
      signals,
      countries,
      "2025-04-15",
      "2025-06-14"
    );

    expect(snapshot.daysAhead).toBe(60);
    expect(snapshot.areaRisks[0].countryCode).toBe("DE");
    expect(snapshot.areaRisks[0].riskScore).toBeGreaterThan(snapshot.areaRisks[1].riskScore);
  });
});

describe("getDisplayDataForPlayback", () => {
  it("returns historical records for past dates", () => {
    const display = getDisplayDataForPlayback(
      confirmed,
      signals,
      countries,
      "2025-04-15",
      "2025-04-15",
      30
    );

    expect(display.forecast).toBeNull();
    expect(display.confirmed).toHaveLength(1);
    expect(display.signals).toHaveLength(2);
  });

  it("adds synthetic forecast records for future dates", () => {
    const display = getDisplayDataForPlayback(
      confirmed,
      signals,
      countries,
      "2025-06-14",
      "2025-04-15",
      30
    );

    expect(display.forecast).not.toBeNull();
    expect(display.confirmed.some((record) => record.id.startsWith("forecast-confirmed-"))).toBe(true);
  });
});