"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { MapFilter, ConfirmedCaseRecord, SignalRecord, CountryMeta } from "@/types";

interface MapViewProps {
  confirmedRecords: ConfirmedCaseRecord[];
  signalRecords: SignalRecord[];
  countries: CountryMeta[];
  filter: MapFilter;
  playbackFrameKey?: string;
  onPlaybackFrameReady?: (frameKey: string) => void;
  onCountryClick: (code: string) => void;
  selectedCountryCode: string | null;
}

// Aggregated marker data per country
interface CountryMarker {
  country: CountryMeta;
  confirmedTotal: number;
  signalCount: number;
}

interface CountryRiskSummary {
  confirmedTotal: number;
  signalCount: number;
  riskScore: number;
  visibleActivity: number;
}

interface GeoJsonFeature {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry: unknown;
  id?: string | number;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

const COUNTRY_POLYGONS_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
const COUNTRY_SOURCE_ID = "country-polygons";
const COUNTRY_FILL_LAYER_ID = "country-risk-fill";
const COUNTRY_BORDER_LAYER_ID = "country-risk-border";

const MARKER_POSITION_OVERRIDES: Partial<Record<string, { lat: number; lon: number }>> = {
  // Geographic centroids can look wrong for long, irregular countries.
  NO: { lat: 64.2, lon: 11.0 },
};

function getMarkerPosition(country: CountryMeta): { lat: number; lon: number } {
  return MARKER_POSITION_OVERRIDES[country.countryCode] ?? country.centroid;
}

function buildMarkers(
  confirmed: ConfirmedCaseRecord[],
  signals: SignalRecord[],
  countries: CountryMeta[]
): CountryMarker[] {
  const map = new Map<string, CountryMarker>();
  for (const c of countries) {
    map.set(c.countryCode, {
      country: c,
      confirmedTotal: 0,
      signalCount: 0,
    });
  }
  for (const r of confirmed) {
    const m = map.get(r.countryCode);
    if (m) m.confirmedTotal += r.cases;
  }
  for (const s of signals) {
    const m = map.get(s.countryCode);
    if (m) m.signalCount += 1;
  }
  return Array.from(map.values()).filter(
    (m) => m.confirmedTotal > 0 || m.signalCount > 0
  );
}

function normalizeCountryCode(rawCode: string | null | undefined): string | null {
  if (!rawCode) return null;
  const code = rawCode.toUpperCase();
  if (code === "UK") return "GB";
  if (code === "EL") return "GR";
  if (code === "XK") return "XK";
  if (/^[A-Z]{2}$/.test(code)) return code;
  return null;
}

function normalizeCountryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getFeatureCountryCode(
  feature: GeoJsonFeature,
  countryNameToCode: Map<string, string>
): string | null {
  const properties = feature.properties ?? {};
  const candidates = [
    properties.ISO_A2,
    properties.iso_a2,
    properties.ISO2,
    properties.iso2,
    properties["ISO3166-1-Alpha-2"],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const normalized = normalizeCountryCode(candidate);
      if (normalized) return normalized;
    }
  }

  const nameCandidates = [properties.name, properties.NAME, properties.ADMIN];
  for (const candidate of nameCandidates) {
    if (typeof candidate !== "string") continue;
    const code = countryNameToCode.get(normalizeCountryName(candidate));
    if (code) return code;
  }

  return null;
}

function normalizeLogValue(value: number, maxValue: number): number {
  if (value <= 0 || maxValue <= 0) return 0;
  const normalized = Math.log10(value + 1) / Math.log10(maxValue + 1);
  return Math.max(0, Math.min(1, normalized));
}

function buildCountryRiskByCode(
  confirmed: ConfirmedCaseRecord[],
  signals: SignalRecord[],
  countries: CountryMeta[],
  filter: MapFilter
): Map<string, CountryRiskSummary> {
  const map = new Map<string, CountryRiskSummary>();

  for (const country of countries) {
    map.set(country.countryCode, {
      confirmedTotal: 0,
      signalCount: 0,
      riskScore: 0,
      visibleActivity: 0,
    });
  }

  for (const record of confirmed) {
    const existing = map.get(record.countryCode);
    if (!existing) continue;
    existing.confirmedTotal += record.cases;
  }

  for (const record of signals) {
    const existing = map.get(record.countryCode);
    if (!existing) continue;
    existing.signalCount += 1;
  }

  const values = Array.from(map.values());
  const maxConfirmed = values.reduce((max, item) => Math.max(max, item.confirmedTotal), 0);
  const maxSignals = values.reduce((max, item) => Math.max(max, item.signalCount), 0);

  const confirmedWeight = filter.showConfirmed ? 0.7 : 0;
  const signalWeight = filter.showSignals ? 0.3 : 0;
  const weightSum = confirmedWeight + signalWeight;

  for (const value of values) {
    const confirmedScore = confirmedWeight > 0 ? normalizeLogValue(value.confirmedTotal, maxConfirmed) * confirmedWeight : 0;
    const signalScore = signalWeight > 0 ? normalizeLogValue(value.signalCount, maxSignals) * signalWeight : 0;
    const hasVisibleActivity =
      (filter.showConfirmed && value.confirmedTotal > 0) ||
      (filter.showSignals && value.signalCount > 0);
    const baseRiskScore = weightSum > 0 ? (confirmedScore + signalScore) / weightSum : 0;

    value.visibleActivity = hasVisibleActivity ? 1 : 0;
    value.riskScore = hasVisibleActivity ? Math.max(baseRiskScore, 0.18) : 0;
  }

  return map;
}

function buildRiskGeoJson(
  base: GeoJsonFeatureCollection,
  riskByCode: Map<string, CountryRiskSummary>,
  countryNameToCode: Map<string, string>
): GeoJsonFeatureCollection {
  const features = base.features.map((feature) => {
    const countryCode = getFeatureCountryCode(feature, countryNameToCode);
    const risk = countryCode ? riskByCode.get(countryCode) : undefined;

    return {
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        riskScore: risk?.riskScore ?? 0,
        confirmedTotal: risk?.confirmedTotal ?? 0,
        signalCount: risk?.signalCount ?? 0,
        visibleActivity: risk?.visibleActivity ?? 0,
      },
    };
  });

  return { type: "FeatureCollection", features };
}

export default function MapView({
  confirmedRecords,
  signalRecords,
  countries,
  filter,
  playbackFrameKey,
  onPlaybackFrameReady,
  onCountryClick,
  selectedCountryCode,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const countryPolygonsRef = useRef<GeoJsonFeatureCollection | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const countryNameToCode = new Map(
    countries.map((country) => [normalizeCountryName(country.countryName), country.countryCode])
  );

  // Dynamically import MapLibre to avoid SSR issues
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let destroyed = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;

      if (destroyed || !containerRef.current) return;

      const center: [number, number] = filter.norwayLens ? [17.8886, 64.5731] : [10, 20];
      const zoom = filter.norwayLens ? 4 : 1.8;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            "osm-tiles": {
              type: "raster",
              tiles: [
                "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [
            {
              id: "osm-tiles",
              type: "raster",
              source: "osm-tiles",
            },
          ],
        },
        center,
        zoom,
        pitch: 0,
        bearing: 0,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: false,
      });

      // Keep the map strictly top-down: disable rotate gestures and compass rotation.
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();

      map.on("load", () => {
        if (!destroyed) {
          const mapWithLayers = map as {
            addSource: (id: string, source: unknown) => void;
            addLayer: (layer: unknown) => void;
          };

          mapWithLayers.addSource(COUNTRY_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });

          mapWithLayers.addLayer({
            id: COUNTRY_FILL_LAYER_ID,
            type: "fill",
            source: COUNTRY_SOURCE_ID,
            paint: {
              "fill-color": [
                "interpolate",
                ["linear"],
                ["coalesce", ["get", "riskScore"], 0],
                0,
                "#0891b2",
                0.35,
                "#22c55e",
                0.7,
                "#f59e0b",
                1,
                "#ef4444",
              ],
              "fill-opacity": [
                "case",
                [">", ["coalesce", ["get", "visibleActivity"], 0], 0],
                [
                  "interpolate",
                  ["linear"],
                  ["coalesce", ["get", "riskScore"], 0],
                  0,
                  0.18,
                  0.5,
                  0.3,
                  1,
                  0.44,
                ],
                0,
              ],
            },
          });

          mapWithLayers.addLayer({
            id: COUNTRY_BORDER_LAYER_ID,
            type: "line",
            source: COUNTRY_SOURCE_ID,
            paint: {
              "line-color": [
                "interpolate",
                ["linear"],
                ["coalesce", ["get", "riskScore"], 0],
                0,
                "#475569",
                0.3,
                "#06b6d4",
                0.65,
                "#f59e0b",
                1,
                "#f97316",
              ],
              "line-opacity": [
                "case",
                [">", ["coalesce", ["get", "visibleActivity"], 0], 0],
                [
                  "interpolate",
                  ["linear"],
                  ["coalesce", ["get", "riskScore"], 0],
                  0,
                  0.55,
                  1,
                  0.92,
                ],
                0.2,
              ],
              "line-width": [
                "case",
                [">", ["coalesce", ["get", "visibleActivity"], 0], 0],
                [
                  "interpolate",
                  ["linear"],
                  ["coalesce", ["get", "riskScore"], 0],
                  0,
                  0.7,
                  1,
                  1.8,
                ],
                0.25,
              ],
            },
          });

          (mapRef as React.MutableRefObject<unknown>).current = map;
          setMapReady(true);
        }
      });
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        (mapRef as React.MutableRefObject<unknown>).current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to Norway when lens is toggled
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current as {
      flyTo: (opts: { center: [number, number]; zoom: number; pitch: number; bearing: number }) => void;
    };
    if (filter.norwayLens) {
      map.flyTo({ center: [17.8886, 64.5731], zoom: 4.5, pitch: 0, bearing: 0 });
    }
  }, [filter.norwayLens, mapReady]);

  // Update country risk polygons whenever visible data changes.
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    let cancelled = false;

    (async () => {
      const map = mapRef.current as {
        getSource: (id: string) => { setData: (data: unknown) => void } | undefined;
      };

      const source = map.getSource(COUNTRY_SOURCE_ID);
      if (!source) return;

      if (!countryPolygonsRef.current) {
        try {
          const response = await fetch(COUNTRY_POLYGONS_URL);
          if (!response.ok) return;
          const data = (await response.json()) as GeoJsonFeatureCollection;
          if (!cancelled) {
            countryPolygonsRef.current = data;
          }
        } catch {
          return;
        }
      }

      if (cancelled || !countryPolygonsRef.current) return;

      const riskByCode = buildCountryRiskByCode(confirmedRecords, signalRecords, countries, filter);
      const enriched = buildRiskGeoJson(countryPolygonsRef.current, riskByCode, countryNameToCode);
      source.setData(enriched);
    })();

    return () => {
      cancelled = true;
    };
  }, [mapReady, confirmedRecords, signalRecords, countries, filter]);

  // Add / refresh markers when data or filters change
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled) return;

      const map = mapRef.current as {
        getCanvas: () => HTMLCanvasElement;
        once: (event: "idle", listener: () => void) => void;
      } | null;
      if (!map) return;

      // Remove old markers
      for (const m of markersRef.current) {
        (m as { remove: () => void }).remove();
      }
      markersRef.current = [];

      const markers = buildMarkers(confirmedRecords, signalRecords, countries);

      for (const m of markers) {
        const { country, confirmedTotal, signalCount } = m;
        const markerPosition = getMarkerPosition(country);

        if (filter.showConfirmed && confirmedTotal > 0) {
          const el = createMarkerEl({
            type: "confirmed",
            value: confirmedTotal,
            isSelected: selectedCountryCode === country.countryCode,
          });
          el.addEventListener("click", () => onCountryClick(country.countryCode));
          el.setAttribute("aria-label", `${country.countryName}: ${confirmedTotal} confirmed cases`);
          el.setAttribute("role", "button");
          el.setAttribute("tabindex", "0");
          el.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") onCountryClick(country.countryCode);
          });

          if (cancelled || !mapRef.current) return;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([markerPosition.lon, markerPosition.lat]);
          marker.addTo(map as Parameters<typeof marker.addTo>[0]);
          markersRef.current.push(marker);
        }

        if (filter.showSignals && signalCount > 0) {
          const el = createMarkerEl({
            type: "signal",
            value: signalCount,
            isSelected: selectedCountryCode === country.countryCode,
          });
          el.addEventListener("click", () => onCountryClick(country.countryCode));
          el.setAttribute("aria-label", `${country.countryName}: ${signalCount} signals`);
          el.setAttribute("role", "button");
          el.setAttribute("tabindex", "0");
          el.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") onCountryClick(country.countryCode);
          });

          const offsetLon =
            filter.showConfirmed && confirmedTotal > 0
              ? markerPosition.lon + 0.8
              : markerPosition.lon;

          if (cancelled || !mapRef.current) return;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([offsetLon, markerPosition.lat]);
          marker.addTo(map as Parameters<typeof marker.addTo>[0]);
          markersRef.current.push(marker);
        }
      }

      if (playbackFrameKey && onPlaybackFrameReady && !cancelled) {
        map.once("idle", () => {
          if (!cancelled) {
            onPlaybackFrameReady(playbackFrameKey);
          }
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, confirmedRecords, signalRecords, filter.showConfirmed, filter.showSignals, selectedCountryCode, playbackFrameKey, onPlaybackFrameReady]);

  return (
    <div ref={containerRef} className="w-full h-full" aria-label="Hantavirus activity map" role="application" />
  );
}

interface MarkerOptions {
  type: "confirmed" | "signal";
  value: number;
  isSelected: boolean;
}

function createMarkerEl({ type, value, isSelected }: MarkerOptions): HTMLElement {
  const el = document.createElement("div");
  const bubble = document.createElement("div");

  const size = Math.max(28, Math.min(56, 28 + Math.log10(value + 1) * 14));
  const label = value > 999 ? `${(value / 1000).toFixed(1)}k` : String(value);

  el.style.cssText = `
    width: ${size}px; height: ${size}px;
    cursor: pointer;
    user-select: none;
  `;

  if (type === "confirmed") {
    bubble.style.cssText = `
      width: 100%; height: 100%;
      border-radius: 50%;
      background: #2563eb;
      border: ${isSelected ? "3px solid #1e3a8a" : "2px solid #1d4ed8"};
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 11px; font-weight: bold;
      box-shadow: ${isSelected ? "0 0 0 3px rgba(37,99,235,0.4)" : "0 2px 4px rgba(0,0,0,0.3)"};
      transition: transform 0.15s;
      transform-origin: center;
    `;
  } else {
    bubble.style.cssText = `
      width: 100%; height: 100%;
      border-radius: 50%;
      background: rgba(249,115,22,0.2);
      border: ${isSelected ? "3px solid #c2410c" : "2px solid #ea580c"};
      display: flex; align-items: center; justify-content: center;
      color: #c2410c; font-size: 11px; font-weight: bold;
      box-shadow: ${isSelected ? "0 0 0 3px rgba(234,88,12,0.4)" : "0 2px 4px rgba(0,0,0,0.2)"};
      transition: transform 0.15s;
      transform-origin: center;
    `;
  }

  bubble.textContent = label;
  el.appendChild(bubble);

  // Keep hover transforms on a child node so MapLibre can control marker positioning.
  el.addEventListener("mouseenter", () => { bubble.style.transform = "scale(1.15)"; });
  el.addEventListener("mouseleave", () => { bubble.style.transform = "scale(1)"; });

  return el;
}
