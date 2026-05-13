import { z } from "zod";

// ─── ConfirmedCaseRecord ──────────────────────────────────────────────────────

export const ConfirmedCaseRecordSchema = z.object({
  id: z.string().min(1),
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  cases: z.number().int().nonnegative(),
  deaths: z.number().int().nonnegative().optional(),
  sourceUrl: z.string().url(),
  sourceOrg: z.string().min(1),
  confidence: z.literal("confirmed"),
});

export type ConfirmedCaseRecordValidated = z.infer<typeof ConfirmedCaseRecordSchema>;

// ─── SignalRecord ─────────────────────────────────────────────────────────────

export const SignalRecordSchema = z.object({
  id: z.string().min(1),
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  title: z.string().min(1),
  snippet: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceOrg: z.string().min(1),
  signalType: z.enum(["agency_update", "who_notice", "media_mention", "other"]),
  sourceTier: z.enum(["A", "B", "C", "D"]),
  confidence: z.literal("signal"),
});

export type SignalRecordValidated = z.infer<typeof SignalRecordSchema>;

// ─── CountryMeta ──────────────────────────────────────────────────────────────

export const CountryMetaSchema = z.object({
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  centroid: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
});

export type CountryMetaValidated = z.infer<typeof CountryMetaSchema>;

// ─── Array wrappers ───────────────────────────────────────────────────────────

export const ConfirmedCaseRecordsSchema = z.array(ConfirmedCaseRecordSchema);
export const SignalRecordsSchema = z.array(SignalRecordSchema);
export const CountriesMetaSchema = z.array(CountryMetaSchema);

// ─── API query params ─────────────────────────────────────────────────────────

export const DaysParamSchema = z
  .string()
  .transform(Number)
  .pipe(z.number().int().positive().max(3650))
  .default("30");

export const CountryQuerySchema = z.object({
  code: z.string().length(2),
  days: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 365))
    .pipe(z.number().int().positive().max(3650)),
});

// ─── Derived / response schemas ───────────────────────────────────────────────

export const ConfirmedTrendSchema = z.object({
  slopePerDay: z.number(),
  lastValue: z.number(),
  changePct: z.number(),
});

export const WeeklySignalBucketSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  count: z.number().int().nonnegative(),
});

export const ForecastPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  predictedCases: z.number().int().nonnegative(),
  lower80: z.number().int().nonnegative(),
  upper80: z.number().int().nonnegative(),
});

export const CountryEventRecordSchema = z.object({
  id: z.string().min(1),
  countryCode: z.string().length(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  org: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().optional(),
  notes: z.string().optional(),
  kind: z.enum(["who_context", "national_context"]),
});

export const CountryEventsSchema = z.array(CountryEventRecordSchema);

export const CountryDetailResponseSchema = z.object({
  country: CountryMetaSchema,
  confirmed: ConfirmedCaseRecordsSchema,
  signals: SignalRecordsSchema,
  events: CountryEventsSchema,
  derived: z.object({
    confirmedTrend: ConfirmedTrendSchema,
    signalsByWeek: z.array(WeeklySignalBucketSchema),
    forecast8w: z.object({
      engineId: z.string().min(1),
      mape: z.number().nullable(),
      points: z.array(ForecastPointSchema),
    }),
  }),
});

export const CasesCsvRowSchema = z.object({
  country: z.string().min(1),
  country_code: z.string().length(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cases: z.coerce.number().int().nonnegative(),
});

export const CreateEventSchema = z.object({
  countryCode: z.string().length(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  org: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().optional(),
  notes: z.string().optional(),
  kind: z.enum(["who_context", "national_context"]).default("who_context"),
});

export const NearbyCountryInputSchema = z.object({
  code: z.string().length(2),
  name: z.string().min(1),
  distanceKm: z.number().nonnegative(),
  confirmedCount: z.number().int().nonnegative(),
  signalCountWeighted: z.number().nonnegative(),
});

export const NorwayRiskResponseSchema = z.object({
  riskIndex0to100: z.number().min(0).max(100),
  window: z.object({
    minDays: z.number().int().positive(),
    maxDays: z.number().int().positive(),
  }),
  explanationBullets: z.array(z.string()),
  inputsUsed: z.object({
    nearbyCountries: z.array(NearbyCountryInputSchema),
    parameters: z.record(z.unknown()),
  }),
});
