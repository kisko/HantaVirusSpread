# HantaSpread

> Hantavirus Activity Tracker — Global/Norway-aware MVP

**Not medical advice.** All data in the MVP is mock/illustrative. Signals are mentions and may be inaccurate, incomplete, or duplicated.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
# → http://localhost:3000

# 3. Run unit tests
npm test

# 4. Build for production
npm run build
npm start
```

### Environment Variables

Create `.env.local` (optional):

```bash
# Optional external mentions feed. If omitted/unavailable, app uses local SQLite-backed sample data.
SIGNALS_URL=https://example.com/signals.json
```

### HantaScope Global Additions

- SQLite-backed storage (country-level only) with separate collections/tables:
  - `cases` (ground truth uploads)
  - `signals` (mentions/signals feed)
  - `events` (WHO/national context items)
- CSV upload endpoint for ECDC-style case ingestion (primary path)
- Manual WHO/national events entry
- 8-week baseline forecast with interval band and MAPE backtest metric
- Offline-safe behavior when external signals feed is unavailable

Sample CSV: `data/sample_cases.csv`

---

## Project Structure

```
/app
  /api
    /confirmed/route.ts      GET /api/confirmed?days=30
    /signals/route.ts        GET /api/signals?days=30
    /country/route.ts        GET /api/country?code=NO&days=365
    /norway-risk/route.ts    GET /api/norway-risk?days=30
  /methodology/page.tsx      Methodology & limitations page
  /about/page.tsx            About page
  /page.tsx                  Home page (map)
  /layout.tsx                Root layout
  /globals.css               Global styles

/components
  MapView.tsx                MapLibre GL map with confirmed + signal markers
  TopBar.tsx                 Header with search, days filter, layer toggles
  DrawerPanel.tsx            Right-side drawer with Overview/Trend/Sources tabs
  TrendCharts.tsx            Recharts: confirmed line + signals bar chart
  SourcesList.tsx            Source records with confidence badges
  Legend.tsx                 Map legend overlay
  NorwayRiskCard.tsx         Norway heuristic indicator card
  ConfidenceBadge.tsx        CONFIRMED / SIGNAL badge + source tier badge
  Footer.tsx                 Global disclaimer footer

/lib
  cache.ts                   In-memory TTL cache
  haversine.ts               Great-circle distance calculation
  dataLoaders.ts             JSON file loaders with Zod validation
  derive.ts                  Weekly buckets + trend slope calculation
  norwayRisk.ts              Norway proximity-weighted heuristic
  schemas.ts                 Zod schemas for all data types

/types
  index.ts                   TypeScript interfaces

/data
  confirmed.json             ConfirmedCaseRecord[] mock data
  signals.json               SignalRecord[] mock data (55 records)
  countries.json             CountryMeta[] with centroids

/__tests__
  haversine.test.ts
  derive.test.ts
```

---

## Updating Mock Data

### confirmed.json
Add objects matching `ConfirmedCaseRecord`:
```json
{
  "id": "conf-xx-YYYY-MM",
  "countryCode": "XX",
  "countryName": "Country Name",
  "date": "YYYY-MM-DD",
  "cases": 42,
  "deaths": 0,
  "sourceUrl": "https://official-source.gov/page",
  "sourceOrg": "Agency Name",
  "confidence": "confirmed"
}
```
The `confidence` field **must** be `"confirmed"`. Zod validation will reject any other value.

### signals.json
Add objects matching `SignalRecord`:
```json
{
  "id": "sig-xxx",
  "countryCode": "XX",
  "countryName": "Country Name",
  "date": "YYYY-MM-DD",
  "title": "Headline",
  "snippet": "Brief description",
  "sourceUrl": "https://source.example/article",
  "sourceOrg": "Source Organization",
  "signalType": "agency_update",
  "sourceTier": "A",
  "confidence": "signal"
}
```
`signalType`: `"agency_update" | "who_notice" | "media_mention" | "other"`
`sourceTier`: `"A" | "B" | "C" | "D"` (A = official agency, B = science, C = media, D = other)
`confidence` **must** be `"signal"`.

---

## Adding a Future Data Adapter

The system is designed so adapters can be plugged in without modifying UI components.

### Adapter Interface

```typescript
// lib/adapters/types.ts
import type { ConfirmedCaseRecord, SignalRecord } from "@/types";

export interface DataAdapter {
  /**
   * Unique adapter identifier (e.g., "ecdc", "rki", "promED")
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Fetch and return confirmed records.
   * Must produce records with confidence: "confirmed".
   * Must validate output with Zod before returning.
   */
  fetchConfirmed(params: { days: number }): Promise<ConfirmedCaseRecord[]>;

  /**
   * Fetch and return signal records.
   * Must produce records with confidence: "signal".
   * Must validate output with Zod before returning.
   */
  fetchSignals(params: { days: number }): Promise<SignalRecord[]>;
}
```

### How to Wire Up

1. Create `lib/adapters/ecdc.ts` implementing `DataAdapter`.
2. In `lib/dataLoaders.ts`, replace the static JSON loaders with adapter calls:
   ```typescript
   import { ecdcAdapter } from "./adapters/ecdc";
   export async function loadConfirmed() {
     return ecdcAdapter.fetchConfirmed({ days: 365 });
   }
   ```
3. The API routes and UI components require **no changes** — they consume typed records.

### Example: ECDC Adapter Skeleton
```typescript
// lib/adapters/ecdc.ts
import { ConfirmedCaseRecordsSchema } from "@/lib/schemas";
import type { DataAdapter } from "./types";

export const ecdcAdapter: DataAdapter = {
  id: "ecdc",
  name: "European Centre for Disease Prevention and Control",

  async fetchConfirmed({ days }) {
    const res = await fetch(`https://ecdc.europa.eu/api/hantavirus?days=${days}`);
    const raw = await res.json();
    // Transform ECDC schema → ConfirmedCaseRecord[]
    const mapped = raw.data.map(transformEcdcRecord);
    // Validate with Zod (throws if invalid)
    return ConfirmedCaseRecordsSchema.parse(mapped);
  },

  async fetchSignals({ days }) {
    return []; // ECDC only provides confirmed data
  },
};
```

---

## Architecture Notes

- **No database** in MVP. `lib/cache.ts` provides an in-memory TTL cache (5-minute default) on the server.
- **Strict separation** is enforced at the type level (`confidence: "confirmed" | "signal"`) and validated by Zod on every data load.
- **MapLibre GL** is loaded client-side only (`dynamic(() => import(...), { ssr: false })`) to avoid SSR issues.
- **Recharts** is also client-only (`"use client"` on TrendCharts).

---

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/confirmed?days=30` | Confirmed case records |
| GET | `/api/signals?days=30` | Signal records |
| GET | `/api/country?code=DE&days=365` | Country detail + derived metrics |
| GET | `/api/norway-risk?days=30` | Norway heuristic risk index |
| GET | `/api/overview` | Dashboard latest cases + 4-week trend + YoY |
| GET | `/api/events?countryCode=NO` | Country events context |
| POST | `/api/events` | Create WHO/national context event |
| POST | `/api/cases/upload` | Upload CSV with columns `country,country_code,date,cases` |

---

## Disclaimers

- **Not medical advice.** Do not use for health decisions.
- Signals are mentions/signals and must not be interpreted as official case counts.
- Do not infer local risk from mentions.
- Official counts come from ECDC and national public-health agencies.
- Country-level display only; no precise case geolocation.
- The Norway risk index is a heuristic indicator, not an epidemiological prediction.

## Basic Tests

```bash
npm test
```

Includes coverage for:
- CSV parser normalization (`__tests__/csv-ingestion.test.ts`)
- Deterministic forecast output (`__tests__/forecast-engine.test.ts`)
- Signals normalization and dedup (`__tests__/signals-ingestion.test.ts`)
