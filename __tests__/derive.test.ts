import { describe, it, expect } from "@jest/globals";
import { signalsByWeek, computeConfirmedTrend } from "@/lib/derive";
import type { SignalRecord, ConfirmedCaseRecord } from "@/types";

const makeSignal = (date: string, id: string): SignalRecord => ({
  id,
  countryCode: "DE",
  countryName: "Germany",
  date,
  title: "Test signal",
  snippet: "Test snippet",
  sourceUrl: "https://example.com",
  sourceOrg: "Test Org",
  signalType: "agency_update",
  sourceTier: "A",
  confidence: "signal",
});

const makeConfirmed = (date: string, cases: number, id: string): ConfirmedCaseRecord => ({
  id,
  countryCode: "DE",
  countryName: "Germany",
  date,
  cases,
  sourceUrl: "https://example.com",
  sourceOrg: "Test Org",
  confidence: "confirmed",
});

describe("signalsByWeek", () => {
  it("returns empty array for no signals", () => {
    expect(signalsByWeek([])).toEqual([]);
  });

  it("groups signals into the correct ISO weeks", () => {
    const signals = [
      makeSignal("2025-04-07", "s1"), // Monday: 2025-04-07
      makeSignal("2025-04-08", "s2"), // Tuesday same week: 2025-04-07
      makeSignal("2025-04-14", "s3"), // Monday next week: 2025-04-14
    ];
    const buckets = signalsByWeek(signals);
    expect(buckets).toHaveLength(2);
    expect(buckets[0].weekStart).toBe("2025-04-07");
    expect(buckets[0].count).toBe(2);
    expect(buckets[1].weekStart).toBe("2025-04-14");
    expect(buckets[1].count).toBe(1);
  });

  it("returns buckets in ascending order", () => {
    const signals = [
      makeSignal("2025-04-21", "s3"),
      makeSignal("2025-04-07", "s1"),
      makeSignal("2025-04-14", "s2"),
    ];
    const buckets = signalsByWeek(signals);
    const dates = buckets.map((b) => b.weekStart);
    expect(dates).toEqual([...dates].sort());
  });
});

describe("computeConfirmedTrend", () => {
  it("returns zeroes for empty input", () => {
    const trend = computeConfirmedTrend([]);
    expect(trend).toEqual({ slopePerDay: 0, lastValue: 0, changePct: 0 });
  });

  it("returns zero slope for single record", () => {
    const trend = computeConfirmedTrend([makeConfirmed("2025-04-01", 10, "c1")]);
    expect(trend.slopePerDay).toBe(0);
    expect(trend.lastValue).toBe(10);
    expect(trend.changePct).toBe(0);
  });

  it("computes positive slope for increasing series", () => {
    const records = [
      makeConfirmed("2025-01-01", 10, "c1"),
      makeConfirmed("2025-02-01", 20, "c2"),
      makeConfirmed("2025-03-01", 30, "c3"),
    ];
    const trend = computeConfirmedTrend(records);
    expect(trend.slopePerDay).toBeGreaterThan(0);
    expect(trend.lastValue).toBe(30);
    expect(trend.changePct).toBeCloseTo(200, 0);
  });

  it("computes negative slope for decreasing series", () => {
    const records = [
      makeConfirmed("2025-01-01", 30, "c1"),
      makeConfirmed("2025-02-01", 20, "c2"),
      makeConfirmed("2025-03-01", 10, "c3"),
    ];
    const trend = computeConfirmedTrend(records);
    expect(trend.slopePerDay).toBeLessThan(0);
    expect(trend.changePct).toBeLessThan(0);
  });
});
