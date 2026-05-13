"use client";

import { useEffect, useState } from "react";
import type { NorwayRiskResponse } from "@/types";

interface NorwayRiskCardProps {
  days: number;
}

export default function NorwayRiskCard({ days }: NorwayRiskCardProps) {
  const [data, setData] = useState<NorwayRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/norway-risk?days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d as NorwayRiskResponse);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, [days]);

  if (loading) {
    return (
      <div className="frost-panel absolute left-4 top-16 z-20 w-72 rounded-xl p-3 text-sm text-slate-300">
        Loading Norway risk indicator…
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { riskIndex0to100, window, explanationBullets } = data;
  const level =
    riskIndex0to100 < 20 ? "Low" : riskIndex0to100 < 50 ? "Moderate" : "Elevated";

  const levelColor =
    riskIndex0to100 < 20
      ? "text-emerald-100 bg-emerald-400/12 border-emerald-300/45"
      : riskIndex0to100 < 50
      ? "text-amber-100 bg-amber-400/12 border-amber-300/45"
      : "text-rose-100 bg-rose-400/12 border-rose-300/45";

  const barColor =
    riskIndex0to100 < 20 ? "bg-green-500" : riskIndex0to100 < 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div
      className="frost-panel-strong absolute left-4 top-16 z-20 w-80 rounded-xl p-3"
      role="region"
      aria-label="Norway regional context indicator"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-display flex items-center gap-1 text-xs font-bold text-cyan-100">
            🇳🇴 Norway Regional Context
          </p>
          <p className="text-[10px] italic text-slate-400">
            Heuristic indicator — NOT a prediction
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-cyan-200 hover:underline"
          aria-expanded={expanded}
          aria-controls="norway-risk-details"
        >
          {expanded ? "Less" : "More"}
        </button>
      </div>

      {/* Risk gauge */}
      <div className={`rounded-md border px-3 py-2 mb-2 ${levelColor}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold">{level} regional context</span>
          <span className="text-sm font-bold">{riskIndex0to100}/100</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2" aria-hidden="true">
          <div
            className={`h-2 rounded-full transition-all ${barColor}`}
            style={{ width: `${riskIndex0to100}%` }}
          />
        </div>
      </div>

      {/* Window */}
      <p className="mb-2 text-xs text-slate-300">
        Earliest plausible regional window:{" "}
        <strong>
          {window.minDays}–{window.maxDays} days
        </strong>{" "}
        <span className="text-slate-400">(heuristic context, not Norway-specific)</span>
      </p>

      {/* Expandable details */}
      {expanded && (
        <div id="norway-risk-details">
          <ul className="mb-2 space-y-1 text-xs text-slate-200">
            {explanationBullets.map((b, i) => (
              <li key={i} className="flex gap-1">
                <span className="flex-shrink-0 text-slate-400">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-2">
            <p className="mb-1 text-xs font-semibold text-slate-200">Nearby countries used:</p>
            <ul className="text-xs space-y-0.5">
              {data.inputsUsed.nearbyCountries
                .filter((c) => c.confirmedCount > 0 || c.signalCountWeighted > 0)
                .sort((a, b) => b.confirmedCount - a.confirmedCount)
                .slice(0, 8)
                .map((c) => (
                  <li key={c.code} className="flex items-center justify-between text-slate-300">
                    <span>
                      {c.name}{" "}
                      <span className="text-slate-400">({c.distanceKm} km)</span>
                    </span>
                    <span className="text-slate-400">
                      <span className="text-cyan-200">{c.confirmedCount}c</span>{" "}
                      <span className="text-orange-200">{c.signalCountWeighted}s</span>
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      <p className="mt-2 border-t border-slate-700/60 pt-1.5 text-[10px] text-slate-400">
        Not medical advice. Always consult{" "}
        <a
          href="https://www.fhi.no"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-200 hover:underline"
        >
          fhi.no
        </a>{" "}
        for authoritative Norwegian data.
      </p>
    </div>
  );
}
