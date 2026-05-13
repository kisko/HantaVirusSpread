import { forecastCountrySeries } from "@/lib/forecast";
import type { ConfirmedCaseRecord } from "@/types";

describe("forecastCountrySeries", () => {
  it("produces deterministic 8-week output", () => {
    const records: ConfirmedCaseRecord[] = [];
    for (let i = 0; i < 20; i += 1) {
      const d = new Date("2025-01-06T00:00:00.000Z");
      d.setUTCDate(d.getUTCDate() + i * 7);
      records.push({
        id: `r-${i}`,
        countryCode: "NO",
        countryName: "Norway",
        date: d.toISOString().slice(0, 10),
        cases: 10 + (i % 4),
        sourceUrl: "https://example.org",
        sourceOrg: "Test",
        confidence: "confirmed",
      });
    }

    const outA = forecastCountrySeries(records, undefined, 8);
    const outB = forecastCountrySeries(records, undefined, 8);

    expect(outA).toEqual(outB);
    expect(outA.points).toHaveLength(8);
  });
});
