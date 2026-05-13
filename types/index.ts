// ─── Core domain types ────────────────────────────────────────────────────────

export interface ConfirmedCaseRecord {
  id: string;
  countryCode: string; // ISO 3166-1 alpha-2
  countryName: string;
  date: string; // ISO date string YYYY-MM-DD
  cases: number;
  deaths?: number;
  sourceUrl: string;
  sourceOrg: string;
  confidence: "confirmed";
}

export interface SignalRecord {
  id: string;
  countryCode: string;
  countryName: string;
  date: string; // ISO date string YYYY-MM-DD
  title: string;
  snippet: string;
  sourceUrl: string;
  sourceOrg: string;
  signalType: "agency_update" | "who_notice" | "media_mention" | "other";
  /** A = official agency; B = science summary; C = credible media; D = other */
  sourceTier: "A" | "B" | "C" | "D";
  confidence: "signal";
}

export interface CountryMeta {
  countryCode: string;
  countryName: string;
  centroid: { lat: number; lon: number };
}

// ─── Derived / aggregated types ───────────────────────────────────────────────

export interface ConfirmedTrend {
  slopePerDay: number;
  lastValue: number;
  changePct: number;
}

export interface WeeklySignalBucket {
  weekStart: string; // ISO date of Monday
  count: number;
}

export interface ForecastPoint {
  date: string; // ISO date of week start
  predictedCases: number;
  lower80: number;
  upper80: number;
}

export interface CountryEventRecord {
  id: string;
  countryCode: string;
  date: string; // ISO date
  org: string;
  title: string;
  url?: string;
  notes?: string;
  kind: "who_context" | "national_context";
}

export interface DashboardOverview {
  latestCases: number;
  trend4wPct: number | null;
  yoyPct: number | null;
}

export type WatchAlertLevel = "high" | "medium" | "low" | "quiet";

export interface WatchlistCountrySummary {
  countryCode: string;
  countryName: string;
  level: WatchAlertLevel;
  reasons: string[];
  last7Confirmed: number;
  prev7Confirmed: number;
  last7Signals: number;
  prev7Signals: number;
  latestActivityDate: string | null;
}

export interface CountryDetailResponse {
  country: CountryMeta;
  confirmed: ConfirmedCaseRecord[];
  signals: SignalRecord[];
  events: CountryEventRecord[];
  derived: {
    confirmedTrend: ConfirmedTrend;
    signalsByWeek: WeeklySignalBucket[];
    forecast8w: {
      engineId: string;
      mape: number | null;
      points: ForecastPoint[];
    };
  };
}

// ─── Norway risk types ────────────────────────────────────────────────────────

export interface NearbyCountryInput {
  code: string;
  name: string;
  distanceKm: number;
  confirmedCount: number;
  signalCountWeighted: number;
}

export interface NorwayRiskResponse {
  riskIndex0to100: number;
  window: { minDays: number; maxDays: number };
  explanationBullets: string[];
  inputsUsed: {
    nearbyCountries: NearbyCountryInput[];
    parameters: Record<string, unknown>;
  };
}

// ─── UI state types ───────────────────────────────────────────────────────────

export type DaysFilter = 7 | 30 | 365;

export interface MapFilter {
  days: DaysFilter;
  showConfirmed: boolean;
  showSignals: boolean;
  norwayLens: boolean;
}

export type PlaybackMode = "history" | "forecast";

export interface PlaybackStep {
  index: number;
  date: string;
  mode: PlaybackMode;
  offsetDays: number;
  label: string;
}

export interface PlaybackShiftMarker {
  index: number;
  date: string;
  label: string;
  kind: "confirmed" | "signal" | "mixed";
  confirmedCases: number;
  signalCount: number;
}

export interface ForecastAreaRisk {
  countryCode: string;
  countryName: string;
  projectedCases: number;
  projectedSignals: number;
  riskScore: number;
}

export interface ForecastSnapshot {
  targetDate: string;
  daysAhead: number;
  summary: string[];
  areaRisks: ForecastAreaRisk[];
  sourceNotes: string[];
}

export type DrawerTab = "overview" | "trend" | "signals" | "events";

export interface DrawerState {
  open: boolean;
  countryCode: string | null;
  activeTab: DrawerTab;
}
