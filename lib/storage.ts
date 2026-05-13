import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import initSqlJs, { type Database } from "sql.js";
import type {
  ConfirmedCaseRecord,
  CountryEventRecord,
  CountryMeta,
  DashboardOverview,
  SignalRecord,
} from "@/types";
import { ConfirmedCaseRecordsSchema, CountriesMetaSchema, CountryEventsSchema, SignalRecordsSchema } from "@/lib/schemas";

const dataDir = path.join(process.cwd(), "data");
const dbFilePath = path.join(dataDir, "hantascope.sqlite");
const worldCountriesFilePath = path.join(process.cwd(), "node_modules", "world-countries", "countries.json");

const SIGNAL_TIER_MAP: Record<number, SignalRecord["sourceTier"]> = {
  1: "A",
  2: "A",
  3: "B",
  4: "C",
  5: "D",
};

let dbPromise: Promise<Database> | null = null;

function readJson(fileName: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf-8"));
}

function loadSeedCountries(): CountryMeta[] {
  const curated = CountriesMetaSchema.parse(readJson("countries.json"));
  const byCode = new Map(
    curated.map((country) => [country.countryCode.toUpperCase(), { ...country, countryCode: country.countryCode.toUpperCase() }])
  );

  if (fs.existsSync(worldCountriesFilePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(worldCountriesFilePath, "utf-8")) as Array<{
        cca2?: unknown;
        name?: { common?: unknown };
        latlng?: unknown;
      }>;

      for (const country of raw) {
        const code = typeof country.cca2 === "string" ? country.cca2.toUpperCase() : "";
        const name = typeof country.name?.common === "string" ? country.name.common : "";
        const latlng = Array.isArray(country.latlng) ? country.latlng : [];
        const lat = Number(latlng[0]);
        const lon = Number(latlng[1]);

        if (
          code.length !== 2 ||
          name.length === 0 ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lon) ||
          lat < -90 ||
          lat > 90 ||
          lon < -180 ||
          lon > 180
        ) {
          continue;
        }

        if (!byCode.has(code)) {
          byCode.set(code, {
            countryCode: code,
            countryName: name,
            centroid: { lat, lon },
          });
        }
      }
    } catch {
      // Keep curated countries if the package data cannot be read.
    }
  }

  return [...byCode.values()].sort((a, b) => a.countryName.localeCompare(b.countryName));
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeIsoDate(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10);
}

function computeSignalHash(input: {
  countryCode: string;
  date: string;
  title: string;
  sourceUrl: string;
}): string {
  const normalized = `${input.countryCode}|${input.date}|${input.title.trim().toLowerCase()}|${input.sourceUrl.trim().toLowerCase()}`;
  return createHash("sha256").update(normalized).digest("hex");
}

async function getDb(): Promise<Database> {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });

    const db = fs.existsSync(dbFilePath)
      ? new SQL.Database(fs.readFileSync(dbFilePath))
      : new SQL.Database();

    db.exec(`
      CREATE TABLE IF NOT EXISTS countries (
        country_code TEXT PRIMARY KEY,
        country_name TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        country_code TEXT NOT NULL,
        country_name TEXT NOT NULL,
        date TEXT NOT NULL,
        cases INTEGER NOT NULL,
        deaths INTEGER,
        source_url TEXT NOT NULL,
        source_org TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS signals (
        id TEXT PRIMARY KEY,
        signal_hash TEXT NOT NULL UNIQUE,
        country_code TEXT NOT NULL,
        country_name TEXT NOT NULL,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        snippet TEXT NOT NULL,
        source_url TEXT NOT NULL,
        source_org TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        source_tier TEXT NOT NULL,
        source_name TEXT,
        score REAL
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        country_code TEXT NOT NULL,
        date TEXT NOT NULL,
        org TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT,
        notes TEXT,
        kind TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    seedIfEmpty(db);
    persistDb(db);
    return db;
  })();

  return dbPromise;
}

function persistDb(db: Database): void {
  const bytes = db.export();
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbFilePath, Buffer.from(bytes));
}

function seedIfEmpty(db: Database): void {
  const countries = loadSeedCountries();
  const countriesStmt = db.prepare(
    "INSERT OR REPLACE INTO countries (country_code, country_name, lat, lon) VALUES (?, ?, ?, ?)"
  );
  for (const c of countries) {
    countriesStmt.run([c.countryCode, c.countryName, c.centroid.lat, c.centroid.lon]);
  }
  countriesStmt.free();

  const caseCount = Number(db.exec("SELECT COUNT(1) AS n FROM cases;")[0]?.values?.[0]?.[0] ?? 0);
  if (caseCount === 0) {
    const records = ConfirmedCaseRecordsSchema.parse(readJson("confirmed.json"));
    const stmt = db.prepare(
      "INSERT INTO cases (id, country_code, country_name, date, cases, deaths, source_url, source_org) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    for (const r of records) {
      stmt.run([r.id, r.countryCode, r.countryName, r.date, r.cases, r.deaths ?? null, r.sourceUrl, r.sourceOrg]);
    }
    stmt.free();
  }

  const signalCount = Number(db.exec("SELECT COUNT(1) AS n FROM signals;")[0]?.values?.[0]?.[0] ?? 0);
  if (signalCount === 0) {
    const records = SignalRecordsSchema.parse(readJson("signals.json"));
    const stmt = db.prepare(
      "INSERT INTO signals (id, signal_hash, country_code, country_name, date, title, snippet, source_url, source_org, signal_type, source_tier, source_name, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    for (const r of records) {
      stmt.run([
        r.id,
        computeSignalHash({ countryCode: r.countryCode, date: r.date, title: r.title, sourceUrl: r.sourceUrl }),
        r.countryCode,
        r.countryName,
        r.date,
        r.title,
        r.snippet,
        r.sourceUrl,
        r.sourceOrg,
        r.signalType,
        r.sourceTier,
        r.sourceOrg,
        0,
      ]);
    }
    stmt.free();
  }
}

export async function getCountries(): Promise<CountryMeta[]> {
  const db = await getDb();
  const stmt = db.prepare("SELECT country_code, country_name, lat, lon FROM countries ORDER BY country_name ASC");
  const rows: CountryMeta[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    rows.push({
      countryCode: String(row.country_code),
      countryName: String(row.country_name),
      centroid: { lat: Number(row.lat), lon: Number(row.lon) },
    });
  }
  stmt.free();
  return rows;
}

export async function getConfirmedCases(): Promise<ConfirmedCaseRecord[]> {
  const db = await getDb();
  const stmt = db.prepare(
    "SELECT id, country_code, country_name, date, cases, deaths, source_url, source_org FROM cases ORDER BY date ASC"
  );
  const rows: ConfirmedCaseRecord[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    rows.push({
      id: String(row.id),
      countryCode: String(row.country_code),
      countryName: String(row.country_name),
      date: String(row.date),
      cases: Number(row.cases),
      deaths: row.deaths == null ? undefined : Number(row.deaths),
      sourceUrl: String(row.source_url),
      sourceOrg: String(row.source_org),
      confidence: "confirmed",
    });
  }
  stmt.free();
  return rows;
}

export async function insertConfirmedCases(records: ConfirmedCaseRecord[]): Promise<number> {
  const db = await getDb();
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO cases (id, country_code, country_name, date, cases, deaths, source_url, source_org) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const r of records) {
    stmt.run([r.id, r.countryCode, r.countryName, normalizeIsoDate(r.date), r.cases, r.deaths ?? null, r.sourceUrl, r.sourceOrg]);
  }
  stmt.free();
  persistDb(db);
  return records.length;
}

export async function getSignals(): Promise<SignalRecord[]> {
  const db = await getDb();
  const stmt = db.prepare(
    "SELECT id, country_code, country_name, date, title, snippet, source_url, source_org, signal_type, source_tier FROM signals ORDER BY date ASC"
  );
  const rows: SignalRecord[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    rows.push({
      id: String(row.id),
      countryCode: String(row.country_code),
      countryName: String(row.country_name),
      date: String(row.date),
      title: String(row.title),
      snippet: String(row.snippet),
      sourceUrl: String(row.source_url),
      sourceOrg: String(row.source_org),
      signalType: String(row.signal_type) as SignalRecord["signalType"],
      sourceTier: String(row.source_tier) as SignalRecord["sourceTier"],
      confidence: "signal",
    });
  }
  stmt.free();
  return rows;
}

export interface NormalizedSignalInput {
  source_name: string;
  tier: number;
  score: number;
  country_code: string;
  date: string;
  title: string;
  url: string;
  snippet?: string;
}

export async function upsertSignalsFromFeed(items: NormalizedSignalInput[]): Promise<{ inserted: number; skipped: number }> {
  const db = await getDb();
  const countries = await getCountries();
  const nameByCode = new Map(countries.map((c) => [c.countryCode, c.countryName]));
  const seen = new Set<string>();

  const stmt = db.prepare(
    "INSERT OR IGNORE INTO signals (id, signal_hash, country_code, country_name, date, title, snippet, source_url, source_org, signal_type, source_tier, source_name, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  let inserted = 0;
  let skipped = 0;

  for (const item of items) {
    const countryCode = item.country_code.toUpperCase();
    const countryName = nameByCode.get(countryCode) ?? countryCode;
    const date = normalizeIsoDate(item.date);
    const hash = computeSignalHash({ countryCode, date, title: item.title, sourceUrl: item.url });

    if (seen.has(hash)) {
      skipped += 1;
      continue;
    }
    seen.add(hash);

    const tier = Math.min(5, Math.max(1, Math.round(item.tier)));
    const sourceTier = SIGNAL_TIER_MAP[tier] ?? "D";

    const before = Number(db.exec("SELECT changes() AS n;")[0]?.values?.[0]?.[0] ?? 0);
    stmt.run([
      `sig-${hash.slice(0, 20)}`,
      hash,
      countryCode,
      countryName,
      date,
      item.title,
      item.snippet ?? "External signal mention",
      item.url,
      item.source_name,
      "media_mention",
      sourceTier,
      item.source_name,
      item.score,
    ]);
    const after = Number(db.exec("SELECT changes() AS n;")[0]?.values?.[0]?.[0] ?? 0);
    if (after > before) {
      inserted += 1;
    } else {
      skipped += 1;
    }
  }

  stmt.free();
  persistDb(db);
  return { inserted, skipped };
}

export async function getEvents(countryCode?: string): Promise<CountryEventRecord[]> {
  const db = await getDb();
  const query = countryCode
    ? "SELECT id, country_code, date, org, title, url, notes, kind FROM events WHERE country_code = ? ORDER BY date DESC"
    : "SELECT id, country_code, date, org, title, url, notes, kind FROM events ORDER BY date DESC";
  const stmt = db.prepare(query);
  if (countryCode) stmt.bind([countryCode.toUpperCase()]);

  const rows: CountryEventRecord[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    rows.push({
      id: String(row.id),
      countryCode: String(row.country_code),
      date: String(row.date),
      org: String(row.org),
      title: String(row.title),
      url: row.url ? String(row.url) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      kind: String(row.kind) as CountryEventRecord["kind"],
    });
  }
  stmt.free();
  return CountryEventsSchema.parse(rows);
}

export async function insertEvent(input: Omit<CountryEventRecord, "id">): Promise<CountryEventRecord> {
  const db = await getDb();
  const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const date = normalizeIsoDate(input.date);

  const stmt = db.prepare(
    "INSERT INTO events (id, country_code, date, org, title, url, notes, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  stmt.run([
    id,
    input.countryCode.toUpperCase(),
    date,
    input.org,
    input.title,
    input.url ?? null,
    input.notes ?? null,
    input.kind,
    isoToday(),
  ]);
  stmt.free();
  persistDb(db);

  return {
    id,
    countryCode: input.countryCode.toUpperCase(),
    date,
    org: input.org,
    title: input.title,
    url: input.url,
    notes: input.notes,
    kind: input.kind,
  };
}

export async function computeDashboardOverview(): Promise<DashboardOverview> {
  const confirmed = await getConfirmedCases();
  const byDate = new Map<string, number>();
  for (const record of confirmed) {
    byDate.set(record.date, (byDate.get(record.date) ?? 0) + record.cases);
  }

  const orderedDates = [...byDate.keys()].sort();
  const latestDate = orderedDates.at(-1);
  if (!latestDate) {
    return { latestCases: 0, trend4wPct: null, yoyPct: null };
  }

  const latestCases = byDate.get(latestDate) ?? 0;

  const dateObj = new Date(`${latestDate}T00:00:00.000Z`);
  const prev4wStart = new Date(dateObj);
  prev4wStart.setUTCDate(prev4wStart.getUTCDate() - 28);
  const prev8wStart = new Date(dateObj);
  prev8wStart.setUTCDate(prev8wStart.getUTCDate() - 56);

  const inRangeSum = (start: Date, end: Date): number => {
    const startIso = start.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);
    return [...byDate.entries()]
      .filter(([date]) => date >= startIso && date <= endIso)
      .reduce((sum, [, count]) => sum + count, 0);
  };

  const latest4w = inRangeSum(prev4wStart, dateObj);
  const prev4w = inRangeSum(prev8wStart, prev4wStart);
  const trend4wPct = prev4w > 0 ? Number((((latest4w - prev4w) / prev4w) * 100).toFixed(1)) : null;

  const lastYear = new Date(dateObj);
  lastYear.setUTCFullYear(lastYear.getUTCFullYear() - 1);
  const lastYearIso = lastYear.toISOString().slice(0, 10);
  const yoyBase = byDate.get(lastYearIso) ?? 0;
  const yoyPct = yoyBase > 0 ? Number((((latestCases - yoyBase) / yoyBase) * 100).toFixed(1)) : null;

  return { latestCases, trend4wPct, yoyPct };
}
