import type { ConfirmedCaseRecord, SignalRecord, CountryMeta, NorwayRiskResponse, NearbyCountryInput } from "@/types";
import { haversineKm } from "./haversine";

const NORWAY_LAT = 64.5731;
const NORWAY_LON = 17.8886;
const NEARBY_KM = 2500;
const PROXIMITY_SCALE = 500; // km scale for proximity boost

const TIER_WEIGHTS: Record<string, number> = {
  A: 1.0,
  B: 0.7,
  C: 0.4,
  D: 0.2,
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function proximityWeight(distanceKm: number): number {
  return 1 / (1 + distanceKm / PROXIMITY_SCALE);
}

export function computeNorwayRisk(
  confirmed: ConfirmedCaseRecord[],
  signals: SignalRecord[],
  countries: CountryMeta[]
): NorwayRiskResponse {
  const countryMap = new Map(countries.map((c) => [c.countryCode, c]));

  // Filter out Norway itself
  const nearbyCountries: NearbyCountryInput[] = [];

  for (const country of countries) {
    if (country.countryCode === "NO") continue;

    const dist = haversineKm(
      NORWAY_LAT,
      NORWAY_LON,
      country.centroid.lat,
      country.centroid.lon
    );

    if (dist > NEARBY_KM) continue;

    const confirmedCount = confirmed
      .filter((r) => r.countryCode === country.countryCode)
      .reduce((s, r) => s + r.cases, 0);

    const signalCountWeighted = signals
      .filter((r) => r.countryCode === country.countryCode)
      .reduce((s, r) => s + (TIER_WEIGHTS[r.sourceTier] ?? 0.2), 0);

    nearbyCountries.push({
      code: country.countryCode,
      name: country.countryName,
      distanceKm: Math.round(dist),
      confirmedCount,
      signalCountWeighted: Math.round(signalCountWeighted * 10) / 10,
    });
  }

  // Normalise scores
  const maxConfirmed = Math.max(1, ...nearbyCountries.map((c) => c.confirmedCount));
  const maxSignal = Math.max(1, ...nearbyCountries.map((c) => c.signalCountWeighted));

  let confirmedScore = 0;
  let signalScore = 0;

  for (const nc of nearbyCountries) {
    const pw = proximityWeight(nc.distanceKm);
    confirmedScore += (nc.confirmedCount / maxConfirmed) * pw;
    signalScore += (nc.signalCountWeighted / maxSignal) * pw;
  }

  // Scale to 0-100
  const rawIndex = (confirmedScore * 0.6 + signalScore * 0.4) * 100;
  const riskIndex0to100 = Math.round(clamp(rawIndex, 0, 100));

  const window =
    riskIndex0to100 < 20
      ? { minDays: 180, maxDays: 720 }
      : riskIndex0to100 < 50
      ? { minDays: 90, maxDays: 365 }
      : { minDays: 30, maxDays: 180 };

  const topCountries = nearbyCountries
    .filter((c) => c.confirmedCount > 0 || c.signalCountWeighted > 0)
    .sort((a, b) => b.confirmedCount - a.confirmedCount)
    .slice(0, 5);

  const explanationBullets: string[] = [
    `This is a heuristic indicator — NOT a prediction or medical advice.`,
    `Risk index ${riskIndex0to100}/100 is derived from confirmed case counts and signal mentions in ${nearbyCountries.length} countries within ${NEARBY_KM} km of Norway's geographic centre.`,
    `Closer countries contribute more weight (proximity boost). Germany, Sweden, Finland, and Poland weigh most heavily.`,
    topCountries.length > 0
      ? `Top nearby contributors: ${topCountries.map((c) => `${c.name} (${c.confirmedCount} confirmed, ${c.signalCountWeighted} weighted signals)`).join("; ")}.`
      : `No nearby countries with recent activity found in the selected time window.`,
    `Earliest plausible window (heuristic): ${window.minDays}–${window.maxDays} days — this represents regional context, not a Norwegian outbreak timeline.`,
    `Norway has its own active surveillance. Always consult FHI (fhi.no) for authoritative Norwegian data.`,
  ];

  return {
    riskIndex0to100,
    window,
    explanationBullets,
    inputsUsed: {
      nearbyCountries,
      parameters: {
        nearbyThresholdKm: NEARBY_KM,
        proximityScaleKm: PROXIMITY_SCALE,
        confirmedWeight: 0.6,
        signalWeight: 0.4,
        tierWeights: TIER_WEIGHTS,
      },
    },
  };
}
