import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology – HantaSpread",
  description: "How HantaSpread distinguishes confirmed surveillance data from signals/mentions.",
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-blue-700 font-bold text-lg hover:underline">
          HantaSpread
        </Link>
        <nav className="ml-auto flex gap-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600">← Map</Link>
          <Link href="/about" className="hover:text-blue-600">About</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10" id="main-content">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Methodology & Data Standards</h1>
          <p className="text-slate-500 text-sm">
            Last updated: May 2025 · MVP version with mock data
          </p>
        </div>

        {/* Critical disclaimer */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
          <h2 className="text-lg font-bold text-amber-900 mb-2">⚠ Important Disclaimer</h2>
          <ul className="text-amber-800 text-sm space-y-1.5">
            <li>• <strong>This application is not medical advice.</strong> Do not use it to make health decisions.</li>
            <li>• In the MVP, all data is mock/illustrative and does not reflect real-time surveillance.</li>
            <li>• Signals are mentions, notices, and media reports — they are <strong>not confirmed case counts</strong>.</li>
            <li>• Always consult your national health authority (e.g., Norway: <a href="https://www.fhi.no" className="underline text-amber-700" target="_blank" rel="noopener noreferrer">fhi.no</a>) for authoritative information.</li>
          </ul>
        </div>

        {/* CONFIRMED */}
        <section aria-labelledby="confirmed-heading">
          <div className="flex items-center gap-3 mb-3">
            <h2 id="confirmed-heading" className="text-xl font-bold text-slate-800">
              ✓ CONFIRMED Data
            </h2>
            <span className="text-xs bg-blue-100 text-blue-800 border border-blue-300 rounded-full px-2 py-0.5 font-semibold">
              CONFIRMED
            </span>
          </div>

          <div className="prose prose-sm prose-slate max-w-none space-y-3 text-slate-700">
            <p>
              <strong>What it is:</strong> Officially published case counts from national public health
              agencies and government surveillance systems. Examples include the Robert Koch Institute
              (Germany), Folkhälsomyndigheten (Sweden), THL (Finland), Rospotrebnadzor (Russia),
              and the CDC (United States).
            </p>
            <p>
              <strong>How it's collected:</strong> These figures come from mandatory disease reporting
              systems where clinicians report laboratory-confirmed diagnoses to regional or national
              health authorities, who then publish aggregate statistics.
            </p>
            <p>
              <strong>What it tells you:</strong> The minimum number of laboratory-confirmed hantavirus
              infections in that country during the reporting period. This is the most reliable
              indicator of actual disease activity.
            </p>
            <p>
              <strong>What it does NOT tell you:</strong>
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>The true incidence (many infections are mild and unreported).</li>
              <li>Current risk to any individual.</li>
              <li>Geographic distribution within a country.</li>
              <li>Real-time numbers — there are typically weeks to months of reporting lag.</li>
            </ul>
          </div>
        </section>

        {/* SIGNAL */}
        <section aria-labelledby="signal-heading">
          <div className="flex items-center gap-3 mb-3">
            <h2 id="signal-heading" className="text-xl font-bold text-slate-800">
              ⚡ SIGNAL / MENTION Data
            </h2>
            <span className="text-xs bg-orange-100 text-orange-800 border border-orange-300 rounded-full px-2 py-0.5 font-semibold">
              SIGNAL
            </span>
          </div>

          <div className="prose prose-sm prose-slate max-w-none space-y-3 text-slate-700">
            <p>
              <strong>What it is:</strong> Unverified or preliminary mentions of hantavirus activity.
              This includes agency notices before final confirmation, WHO situation reports, media
              articles, preprint summaries, and early-warning bulletins.
            </p>
            <p>
              <strong>Why we include it:</strong> Signals can appear days to weeks before official
              confirmed counts are published, providing earlier situational awareness. However,
              they come with significant uncertainty.
            </p>
            <p>
              <strong>Limitations of signals:</strong>
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><strong>May be inaccurate</strong> — information may be wrong, misquoted, or preliminary.</li>
              <li><strong>May be duplicated</strong> — multiple sources may describe the same event.</li>
              <li><strong>Do not equal cases</strong> — a media article mentioning hantavirus does not mean confirmed cases occurred.</li>
              <li><strong>Vary in reliability</strong> — an official agency bulletin is more reliable than a media report.</li>
            </ul>
          </div>

          {/* Source tiers */}
          <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-slate-700">Tier</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-700">Source Type</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-700">Examples</th>
                  <th className="text-right px-4 py-2 font-semibold text-slate-700">Heuristic Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-green-50">
                  <td className="px-4 py-2 font-bold text-green-800">A</td>
                  <td className="px-4 py-2 text-slate-700">Official agency</td>
                  <td className="px-4 py-2 text-slate-600">WHO, ECDC, national health institutes</td>
                  <td className="px-4 py-2 text-right text-slate-600">1.0</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-bold text-blue-800">B</td>
                  <td className="px-4 py-2 text-slate-700">Science / summary</td>
                  <td className="px-4 py-2 text-slate-600">Peer-reviewed preprints, ProMED, academic institutions</td>
                  <td className="px-4 py-2 text-right text-slate-600">0.7</td>
                </tr>
                <tr className="bg-yellow-50">
                  <td className="px-4 py-2 font-bold text-yellow-800">C</td>
                  <td className="px-4 py-2 text-slate-700">Credible media</td>
                  <td className="px-4 py-2 text-slate-600">Major newspapers, public broadcasters</td>
                  <td className="px-4 py-2 text-right text-slate-600">0.4</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-bold text-slate-600">D</td>
                  <td className="px-4 py-2 text-slate-700">Other</td>
                  <td className="px-4 py-2 text-slate-600">Social media, anonymous posts, unverified sources</td>
                  <td className="px-4 py-2 text-right text-slate-600">0.2</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Norway lens */}
        <section aria-labelledby="norway-heading">
          <h2 id="norway-heading" className="text-xl font-bold text-slate-800 mb-3">
            🇳🇴 Norway Lens — Heuristic Indicator
          </h2>
          <div className="prose prose-sm prose-slate max-w-none space-y-3 text-slate-700">
            <p>
              The "Norway lens" provides a <strong>heuristic regional context indicator</strong>, not
              a prediction. It is designed to give a simple, transparent summary of regional activity
              near Norway.
            </p>
            <p><strong>How it works:</strong></p>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>Countries within 2,500 km of Norway's geographic centre are identified.</li>
              <li>A proximity weight is calculated: closer countries contribute more (weight = 1 / (1 + distance/500km)).</li>
              <li>A <em>confirmed score</em> is computed from weighted, normalised case counts.</li>
              <li>A <em>signal score</em> is computed from weighted signal counts (using source tier weights).</li>
              <li>The final index = clamp(0–100, confirmed_score×0.6 + signal_score×0.4).</li>
            </ol>
            <p>
              The resulting <strong>risk index</strong> is a rough indicator of regional context,
              not Norway-specific risk. It has no epidemiological validation and <strong>should not
              be interpreted as a probability or prediction</strong>.
            </p>
          </div>
        </section>

        {/* Separation guarantee */}
        <section aria-labelledby="separation-heading">
          <h2 id="separation-heading" className="text-xl font-bold text-slate-800 mb-3">
            Data Separation Guarantee
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 space-y-2">
            <p>HantaSpread enforces strict separation between confirmed and signal data:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The <code className="bg-blue-100 px-1 rounded">confidence</code> field on every record is either <code className="bg-blue-100 px-1 rounded">"confirmed"</code> or <code className="bg-blue-100 px-1 rounded">"signal"</code> — enforced at the schema level (Zod).</li>
              <li>API routes never mix confirmed and signal data in the same aggregate totals.</li>
              <li>Charts keep the two data types on separate, clearly labelled axes/panels.</li>
              <li>Every data element in the UI displays a confidence badge (CONFIRMED or SIGNAL).</li>
            </ul>
          </div>
        </section>

        {/* Future adapters */}
        <section aria-labelledby="adapters-heading">
          <h2 id="adapters-heading" className="text-xl font-bold text-slate-800 mb-3">
            Future Data Adapters
          </h2>
          <div className="prose prose-sm prose-slate max-w-none text-slate-700 space-y-3">
            <p>
              The MVP uses static mock JSON files. Future versions will ingest real data via adapters.
              Each adapter will implement the <code>DataAdapter</code> interface and produce typed,
              validated records. See the README for the adapter interface specification.
            </p>
            <p>Planned sources include:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><strong>ECDC</strong> (European Centre for Disease Prevention and Control) surveillance reports</li>
              <li><strong>WHO EURO</strong> communicable disease bulletins</li>
              <li><strong>Rospotrebnadzor</strong> HFRS statistics for Russia</li>
              <li><strong>National health institute RSS/API feeds</strong> (RKI, THL, Folkhälsomyndigheten)</li>
              <li><strong>ProMED-mail</strong> alert feed (signal tier B)</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="bg-slate-800 text-slate-300 text-xs px-6 py-3 mt-10 text-center">
        Not medical advice. HantaSpread MVP — illustrative data only.
      </footer>
    </div>
  );
}
