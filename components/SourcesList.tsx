import type { ConfirmedCaseRecord, SignalRecord } from "@/types";
import { ConfidenceBadge, TierBadge } from "./ConfidenceBadge";

interface SourcesListProps {
  confirmed: ConfirmedCaseRecord[];
  signals: SignalRecord[];
}

export default function SourcesList({ confirmed, signals }: SourcesListProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Confirmed sources */}
      <section aria-labelledby="confirmed-sources-heading">
        <h3 id="confirmed-sources-heading" className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-cyan-100">
          Confirmed Records
          <ConfidenceBadge type="confirmed" size="xs" />
        </h3>
        {confirmed.length === 0 ? (
          <p className="text-sm italic text-slate-400">No confirmed records in this window.</p>
        ) : (
          <ul className="space-y-2">
            {[...confirmed]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-cyan-400/28 bg-cyan-400/10 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-medium text-cyan-100">
                        {r.cases} cases
                        {r.deaths != null && r.deaths > 0 ? `, ${r.deaths} deaths` : ""}
                      </span>
                      <span className="ml-2 text-slate-300">{r.date}</span>
                    </div>
                    <ConfidenceBadge type="confirmed" size="xs" />
                  </div>
                  <p className="mt-1 text-slate-200">{r.sourceOrg}</p>
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block break-all text-xs text-cyan-200 hover:underline"
                    aria-label={`Source: ${r.sourceOrg}, opens in new tab`}
                  >
                    {r.sourceUrl}
                  </a>
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* Signal sources */}
      <section aria-labelledby="signal-sources-heading">
        <h3 id="signal-sources-heading" className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-orange-100">
          Signals / Mentions
          <ConfidenceBadge type="signal" size="xs" />
        </h3>

        <p className="mb-2 rounded border border-orange-400/40 bg-orange-400/12 p-2 text-xs text-orange-100">
          ⚠ These are mentions, notices, or media reports. They are <strong>NOT</strong> confirmed
          case counts and may be inaccurate, preliminary, or duplicated.
        </p>

        {signals.length === 0 ? (
          <p className="text-sm italic text-slate-400">No signals in this window.</p>
        ) : (
          <ul className="space-y-2">
            {[...signals]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((s) => (
                <li
                  key={s.id}
                  className="rounded-md border border-orange-400/30 bg-orange-400/10 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium leading-snug text-slate-100">{s.title}</p>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <ConfidenceBadge type="signal" size="xs" />
                      <TierBadge tier={s.sourceTier} />
                    </div>
                  </div>
                  <p className="mb-1 text-xs leading-relaxed text-slate-200">{s.snippet}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-300">{s.sourceOrg}</span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs text-slate-300">{s.date}</span>
                  </div>
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block break-all text-xs text-orange-200 hover:underline"
                    aria-label={`Source: ${s.sourceOrg}, opens in new tab`}
                  >
                    {s.sourceUrl}
                  </a>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
