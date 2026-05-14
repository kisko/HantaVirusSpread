"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { MapFilter, ConfirmedCaseRecord, SignalRecord, CountryMeta } from "@/types";

interface MapViewProps {
  confirmedRecords: ConfirmedCaseRecord[];
  signalRecords: SignalRecord[];
  countries: CountryMeta[];
  filter: MapFilter;
  onCountryClick: (code: string) => void;
  selectedCountryCode: string | null;
}

// Aggregated marker data per country
interface CountryMarker {
  country: CountryMeta;
  confirmedTotal: number;
  signalCount: number;
}

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

export default function MapView({
  confirmedRecords,
  signalRecords,
  countries,
  filter,
  onCountryClick,
  selectedCountryCode,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [mapReady, setMapReady] = useState(false);

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

  // Add / refresh markers when data or filters change
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled) return;

      const map = mapRef.current as { getCanvas: () => HTMLCanvasElement } | null;
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
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, confirmedRecords, signalRecords, filter.showConfirmed, filter.showSignals, selectedCountryCode]);

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
