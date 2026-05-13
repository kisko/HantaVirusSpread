import { createHash } from "crypto";
import type { ConfirmedCaseRecord, CountryMeta } from "@/types";
import { CasesCsvRowSchema } from "@/lib/schemas";

interface ParsedCsv {
  rows: Record<string, string>[];
  headers: string[];
}

function parseCsv(text: string): ParsedCsv {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row");
  }

  const splitLine = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const values = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    return row;
  });

  return { rows, headers };
}

function normalizeCountryName(countryCode: string, providedName: string, countries: CountryMeta[]): string {
  const fromTable = countries.find((c) => c.countryCode === countryCode)?.countryName;
  return fromTable ?? providedName;
}

export function parseCasesCsvToRecords(input: {
  csvText: string;
  countries: CountryMeta[];
  sourceOrg?: string;
  sourceUrl?: string;
}): ConfirmedCaseRecord[] {
  const { rows } = parseCsv(input.csvText);
  const sourceOrg = input.sourceOrg ?? "ECDC CSV upload";
  const sourceUrl = input.sourceUrl ?? "https://www.ecdc.europa.eu/";

  return rows.map((row, index) => {
    const parsed = CasesCsvRowSchema.safeParse({
      country: row.country,
      country_code: row.country_code?.toUpperCase(),
      date: row.date,
      cases: row.cases,
    });

    if (!parsed.success) {
      throw new Error(`Row ${index + 2} failed validation: ${JSON.stringify(parsed.error.flatten())}`);
    }

    const value = parsed.data;
    const countryCode = value.country_code.toUpperCase();
    const countryName = normalizeCountryName(countryCode, value.country, input.countries);
    const hash = createHash("sha256")
      .update(`${countryCode}|${value.date}|${value.cases}|${countryName}`)
      .digest("hex")
      .slice(0, 16);

    return {
      id: `csv-${countryCode}-${value.date}-${hash}`,
      countryCode,
      countryName,
      date: value.date,
      cases: value.cases,
      sourceUrl,
      sourceOrg,
      confidence: "confirmed",
    };
  });
}
