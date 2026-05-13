import { dedupeNormalizedSignals, normalizeSignalFeed } from "@/lib/ingestion/signals";

describe("signals normalization and dedup", () => {
  it("normalizes valid feed records", () => {
    const raw = [
      {
        source_name: "WHO",
        tier: 2,
        score: 0.8,
        country_code: "no",
        date: "2026-05-01",
        title: "Hantavirus bulletin",
        url: "https://example.org/a",
      },
    ];

    const out = normalizeSignalFeed(raw);
    expect(out[0].country_code).toBe("NO");
    expect(out[0].tier).toBe(2);
  });

  it("deduplicates records by stable key", () => {
    const input = normalizeSignalFeed([
      {
        source_name: "WHO",
        tier: 2,
        score: 0.8,
        country_code: "NO",
        date: "2026-05-01",
        title: "Hantavirus bulletin",
        url: "https://example.org/a",
      },
      {
        source_name: "WHO",
        tier: 2,
        score: 0.8,
        country_code: "NO",
        date: "2026-05-01",
        title: "Hantavirus bulletin",
        url: "https://example.org/a",
      },
    ]);

    const out = dedupeNormalizedSignals(input);
    expect(out).toHaveLength(1);
  });
});
