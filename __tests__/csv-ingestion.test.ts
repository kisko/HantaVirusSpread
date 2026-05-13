import { parseCasesCsvToRecords } from "@/lib/ingestion/casesCsv";

describe("parseCasesCsvToRecords", () => {
  it("normalizes country code and creates confirmed records", () => {
    const csv = [
      "country,country_code,date,cases",
      "Norway,no,2026-03-01,12",
      "Sweden,se,2026-03-08,9",
    ].join("\n");

    const records = parseCasesCsvToRecords({
      csvText: csv,
      countries: [
        { countryCode: "NO", countryName: "Norway", centroid: { lat: 0, lon: 0 } },
        { countryCode: "SE", countryName: "Sweden", centroid: { lat: 0, lon: 0 } },
      ],
    });

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      countryCode: "NO",
      countryName: "Norway",
      date: "2026-03-01",
      cases: 12,
      confidence: "confirmed",
    });
  });
});
